const { getDatabase } = require('./db');

const METHODS = [
  'init',
  'getCachedLocation',
  'saveCachedLocation',
  'saveEvents',
  'saveVector',
  'getAllEvents',
  'getEventsPaginated',
  'getEventCount',
  'hasPendingJob',
  'getPendingJobCount',
  'getIndexedVectors',
  'countEventVectors',
  'semanticSearch',
  'fullTextSearch',
  'getEventsByIds',
  'updateEventCoordinates',
  'getMeta',
  'setMeta',
  'getLastScrapeAt',
  'setLastScrapeAt',
  'getLastIngestMetrics',
  'setLastIngestMetrics',
  'getScraperSourceHistory',
  'setScraperSourceHistory',
  'deleteOldEvents',
  'getEventsByDates',
  'enqueueJob',
  'getNextJob',
  'updateJobStatus',
  'reclaimStaleJobs',
  'rescheduleJob',
  'rescheduleFailedJob',
  'saveStagingEvent',
  'saveStagingEvents',
  'getStagingEventsByState',
  'updateStagingState',
  'deleteStagingEvent',
  'cleanupStaleStaging',
  'getPoolStats',
  'close',
];

const dbService = {};

for (const method of METHODS) {
  dbService[method] = function (...args) {
    return getDatabase()[method](...args);
  };
}

Object.defineProperty(dbService, 'db', {
  get() {
    const db = getDatabase();
    return db.db || db.pool || null;
  },
  set(value) {
    if (value === null) {
      const { resetDatabaseForTests } = require('./db');
      resetDatabaseForTests();
    }
  },
});

module.exports = dbService;
