const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'false';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';
process.env.USE_LOCAL_AI = 'false';

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-staging-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;

const dbService = require('../services/dbService');
const ingestPipeline = require('../services/ingestPipeline');
const vectorService = require('../services/vectorService');

vectorService.startIndexing = () => {};

function validEvent(id, overrides = {}) {
  return {
    id,
    name: `Staging Event ${id}`,
    description: 'Staging test',
    address: '123 Main St, New York, NY 10001',
    startTime: '8:00 PM',
    date: '2099-08-01',
    price: 'Free',
    category: 'Music',
    latitude: 40.75,
    longitude: -73.99,
    website: `https://example.com/${id}`,
    source: 'test',
    locationQuality: 'geocoded',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('staging integration', () => {
  beforeEach(async () => {
    await dbService.init();
  });

  afterEach(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('marks corrupt staging payload as failed via processStagedEvent', async () => {
    const result = await ingestPipeline.processStagedEvent({
      id: 'bad_row',
      payload: 'not-json',
    });
    assert.strictEqual(result.ok, false);
    assert.match(result.error, /invalid staging payload/);
  });

  it('resumes validated staging row', async () => {
    const event = validEvent('stage_resume_1');
    await dbService.saveStagingEvent(event, 'validated', 'test');

    const resumed = await ingestPipeline.resumeStagedEvents();
    assert.ok(resumed.saved.length >= 1);
    const count = await dbService.getEventCount();
    assert.ok(count >= 1);
  });
});
