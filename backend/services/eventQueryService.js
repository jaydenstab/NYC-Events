const { keywordFilter } = require('../utils/eventNormalize');
const vectorService = require('./vectorService');
const dbService = require('./dbService');
const jobQueue = require('./jobQueue');
const { logger } = require('../logger');
const { SEARCH_MAX_QUERY_LENGTH } = require('../configs/constants');

const EVENTS_STALE_MS = parseInt(process.env.EVENTS_STALE_MS, 10) || 24 * 60 * 60 * 1000;
const DEFAULT_SEMANTIC_LIMIT = parseInt(process.env.SEMANTIC_SEARCH_LIMIT, 10) || 50;

function allowSyncIngest() {
  return process.env.SYNC_INGEST === 'true' || !jobQueue.useBullMQ();
}

function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  const stripped = query.replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (stripped.length > SEARCH_MAX_QUERY_LENGTH) {
    return stripped.slice(0, SEARCH_MAX_QUERY_LENGTH);
  }
  return stripped;
}

async function shouldScrape(forceRefresh) {
  const eventCount = await dbService.getEventCount();
  if (eventCount === 0) return { shouldScrape: true, eventCount };
  if (forceRefresh) return { shouldScrape: true, eventCount };

  const lastScrape = await dbService.getLastScrapeAt();
  if (lastScrape == null) return { shouldScrape: true, eventCount };

  const stale = Date.now() - lastScrape > EVENTS_STALE_MS;
  return { shouldScrape: stale, eventCount };
}

async function buildResponseMeta({ ingesting, totalCount, extra = {} }) {
  const lastScrapeMs = await dbService.getLastScrapeAt();
  const lastIngestMetrics = await dbService.getLastIngestMetrics();
  const degradedSources = lastIngestMetrics?.scraperHealth?.degradedSources ?? [];

  return {
    ingesting,
    totalCount,
    lastScrapeAt: lastScrapeMs ? new Date(lastScrapeMs).toISOString() : null,
    degradedSources,
    deadLetter: lastIngestMetrics?.deadLetter || null,
    ...extra,
  };
}

async function runFullScrape(options = {}) {
  const { includeReddit = false } = options;
  logger.info('service_full_scrape_enqueue', { includeReddit });
  await jobQueue.enqueueBackgroundJob('scrape_all', { includeReddit });
}

/**
 * @param {object} options
 * @param {boolean} [options.includeReddit]
 * @param {string} [options.searchQuery]
 * @param {boolean} [options.semantic]
 * @param {boolean} [options.forceRefresh]
 * @param {number} [options.semanticLimit]
 * @param {Function} options.runIngest
 * @returns {Promise<{ events: object[], meta: object }>}
 */
async function getAggregatedEvents(options = {}) {
  const {
    includeReddit = false,
    searchQuery = '',
    semantic = false,
    forceRefresh = false,
    semanticLimit = DEFAULT_SEMANTIC_LIMIT,
    page = null,
    perPage = 50,
  } = options;

  const usePagination = page != null && Number.isFinite(page) && page >= 1;
  const paginationLimit = Math.min(Math.max(perPage || 50, 1), 100);
  const paginationOffset = usePagination ? (page - 1) * paginationLimit : 0;

  const { shouldScrape: needsScrape, eventCount } = await shouldScrape(forceRefresh);
  let allEvents = null;
  let paginatedTotalCount = null;
  let ingesting = false;

  const loadEvents = async () => {
    if (allEvents) return allEvents;
    if (usePagination) {
      const result = await dbService.getEventsPaginated(paginationLimit, paginationOffset);
      allEvents = result.events;
      paginatedTotalCount = result.totalCount;
      return allEvents;
    }
    allEvents = await dbService.getAllEvents();
    return allEvents;
  };

  const runIngest = options.runIngest;
  if (!runIngest) {
    throw new Error('runIngest callback required');
  }

  if (needsScrape && eventCount === 0) {
    if (allowSyncIngest()) {
      allEvents = await runIngest({ includeReddit });
    } else {
      const enqueueScrape = options.runFullScrape || runFullScrape;
      await enqueueScrape({ includeReddit });
      ingesting = true;
    }
  } else if (needsScrape && forceRefresh) {
    if (allowSyncIngest()) {
      allEvents = await runIngest({ includeReddit });
    } else {
      const enqueueScrape = options.runFullScrape || runFullScrape;
      await enqueueScrape({ includeReddit });
      ingesting = true;
    }
  } else if (needsScrape && eventCount > 0) {
    const hasPending = await jobQueue.hasPendingJob('scrape_all');
    const enqueueScrape = options.runFullScrape || runFullScrape;
    if (!hasPending) await enqueueScrape({ includeReddit });
    ingesting = true;
  }

  const trimmedSearch = sanitizeSearchQuery(searchQuery);
  const limit = Math.min(Math.max(semanticLimit, 1), 100);

  if (semantic && trimmedSearch) {
    const indexReady = await vectorService.isIndexReady();
    if (!indexReady) {
      const events = await loadEvents();
      const filtered = keywordFilter(events, trimmedSearch);
      return {
        events: filtered,
        meta: await buildResponseMeta({
          ingesting,
          totalCount: filtered.length,
          extra: { semanticFallback: true },
        }),
      };
    }
    const results = await vectorService.hybridSearch(trimmedSearch, limit);
    return {
      events: results,
      meta: await buildResponseMeta({
        ingesting,
        totalCount: results.length,
        extra: { hybridSearch: true },
      }),
    };
  }

  const events = await loadEvents();
  let filtered = events;
  if (trimmedSearch) filtered = keywordFilter(events, trimmedSearch);

  const stale = needsScrape && eventCount > 0 && !forceRefresh;
  const totalCount =
    usePagination && paginatedTotalCount != null ? paginatedTotalCount : filtered.length;

  return {
    events: filtered,
    meta: await buildResponseMeta({
      ingesting,
      totalCount,
      extra: {
        ...(stale ? { stale: true } : {}),
        ...(usePagination
          ? { page, perPage: paginationLimit, totalCount: paginatedTotalCount ?? totalCount }
          : {}),
      },
    }),
  };
}

module.exports = {
  getAggregatedEvents,
  runFullScrape,
  shouldScrape,
  buildResponseMeta,
  sanitizeSearchQuery,
};
