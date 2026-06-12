const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-dedupe-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;
process.env.SKIP_GEOCODE = 'true';
process.env.SKIP_EVENT_VALIDATION = 'true';
process.env.USE_LOCAL_AI = 'false';
process.env.SEMANTIC_SEARCH_ENABLED = 'false';

const dbService = require('../services/dbService');
const ingestPipeline = require('../services/ingestPipeline');
const vectorService = require('../services/vectorService');

vectorService.startIndexing = () => {};

describe('dedupe integration', () => {
  before(async () => {
    await dbService.init();
    await dbService.saveEvents([
      {
        id: 'seed_show_1',
        name: 'Brooklyn Indie Night at Mercury Lounge',
        description: 'Live music',
        address: '217 E Houston St, New York, NY',
        startTime: '8pm',
        date: '2099-06-15',
        price: '$15',
        category: 'Music',
        latitude: 40.72,
        longitude: -73.99,
        website: 'https://example.com/seed-show',
        source: 'oh_my_rockness',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  after(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('drops batch event that fuzzy-matches existing DB row on same date', async () => {
    const incoming = [
      {
        id: 'new_show_dup',
        name: 'Brooklyn Indie Night at Mercury Lounge NYC',
        description: 'Live music tonight',
        address: '217 E Houston St, New York, NY',
        startTime: '8pm',
        date: '2099-06-15',
        price: '$15',
        category: 'Music',
        latitude: 40.72,
        longitude: -73.99,
        website: null,
        source: 'oh_my_rockness',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ];

    const saved = await ingestPipeline.processAndSaveEvents(incoming);
    assert.strictEqual(saved.length, 0);

    const all = await dbService.getAllEvents();
    assert.strictEqual(all.filter((e) => e.id === 'new_show_dup').length, 0);
    assert.ok(all.some((e) => e.id === 'seed_show_1'));
  });
});
