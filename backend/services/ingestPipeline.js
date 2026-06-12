const { validateEvents, removeDuplicates } = require('../utils/eventValidator');
const { normalizeEventForValidation } = require('../utils/categoryNormalize');
const { needsGeocoding, applyJitteredDefaults } = require('../utils/eventNormalize');
const { geocodeEventsBatch } = require('../utils/geocodeEvents');
const { isFuzzyDuplicate } = require('../utils/dedupe');
const vectorService = require('./vectorService');
const dbService = require('./dbService');
const nerService = require('./nerService');
const jobQueue = require('./jobQueue');
const cache = require('../cache');
const metrics = require('./metrics');
const { computeDataQuality } = require('./dataQualityService');
const { logger } = require('../logger');
const {
  GEOCODE_CHUNK_SIZE,
  SAVE_EVENTS_CHUNK_SIZE,
} = require('../configs/constants');

const skipEventValidation = process.env.SKIP_EVENT_VALIDATION === 'true';
const skipGeocode = process.env.SKIP_GEOCODE === 'true';
const AI_BATCH_SIZE = parseInt(process.env.AI_BATCH_SIZE, 10) || 5;
const semanticEnabled = () => process.env.SEMANTIC_SEARCH_ENABLED !== 'false';
const useAsyncGeocode = () =>
  process.env.ASYNC_GEOCODE === 'true' || jobQueue.useBullMQ();

function recordFailure(pipelineErrors, byReason, entry) {
  pipelineErrors.push(entry);
  const reason = entry.error || entry.skipped || 'unknown';
  if (!byReason[reason]) byReason[reason] = 0;
  byReason[reason] += 1;
  metrics.recordIngestFailed(reason);
}

async function dedupeAgainstExisting(validatedEvents) {
  const dates = [
    ...new Set(
      validatedEvents
        .map((e) => e.date)
        .filter((d) => d && d !== 'TBD' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    ),
  ];
  if (dates.length === 0) return validatedEvents;

  const existing = await dbService.getEventsByDates(dates);
  if (existing.length === 0) return validatedEvents;

  return validatedEvents.filter((event) => {
    if (isFuzzyDuplicate(event, existing)) {
      logger.info('scraper_duplicate_dropped_db', { name: event.name, date: event.date });
      return false;
    }
    return true;
  });
}

async function refineSingleEvent(event) {
  if (process.env.USE_LOCAL_AI === 'false') return event;

  const refinedEvent = { ...event };
  if (refinedEvent.date === 'TBD' || refinedEvent.address === 'New York, NY') {
    try {
      const text = `${refinedEvent.name} ${refinedEvent.description}`;
      const extracted = await nerService.extract(text);
      if (extracted) {
        if (refinedEvent.date === 'TBD') refinedEvent.date = extracted.date;
        if (refinedEvent.address === 'New York, NY') refinedEvent.address = extracted.address;
        if (refinedEvent.startTime === 'TBD') refinedEvent.startTime = extracted.startTime;
      }
    } catch (err) {
      logger.warn('event_refine_failed', { name: refinedEvent.name, message: err.message });
    }
  }
  return refinedEvent;
}

/**
 * Validate and normalize one raw event (no DB writes).
 */
async function validateOnly(rawEvent) {
  try {
    const refined = await refineSingleEvent(rawEvent);
    const normalized = normalizeEventForValidation(refined);
    const toValidate = skipEventValidation ? [refined] : [normalized];
    const validated = skipEventValidation ? toValidate : validateEvents(toValidate);
    if (!validated.length) {
      return { ok: false, skipped: 'validation_failed', eventTitle: rawEvent?.name };
    }

    let event = validated[0];
    const batchDeduped = removeDuplicates([event]);
    if (!batchDeduped.length) {
      return { ok: false, skipped: 'in_batch_duplicate', eventTitle: rawEvent?.name };
    }
    event = batchDeduped[0];
    return { ok: true, event };
  } catch (err) {
    return { ok: false, error: err.message, eventTitle: rawEvent?.name || 'unknown' };
  }
}

async function geocodeAndFinalizeEvent(event) {
  let working = { ...event };

  if (skipGeocode) {
    return applyJitteredDefaults(working);
  }

  const needsAsync = useAsyncGeocode() && needsGeocoding(working);
  if (needsAsync) {
    working.locationQuality = 'pending';
    return working;
  }

  if (needsGeocoding(working)) {
    const [geocoded] = await geocodeEventsBatch([working]);
    working = geocoded || working;
  }

  if (needsGeocoding(working)) {
    working = applyJitteredDefaults(working);
  }

  return working;
}

async function saveEventsChunkWithFallback(chunk) {
  if (!chunk.length) return;
  try {
    await dbService.saveEvents(chunk);
    metrics.recordIngestSaved(chunk.length);
  } catch (err) {
    logger.warn('ingest_chunk_save_failed', { message: err.message, count: chunk.length });
    for (const event of chunk) {
      try {
        await dbService.saveEvents([event]);
        metrics.recordIngestSaved(1);
      } catch (singleErr) {
        throw singleErr;
      }
    }
  }
}

async function finalizeSavedEvent(event) {
  if (typeof dbService.updateStagingState === 'function') {
    await dbService.updateStagingState(event.id, 'geocoded');
    await dbService.deleteStagingEvent(event.id);
  }
  if (!skipGeocode && useAsyncGeocode() && needsGeocoding(event)) {
    await jobQueue.enqueueBackgroundJob('geocode_batch', { eventIds: [event.id] });
  }
}

/**
 * Resume a staged row without re-staging.
 */
async function processStagedEvent(row) {
  let event;
  try {
    event = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  } catch (err) {
    if (typeof dbService.updateStagingState === 'function') {
      await dbService.updateStagingState(row.id, 'failed', err.message);
    }
    return { ok: false, error: `invalid staging payload: ${err.message}`, eventTitle: row.id };
  }

  try {
    if (typeof dbService.updateStagingState === 'function') {
      await dbService.updateStagingState(event.id, 'geocoding');
    }

    const existing = await dedupeAgainstExisting([event]);
    if (!existing.length) {
      await dbService.deleteStagingEvent(event.id);
      return { ok: false, skipped: 'db_duplicate', eventTitle: event.name };
    }

    const geocoded = await geocodeAndFinalizeEvent(event);
    await dbService.saveEvents([geocoded]);
    metrics.recordIngestSaved(1);
    await finalizeSavedEvent(geocoded);
    return { ok: true, event: geocoded };
  } catch (err) {
    if (typeof dbService.updateStagingState === 'function') {
      await dbService.updateStagingState(event.id, 'validated', err.message);
    }
    return { ok: false, error: err.message, eventTitle: event?.name || row.id };
  }
}

async function resumeStagedEvents() {
  if (typeof dbService.getStagingEventsByState !== 'function') {
    return { saved: [], errors: [] };
  }

  const staged = await dbService.getStagingEventsByState('validated');
  if (!staged.length) return { saved: [], errors: [] };

  logger.info('ingest_resume_staging', { count: staged.length });
  const saved = [];
  const errors = [];

  for (const row of staged) {
    const result = await processStagedEvent(row);
    if (result.ok && result.event) {
      saved.push(result.event);
    } else {
      errors.push({
        eventTitle: result.eventTitle,
        error: result.error || result.skipped,
      });
    }
  }

  return { saved, errors };
}

async function geocodeAndPersistBatch(events, pipelineErrors, byReason) {
  const saved = [];

  for (let i = 0; i < events.length; i += GEOCODE_CHUNK_SIZE) {
    const chunk = events.slice(i, i + GEOCODE_CHUNK_SIZE);
    const geocodedChunk = [];

    for (const event of chunk) {
      try {
        if (typeof dbService.updateStagingState === 'function') {
          await dbService.updateStagingState(event.id, 'geocoding');
        }
        const geocoded = await geocodeAndFinalizeEvent(event);
        geocodedChunk.push(geocoded);
      } catch (err) {
        if (typeof dbService.updateStagingState === 'function') {
          await dbService.updateStagingState(event.id, 'validated', err.message);
        }
        recordFailure(pipelineErrors, byReason, {
          eventTitle: event.name,
          error: err.message || 'geocode_failed',
        });
      }
    }

    for (let j = 0; j < geocodedChunk.length; j += SAVE_EVENTS_CHUNK_SIZE) {
      const saveChunk = geocodedChunk.slice(j, j + SAVE_EVENTS_CHUNK_SIZE);
      try {
        await saveEventsChunkWithFallback(saveChunk);
        for (const event of saveChunk) {
          await finalizeSavedEvent(event);
          saved.push(event);
        }
      } catch (err) {
        for (const event of saveChunk) {
          if (typeof dbService.updateStagingState === 'function') {
            await dbService.updateStagingState(event.id, 'failed', err.message);
          }
          recordFailure(pipelineErrors, byReason, {
            eventTitle: event.name,
            error: err.message || 'persist_failed',
          });
        }
      }
    }
  }

  return saved;
}

/**
 * Run full ingest save pipeline with batched DB operations and per-event fault isolation.
 * @param {object[]} events
 * @param {object} [metricsContext]
 * @returns {Promise<object[]>}
 */
async function processAndSaveEvents(events, metricsContext = {}) {
  const inputCount = events.length;
  const pipelineErrors = [];
  const byReason = {};
  let savedEvents = [];

  const resumed = await resumeStagedEvents();
  if (resumed.saved?.length) savedEvents.push(...resumed.saved);
  for (const err of resumed.errors || []) {
    recordFailure(pipelineErrors, byReason, err);
  }

  const validatedEvents = [];
  for (const rawEvent of events) {
    const result = await validateOnly(rawEvent);
    if (result.ok && result.event) {
      validatedEvents.push(result.event);
    } else {
      recordFailure(pipelineErrors, byReason, {
        eventTitle: result.eventTitle || rawEvent?.name,
        error: result.error || result.skipped || 'unknown',
      });
      logger.warn('ingest_event_failed', {
        eventTitle: result.eventTitle,
        error: result.error || result.skipped,
      });
    }
  }

  if (validatedEvents.length > 0) {
    const uniqueValidated = removeDuplicates(validatedEvents);
    const afterDbDedupe = await dedupeAgainstExisting(uniqueValidated);

    const keptIds = new Set(afterDbDedupe.map((e) => e.id));
    for (const event of uniqueValidated) {
      if (!keptIds.has(event.id)) {
        recordFailure(pipelineErrors, byReason, {
          eventTitle: event.name,
          skipped: 'db_duplicate',
        });
      }
    }

    if (afterDbDedupe.length > 0 && typeof dbService.saveStagingEvents === 'function') {
      await dbService.saveStagingEvents(afterDbDedupe, 'validated');
    }

    const batchSaved = await geocodeAndPersistBatch(
      afterDbDedupe,
      pipelineErrors,
      byReason
    );
    savedEvents.push(...batchSaved);
  }

  savedEvents = removeDuplicates(savedEvents);

  const geocodedCount = savedEvents.filter(
    (e) => e.locationQuality && e.locationQuality !== 'default' && e.locationQuality !== 'pending'
  ).length;

  const deadLetter = {
    failed: pipelineErrors.length,
    errors: pipelineErrors.slice(0, 50),
    stagingFailures: resumed.errors?.length || 0,
    byReason,
  };

  const funnelMetrics = {
    at: new Date().toISOString(),
    sourceCounts: metricsContext.sourceCounts || null,
    scraperHealth: metricsContext.scraperHealth || null,
    deadLetter,
    funnel: {
      input: inputCount,
      validated: validatedEvents.length,
      saved: savedEvents.length,
      failed: pipelineErrors.length,
      geocoded: geocodedCount,
      resumedFromStaging: resumed.saved?.length || 0,
    },
  };

  logger.info('ingest_funnel', {
    ...funnelMetrics,
    requestId: metricsContext.requestId || null,
  });
  logger.info('ingest_complete', {
    requestId: metricsContext.requestId || null,
    sources: metricsContext.sourceCounts
      ? Object.keys(metricsContext.sourceCounts).length
      : 0,
    saved: savedEvents.length,
    failed: pipelineErrors.length,
    duration_ms: metricsContext.duration_ms,
  });

  await dbService.setLastIngestMetrics(funnelMetrics);

  try {
    const quality = await computeDataQuality();
    metrics.setDataQualityGauges(quality);
  } catch (err) {
    logger.warn('data_quality_gauges_failed', { message: err.message });
  }

  await cache.publish('ingest:status', {
    ingesting: false,
    eventCount: savedEvents.length,
    metrics: funnelMetrics,
  });

  if (semanticEnabled() && savedEvents.length > 0) {
    try {
      vectorService.startIndexing(savedEvents);
    } catch (err) {
      logger.error('vector_indexing_failed', { message: err.message });
    }
  }

  return savedEvents;
}

module.exports = {
  processAndSaveEvents,
  validateOnly,
  processStagedEvent,
  refineEvents: async (events) => {
    const out = [];
    for (const e of events) {
      out.push(await refineSingleEvent(e));
    }
    return out;
  },
  dedupeAgainstExisting,
  resumeStagedEvents,
};
