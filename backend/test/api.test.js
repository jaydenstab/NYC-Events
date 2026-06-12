const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-api-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;
process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'true';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.REDIS_URL = '';
process.env.API_KEYS = 'test-key';

const dbService = require('../services/dbService');
const vectorService = require('../services/vectorService');

vectorService.startIndexing = () => {};
vectorService.upsertEvents = async () => {};

const aiOrchestrator = require('../services/aiOrchestrator');

function authed(req) {
  return req.set('x-api-key', 'test-key');
}

describe('API', () => {
  let app;

  before(async () => {
    await dbService.init();
    await dbService.saveEvents([
      {
        id: 'api_test_event',
        name: 'API Test Concert',
        description: 'Test',
        address: 'Manhattan, NY',
        startTime: '8pm',
        date: '2099-12-01',
        price: 'Free',
        category: 'Music',
        latitude: 40.75,
        longitude: -73.99,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ]);
    await dbService.setLastScrapeAt(new Date().toISOString());
    app = require('../server');
  });

  after(async () => {
    await aiOrchestrator.terminate();
    dbService.db = null;
  });

  it('GET /api/health returns OK without API key', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'OK');
    assert.strictEqual(res.body.db, 'ok');
    assert.ok(res.body.eventCount >= 1);
    assert.deepStrictEqual(res.body.degradedSources, []);
  });

  it('GET /api/events returns 401 without API key', async () => {
    const res = await request(app).get('/api/events');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  it('GET /api/health returns DEGRADED when scrapers on zero streak', async () => {
    await dbService.setLastIngestMetrics({
      at: new Date().toISOString(),
      sourceCounts: { the_skint: 0 },
      scraperHealth: {
        degradedSources: ['the_skint'],
        sourceStatus: {
          the_skint: { streak: 3, lastCount: 0, lastOutcome: 'empty' },
        },
      },
    });
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.status, 'DEGRADED');
    assert.deepStrictEqual(res.body.degradedSources, ['the_skint']);
  });

  it('GET /api/events/simple returns envelope with events array', async () => {
    const res = await authed(request(app).get('/api/events/simple'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(Array.isArray(res.body.events));
    assert.strictEqual(res.body.meta.totalCount, res.body.events.length);
  });

  it('GET /api/events returns envelope from seeded DB without scrape', async () => {
    const res = await authed(request(app).get('/api/events'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.events.some((e) => e.id === 'api_test_event'));
    assert.strictEqual(res.body.meta.semanticIndexing, false);
    assert.ok(res.body.meta.lastScrapeAt);
    assert.ok(Array.isArray(res.body.meta.degradedSources));
  });

  it('GET /api/events surfaces degradedSources from last ingest metrics', async () => {
    const cache = require('../cache');
    await cache.clear();
    await dbService.setLastIngestMetrics({
      at: new Date().toISOString(),
      scraperHealth: { degradedSources: ['eventbrite'], sourceStatus: {} },
    });
    const res = await authed(request(app).get('/api/events'));
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.meta.degradedSources, ['eventbrite']);
  });

  it('GET /api/events?semantic=true returns 400 when semantic disabled', async () => {
    const res = await authed(request(app).get('/api/events?search=music&semantic=true'));
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'SEMANTIC_DISABLED');
  });

  it('GET /api/events/eventbrite returns 410 DEPRECATED_ENDPOINT', async () => {
    const res = await authed(request(app).get('/api/events/eventbrite'));
    assert.strictEqual(res.status, 410);
    assert.strictEqual(res.body.ok, false);
    assert.strictEqual(res.body.error, 'DEPRECATED_ENDPOINT');
    assert.ok(res.body.message.includes('GET /api/events'));
  });

  it('GET /api/events?ids= returns events by id', async () => {
    const res = await authed(
      request(app).get('/api/events?ids=api_test_event,unknown_id')
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.meta.idsMode, true);
    assert.strictEqual(res.body.events.length, 1);
    assert.strictEqual(res.body.events[0].id, 'api_test_event');
  });

  it('GET /api/events?ids= returns 400 when more than 50 ids', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id_${i}`).join(',');
    const res = await authed(request(app).get(`/api/events?ids=${ids}`));
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'TOO_MANY_IDS');
  });

  it('GET /api/events?ids= returns 400 when combined with search', async () => {
    const res = await authed(
      request(app).get('/api/events?ids=api_test_event&search=music')
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'IDS_CONFLICT');
  });
});

process.on('exit', () => {
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
});
