const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-metrics-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.REDIS_URL = '';
process.env.METRICS_TOKEN = 'metrics-secret';
process.env.API_KEYS = 'test-key';

const dbService = require('../services/dbService');

describe('metrics endpoint', () => {
  let app;

  before(async () => {
    await dbService.init();
    app = require('../server');
  });

  after(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('returns 401 without metrics token', async () => {
    const res = await request(app).get('/metrics');
    assert.strictEqual(res.status, 401);
  });

  it('returns prometheus text with valid token', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer metrics-secret');
    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'], /text/);
    assert.match(res.text, /http_requests_total/);
  });

  it('increments http_requests_total after health check', async () => {
    await request(app).get('/api/health');
    const res = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer metrics-secret');
    assert.match(res.text, /http_requests_total/);
  });
});
