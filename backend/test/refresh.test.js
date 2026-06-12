const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'true';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.API_KEYS = 'test-key';
process.env.EVENTS_STALE_MS = '1000';

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-refresh-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;

const dbService = require('../services/dbService');
const eventService = require('../services/eventService');
const vectorService = require('../services/vectorService');

describe('refresh and staleness', () => {
  beforeEach(async () => {
    vectorService.index = [];
    vectorService.indexVersion = 0;
    vectorService.upsertEvents = async () => {};
    vectorService.startIndexing = () => {};
    await dbService.init();
  });

  afterEach(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('scrapes when forceRefresh even if DB has data', async () => {
    await dbService.saveEvents([
      {
        id: 'old_event',
        name: 'Old',
        description: 'D',
        address: 'NYC',
        startTime: '7pm',
        date: '2099-01-01',
        price: 'Free',
        category: 'Music',
        latitude: 40.7,
        longitude: -74,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ]);
    await dbService.setLastScrapeAt(new Date().toISOString());

    let scrapeCalls = 0;
    const original = eventService._fetchAndNormalizeAggregated;
    eventService._fetchAndNormalizeAggregated = async () => {
      scrapeCalls += 1;
      return [
        {
          id: 'new_event',
          name: 'Fresh',
          description: 'D',
          address: 'Brooklyn, NY',
          startTime: '8pm',
          date: '2099-02-01',
          price: 'Free',
          category: 'Music',
          latitude: 40.68,
          longitude: -73.94,
          website: null,
          source: 'test',
          locationQuality: 'default',
          createdAt: new Date().toISOString(),
        },
      ];
    };

    try {
      const result = await eventService.getAggregatedEvents({ forceRefresh: true });
      assert.strictEqual(scrapeCalls, 1);
      assert.ok(result.events.some((e) => e.id === 'new_event'));
    } finally {
      eventService._fetchAndNormalizeAggregated = original;
    }
  });

  it('skips scrape when data is fresh', async () => {
    await dbService.saveEvents([
      {
        id: 'fresh_event',
        name: 'Fresh',
        description: 'D',
        address: 'NYC',
        startTime: '7pm',
        date: '2099-01-01',
        price: 'Free',
        category: 'Music',
        latitude: 40.7,
        longitude: -74,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ]);
    await dbService.setLastScrapeAt(new Date().toISOString());

    let scrapeCalls = 0;
    const original = eventService._fetchAndNormalizeAggregated;
    eventService._fetchAndNormalizeAggregated = async () => {
      scrapeCalls += 1;
      return [];
    };

    try {
      await eventService.getAggregatedEvents({});
      assert.strictEqual(scrapeCalls, 0);
    } finally {
      eventService._fetchAndNormalizeAggregated = original;
    }
  });

  it('enqueues background scrape when stale with existing data', async () => {
    const oldScrape = new Date(Date.now() - 60_000).toISOString();
    await dbService.saveEvents([
      {
        id: 'stale_event',
        name: 'Stale',
        description: 'D',
        address: 'NYC',
        startTime: '7pm',
        date: '2099-01-01',
        price: 'Free',
        category: 'Music',
        latitude: 40.7,
        longitude: -74,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ]);
    await dbService.setLastScrapeAt(oldScrape);

    let scrapeCalls = 0;
    const originalFetch = eventService._fetchAndNormalizeAggregated;
    eventService._fetchAndNormalizeAggregated = async () => {
      scrapeCalls += 1;
      return [];
    };

    let enqueueCalls = 0;
    const originalEnqueue = eventService.runFullScrape;
    eventService.runFullScrape = async () => {
      enqueueCalls += 1;
    };

    try {
      const result = await eventService.getAggregatedEvents({});
      assert.strictEqual(scrapeCalls, 0);
      assert.strictEqual(enqueueCalls, 1);
      assert.strictEqual(result.meta.ingesting, true);
      assert.strictEqual(result.meta.stale, true);
      assert.ok(result.events.some((e) => e.id === 'stale_event'));
    } finally {
      eventService._fetchAndNormalizeAggregated = originalFetch;
      eventService.runFullScrape = originalEnqueue;
    }
  });
});
