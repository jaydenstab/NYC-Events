const scraperRegistry = require('./scraperRegistry');
const ingestPipeline = require('./ingestPipeline');
const vectorService = require('./vectorService');
const { geocodeEventIds } = require('../utils/geocodeBatchWorker');
const cache = require('../cache');
const { logger } = require('../logger');

const SCRAPER_HANDLERS = {
  scrape_eventbrite: () => scraperRegistry.fetchEventbriteEvents(),
  scrape_union_square: () => scraperRegistry.fetchUnionSquareEvents(),
  scrape_oh_my_rockness: () => scraperRegistry.fetchOhMyRocknessEvents(),
  scrape_the_skint: () => scraperRegistry.fetchTheSkintEvents(),
  scrape_nyc_parks: () => scraperRegistry.fetchNycParksEvents(),
  scrape_nyc_go: () => scraperRegistry.fetchNycGoEvents(),
  scrape_reddit: () => scraperRegistry.fetchRedditEvents(),
};

function buildHandlerMap() {
  const handlers = new Map();

  for (const [type, fetchFn] of Object.entries(SCRAPER_HANDLERS)) {
    handlers.set(type, async () => {
      const events = await fetchFn();
      await ingestPipeline.processAndSaveEvents(events);
    });
  }

  handlers.set('scrape_all', async (payload) => {
    const startedAt = Date.now();
    const eventService = require('./eventService');
    await eventService._runIngest({
      includeReddit: Boolean(payload?.includeReddit),
      excludePrimary: Boolean(payload?.excludePrimary),
    });
    await cache.publish('ingest:status', { ingesting: false });
    logger.debug('worker_scrape_all_done', {
      job: 'scrape_all',
      includeReddit: Boolean(payload?.includeReddit),
      duration_ms: Date.now() - startedAt,
    });
  });

  handlers.set('embed_events', async (payload) => {
    await vectorService.embedEventIds(payload?.eventIds || []);
  });

  handlers.set('geocode_batch', async (payload) => {
    await geocodeEventIds(payload?.eventIds || []);
  });

  return handlers;
}

async function registerBullMQHandlers() {
  const jobQueue = require('./jobQueue');
  if (!jobQueue.useBullMQ()) {
    logger.warn('redis_unavailable_worker_idle', {
      message: 'Set REDIS_URL and run worker with BullMQ for background jobs',
    });
    return null;
  }
  const handlers = buildHandlerMap();
  return jobQueue.startWorker(handlers);
}

module.exports = { registerBullMQHandlers, buildHandlerMap };
