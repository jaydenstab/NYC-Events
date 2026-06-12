const dbService = require('./dbService');
const cache = require('../cache');
const ingestPipeline = require('./ingestPipeline');
const ingestOrchestrator = require('./ingestOrchestrator');
const eventQueryService = require('./eventQueryService');

class EventService {
  /** Test / CLI seam */
  async _fetchAndNormalizeAggregated(options) {
    return ingestOrchestrator.fetchAndNormalizeAggregated(options);
  }

  /** Test / CLI seam */
  async _runIngest(options = {}) {
    const events = await this._fetchAndNormalizeAggregated(options);

    if (!options.onlyPrimary) {
      const EVENTS_RETENTION_DAYS = parseInt(process.env.EVENTS_RETENTION_DAYS, 10) || 7;
      await dbService.setLastScrapeAt();
      await dbService.deleteOldEvents(EVENTS_RETENTION_DAYS);
      await cache.bumpGeneration();
      await cache.deleteByPrefix('events:main:');
    }
    return events;
  }

  async processAndSaveEvents(events, metricsContext) {
    return ingestPipeline.processAndSaveEvents(events, metricsContext);
  }

  async runFullScrape(options) {
    return eventQueryService.runFullScrape(options);
  }

  async getAggregatedEvents(options) {
    return eventQueryService.getAggregatedEvents({
      ...options,
      runIngest: (opts) => this._runIngest(opts),
      runFullScrape: (opts) => this.runFullScrape(opts),
    });
  }
}

module.exports = new EventService();
