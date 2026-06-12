const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');
const request = require('supertest');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-quality-${Date.now()}.sqlite`);
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.SKIP_GEOCODE = 'true';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';
process.env.REDIS_URL = '';
process.env.API_KEYS = 'test-key';
process.env.TEST_DB_PATH = tmpDb;

const dbService = require('../services/dbService');
const app = require('../server');

describe('GET /api/metrics/quality', () => {
  before(async () => {
    await dbService.init();
  });

  it('returns quality metrics with API key', async () => {
    const res = await request(app).get('/api/metrics/quality').set('x-api-key', 'test-key');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(typeof res.body.eventCount, 'number');
    assert.strictEqual(typeof res.body.dateCompleteness, 'number');
  });

  it('rejects without API key in production-like config', async () => {
    const res = await request(app).get('/api/metrics/quality');
    assert.ok(res.status === 401 || res.status === 403);
  });
});
