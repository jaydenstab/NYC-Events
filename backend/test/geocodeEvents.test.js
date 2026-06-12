const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDb = path.join(os.tmpdir(), `whatsupnyc-geocode-${Date.now()}.sqlite`);
process.env.TEST_DB_PATH = tmpDb;

const dbService = require('../services/dbService');
const {
  resolveCoordinates,
  geocodeEventsBatch,
  normalizeAddressKey,
} = require('../utils/geocodeEvents');
const { normalizeEvent } = require('../utils/eventNormalize');

describe('geocodeEvents', () => {
  before(async () => {
    await dbService.init();
  });

  after(() => {
    dbService.db = null;
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('normalizeAddressKey lowercases and trims', () => {
    assert.strictEqual(normalizeAddressKey('  Madison Square Garden  '), 'madison square garden');
  });

  it('resolveCoordinates uses venue cache for known venues', async () => {
    const batchCache = new Map();
    const addr = 'Madison Square Garden, New York, NY';

    const first = await resolveCoordinates(addr, batchCache);
    const second = await resolveCoordinates(addr, batchCache);

    assert.strictEqual(first.quality, 'venue_cache');
    assert.strictEqual(second.quality, 'venue_cache');
    assert.ok(first.coords.latitude != null);
  });

  it('resolveCoordinates uses venue cache from venue-only prefix', async () => {
    const batchCache = new Map();
    const result = await resolveCoordinates('Mercury Lounge, Brooklyn, NY', batchCache);
    assert.strictEqual(result.quality, 'venue_cache');
    assert.ok(result.coords.latitude != null);
  });

  it('reads persisted address from geocode_cache on a fresh batch', async () => {
    const addr = '999 Unique Test Lane, Brooklyn, NY';
    const cleanAddr = addr
      .toLowerCase()
      .trim()
      .replace(/, new york, ny$/i, '')
      .replace(/, ny$/i, '');
    await dbService.saveCachedLocation(cleanAddr, {
      latitude: 40.7,
      longitude: -74.0,
      locationQuality: 'osm',
    });

    const { quality, coords } = await resolveCoordinates(addr, new Map());
    assert.strictEqual(quality, 'db_cache');
    assert.strictEqual(coords.latitude, 40.7);
  });

  it('geocodeEventsBatch reuses batch cache for duplicate addresses', async () => {
    const shared = '888 Shared Batch Street, Brooklyn, NY';
    const cleanAddr = shared
      .toLowerCase()
      .trim()
      .replace(/, new york, ny$/i, '')
      .replace(/, ny$/i, '');
    await dbService.saveCachedLocation(cleanAddr, {
      latitude: 40.68,
      longitude: -73.97,
      locationQuality: 'osm',
    });

    const events = [
      normalizeEvent('test', { name: 'A', address: shared, date: '2099-06-01' }),
      normalizeEvent('test', { name: 'B', address: shared, date: '2099-06-02' }),
    ];

    const geocoded = await geocodeEventsBatch(events);
    assert.strictEqual(geocoded[0].locationQuality, 'db_cache');
    assert.strictEqual(geocoded[1].locationQuality, 'batch');
    assert.strictEqual(geocoded[0].latitude, geocoded[1].latitude);
  });
});
