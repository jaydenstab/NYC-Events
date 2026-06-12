const { applyIngestToHistory } = require('../utils/scraperHealth');
const dbService = require('./dbService');
const scraperRegistry = require('./scraperRegistry');
const ingestPipeline = require('./ingestPipeline');
const cache = require('../cache');
const metrics = require('./metrics');
const { logger } = require('../logger');

const SCRAPER_CONCURRENCY = parseInt(process.env.SCRAPER_CONCURRENCY, 10) || 1;

async function recordScraperHealth(sourceResults) {
  const prior = await dbService.getScraperSourceHistory();
  const { history, scraperHealth } = applyIngestToHistory(prior, sourceResults);
  await dbService.setScraperSourceHistory(history);
  return scraperHealth;
}

async function fetchAndNormalizeAggregated(options = {}) {
  const startedAt = Date.now();
  await cache.publish('ingest:status', { ingesting: true });
  const targets = scraperRegistry.getTargets(options);
  const sourceCounts = {};
  const sourceResults = [];
  const allEvents = [];

  const runBatch = async (batch) => {
    await Promise.all(
      batch.map(async (t) => {
        const startedAt = Date.now();
        try {
          const fetched = await t.fetch();
          sourceCounts[t.name] = fetched.length;
          sourceResults.push({ name: t.name, count: fetched.length, failed: false });
          allEvents.push(...fetched);
          logger.info('source_scrape_done', {
            source: t.name,
            count: fetched.length,
            elapsedMs: Date.now() - startedAt,
          });
          metrics.setScrapeSourceCount(t.name, fetched.length);
        } catch (err) {
          sourceCounts[t.name] = 0;
          sourceResults.push({ name: t.name, count: 0, failed: true, error: err.message });
          logger.warn(`${t.name}_scrape_failed`, { message: err.message });
        }
      })
    );
  };

  for (let i = 0; i < targets.length; i += SCRAPER_CONCURRENCY) {
    const batch = targets.slice(i, i + SCRAPER_CONCURRENCY);
    await runBatch(batch);
  }

  const scraperHealth = await recordScraperHealth(sourceResults);
  return ingestPipeline.processAndSaveEvents(allEvents, {
    sourceCounts,
    scraperHealth,
    duration_ms: Date.now() - startedAt,
  });
}

module.exports = {
  fetchAndNormalizeAggregated,
  recordScraperHealth,
};
