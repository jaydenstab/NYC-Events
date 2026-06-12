const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-ready-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;
process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'true';
process.env.SEMANTIC_SEARCH_ENABLED = 'true';
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.REDIS_URL = '';
process.env.API_KEYS = 'test-key';

const readiness = require('../services/readiness');
const dbService = require('../services/dbService');
const vectorService = require('../services/vectorService');

vectorService.startIndexing = () => {};
vectorService.upsertEvents = async () => {};
vectorService.search = async () => [];
vectorService.isIndexReady = async () => false;
vectorService.isIndexing = () => false;

describe('semantic readiness', () => {
  let app;

  before(async () => {
    readiness.setVectorModelReady(false);
    await dbService.init();
    await dbService.saveEvents([
      {
        id: 'ready_test_event',
        name: 'Jazz Night',
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

  after(() => {
    readiness.setVectorModelReady(true);
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('returns 503 for semantic search when model not ready', async () => {
    const res = await request(app)
      .get('/api/events?semantic=true&search=jazz')
      .set('x-api-key', 'test-key');
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.code, 'SEMANTIC_NOT_READY');
    assert.ok(res.body.retryAfterMs);
  });

  it('allows keyword search when model not ready', async () => {
    const res = await request(app)
      .get('/api/events?search=jazz')
      .set('x-api-key', 'test-key');
    assert.strictEqual(res.status, 200);
  });
});
