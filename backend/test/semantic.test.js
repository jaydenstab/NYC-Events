const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'true';
process.env.SEMANTIC_SEARCH_ENABLED = 'true';

const vectorService = require('../services/vectorService');
const dbService = require('../services/dbService');
const eventService = require('../services/eventService');

const originalStartIndexing = vectorService.startIndexing.bind(vectorService);

describe('semantic search lifecycle', () => {
  beforeEach(() => {
    vectorService.index = [];
    vectorService.indexVersion = 0;
    vectorService.indexingInProgress = false;
    vectorService.lastIndexError = null;
    vectorService.pendingEvents = [];

    vectorService.startIndexing = (events) => {
      vectorService._testIndexingStarted = true;
      vectorService._testIndexingCount = events.length;
    };
    vectorService._testIndexingStarted = false;
  });

  it('keyword fallback when semantic requested but index empty', async () => {
    const events = [
      {
        id: 'test_abc',
        name: 'Brooklyn Jazz Festival',
        description: 'Live music',
        address: 'Brooklyn, NY',
        startTime: '8pm',
        date: '2099-12-01',
        price: 'Free',
        category: 'Music',
        latitude: 40.67,
        longitude: -73.94,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ];

    const originalGetAll = dbService.getAllEvents;
    const originalLastScrape = dbService.getLastScrapeAt;
    dbService.getAllEvents = async () => events;
    dbService.getLastScrapeAt = async () => Date.now();

    try {
      const result = await eventService.getAggregatedEvents({
        searchQuery: 'jazz',
        semantic: true,
      });
      assert.strictEqual(result.meta.semanticFallback, true);
      assert.ok(result.events.length >= 1);
      assert.ok(result.events.some((e) => e.name.toLowerCase().includes('jazz')));
    } finally {
      dbService.getAllEvents = originalGetAll;
      dbService.getLastScrapeAt = originalLastScrape;
    }
  });

  it('starts background indexing without blocking aggregate', async () => {
    const events = [
      {
        id: 'e1',
        name: 'Event One',
        description: 'Desc',
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
    ];

    const originalGetAll = dbService.getAllEvents;
    const originalLastScrape = dbService.getLastScrapeAt;
    dbService.getAllEvents = async () => events;
    dbService.getLastScrapeAt = async () => Date.now();

    const startSpy = vectorService.startIndexing;
    let started = false;
    vectorService.startIndexing = (evs) => {
      started = true;
      assert.strictEqual(evs.length, 1);
    };

    try {
      const t0 = Date.now();
      await eventService.processAndSaveEvents(events);
      const elapsed = Date.now() - t0;
      assert.ok(elapsed < 2000, 'processAndSaveEvents should not block on indexing');
      assert.strictEqual(started, true);
    } finally {
      dbService.getAllEvents = originalGetAll;
      dbService.getLastScrapeAt = originalLastScrape;
      vectorService.startIndexing = originalStartIndexing;
    }
  });
});

describe('vector incremental indexing', () => {
  beforeEach(() => {
    vectorService.startIndexing = originalStartIndexing;
    vectorService.index = [];
    vectorService.indexVersion = 0;
    vectorService.indexingInProgress = false;
    vectorService.pendingEvents = [];
    vectorService.lastIndexError = null;
  });

  it('indexes new events when index already has other events', async () => {
    vectorService.index = [
      {
        id: 'e1',
        vector: [1, 0, 0],
        event: { id: 'e1', name: 'Event One' },
      },
    ];
    vectorService.indexVersion = 1;
    vectorService.indexingInProgress = false;
    vectorService.pendingEvents = [];

    const upserted = [];
    const originalUpsert = vectorService.upsertEvents.bind(vectorService);
    vectorService.upsertEvents = async (events) => {
      upserted.push(...events.map((e) => e.id));
      for (const event of events) {
        vectorService.index.push({
          id: event.id,
          vector: [0, 1, 0],
          event,
        });
      }
      vectorService.indexVersion += 1;
    };

    const newEvent = {
      id: 'e2',
      name: 'Event Two',
      description: 'Desc',
      address: 'NYC',
      startTime: '8pm',
      date: '2099-02-01',
      price: 'Free',
      category: 'Music',
      latitude: 40.68,
      longitude: -73.94,
      website: null,
      source: 'test',
      locationQuality: 'geocoded',
      createdAt: new Date().toISOString(),
    };

    try {
      vectorService.startIndexing([newEvent]);
      const deadline = Date.now() + 2000;
      while (vectorService.isIndexing() && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 20));
      }
      assert.deepStrictEqual(upserted, ['e2']);
      assert.ok(vectorService.index.some((i) => i.id === 'e2'));
    } finally {
      vectorService.upsertEvents = originalUpsert;
    }
  });
});
