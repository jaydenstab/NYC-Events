const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'false';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';
process.env.USE_LOCAL_AI = 'false';
process.env.SKIP_ENV_VALIDATION = 'true';

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-pipeline-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;

const dbService = require('../services/dbService');
const ingestPipeline = require('../services/ingestPipeline');
const vectorService = require('../services/vectorService');

vectorService.startIndexing = () => {};

function validEvent(overrides = {}) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: 'Pipeline Test Jazz Night',
    description: 'Live jazz in Manhattan',
    address: '123 Main St, New York, NY 10001',
    startTime: '8:00 PM',
    date: '2099-06-15',
    price: 'Free',
    category: 'Music',
    latitude: 40.75,
    longitude: -73.99,
    website: 'https://example.com/jazz',
    source: 'test',
    locationQuality: 'geocoded',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ingestPipeline', () => {
  beforeEach(async () => {
    await dbService.init();
  });

  afterEach(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('saves valid events through the pipeline', async () => {
    const events = [
      validEvent(),
      validEvent({
        id: 'evt_second',
        name: 'Second Show',
        website: 'https://example.com/second',
      }),
    ];
    const saved = await ingestPipeline.processAndSaveEvents(events);
    assert.ok(saved.length >= 2);
    const count = await dbService.getEventCount();
    assert.ok(count >= 2);
  });

  it('isolates invalid events without failing the batch', async () => {
    const good = validEvent({ id: 'evt_good_batch' });
    const bad = validEvent({ id: 'evt_bad_batch', name: '', description: '' });
    const saved = await ingestPipeline.processAndSaveEvents([good, bad]);
    assert.ok(saved.length >= 1);
    const metrics = await dbService.getLastIngestMetrics();
    assert.ok(metrics.deadLetter);
    assert.ok(metrics.deadLetter.failed >= 1);
  });

  it('rejects duplicate events against the database', async () => {
    const original = validEvent({ id: 'evt_dup_original', name: 'Duplicate Concert' });
    await ingestPipeline.processAndSaveEvents([original]);

    const dupe = validEvent({
      id: 'evt_dup_copy',
      name: 'Duplicate Concert',
      date: original.date,
      website: original.website,
    });
    const saved = await ingestPipeline.processAndSaveEvents([dupe]);
    assert.strictEqual(saved.length, 0);
  });
});
