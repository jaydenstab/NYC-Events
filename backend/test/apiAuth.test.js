const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-auth-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;
process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'true';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.REDIS_URL = '';
process.env.API_KEYS = 'test-key,key-two';

const dbService = require('../services/dbService');
const vectorService = require('../services/vectorService');
const { extractApiKey, isStreamRoute } = require('../middleware/requireApiKey');

vectorService.startIndexing = () => {};
vectorService.upsertEvents = async () => {};

describe('API auth', () => {
  let app;

  before(async () => {
    await dbService.init();
    await dbService.saveEvents([
      {
        id: 'auth_test_event',
        name: 'Auth Test Event',
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
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('accepts second key in rotation list', async () => {
    const res = await request(app).get('/api/events').set('x-api-key', 'key-two');
    assert.strictEqual(res.status, 200);
  });

  it('extractApiKey reads api_key query on stream routes', () => {
    const req = {
      path: '/stream',
      baseUrl: '/api/events',
      originalUrl: '/api/events/stream?api_key=test-key',
      query: { api_key: 'test-key' },
      headers: {},
    };
    assert.strictEqual(isStreamRoute(req), true);
    const { key, viaQuery } = extractApiKey(req, { allowQuery: true });
    assert.strictEqual(key, 'test-key');
    assert.strictEqual(viaQuery, true);
  });

  it('rejects stream without credentials', async () => {
    const res = await request(app).get('/api/events/stream');
    assert.strictEqual(res.status, 401);
  });
});
