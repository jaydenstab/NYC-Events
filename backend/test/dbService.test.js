const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-test-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;

const dbService = require('../services/dbService');

describe('dbService locationQuality', () => {
  before(async () => {
    await dbService.init();
  });

  after(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('round-trips locationQuality', async () => {
    const events = [
      {
        id: 'test_geocoded_1',
        name: 'Test Event',
        description: 'Desc',
        address: 'Manhattan, NY',
        startTime: '7pm',
        date: '2099-01-01',
        price: 'Free',
        category: 'Music',
        latitude: 40.7,
        longitude: -74.0,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
    ];

    await dbService.saveEvents(events);
    const loaded = await dbService.getAllEvents();
    const found = loaded.find((e) => e.id === 'test_geocoded_1');
    assert.ok(found);
    assert.strictEqual(found.locationQuality, 'geocoded');
  });

  it('stores and reads last scrape meta', async () => {
    await dbService.setMeta('last_scrape_at', '2099-01-01T00:00:00.000Z');
    const t = await dbService.getLastScrapeAt();
    assert.strictEqual(t, Date.parse('2099-01-01T00:00:00.000Z'));
  });

  it('job attempts increment only on failure', async () => {
    await dbService.enqueueJob({ id: 'job_ok_1', type: 'scrape_all', payload: {} });
    await dbService.updateJobStatus('job_ok_1', 'processing');
    await dbService.updateJobStatus('job_ok_1', 'completed');
    const db = await dbService.init();
    const row = await db.get('SELECT attempts FROM jobs WHERE id = ?', 'job_ok_1');
    assert.strictEqual(row.attempts, 0);
  });

  it('deleteOldEvents removes past dated rows and stale undated rows', async () => {
    const oldDate = '2020-01-01';
    const futureDate = '2099-12-01';
    await dbService.saveEvents([
      {
        id: 'old_dated',
        name: 'Old Show',
        description: 'd',
        address: 'NYC',
        startTime: '8pm',
        date: oldDate,
        price: 'Free',
        category: 'Music',
        latitude: 40.7,
        longitude: -74,
        website: null,
        source: 'test',
        locationQuality: 'geocoded',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'future_dated',
        name: 'Future Show',
        description: 'd',
        address: 'NYC',
        startTime: '8pm',
        date: futureDate,
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
    const removed = await dbService.deleteOldEvents(7);
    assert.ok(removed >= 1);
    const remaining = await dbService.getAllEvents();
    assert.ok(remaining.some((e) => e.id === 'future_dated'));
    assert.ok(!remaining.some((e) => e.id === 'old_dated'));
  });

  it('round-trips geocode_cache by normalized address', async () => {
    const address = 'Test Venue, New York, NY';
    await dbService.saveCachedLocation(address, {
      latitude: 40.7,
      longitude: -74.0,
      locationQuality: 'geocoded',
    });
    const row = await dbService.getCachedLocation(address);
    assert.ok(row);
    assert.strictEqual(row.latitude, 40.7);
    assert.strictEqual(row.longitude, -74.0);
    assert.strictEqual(row.quality, 'geocoded');
  });
});
