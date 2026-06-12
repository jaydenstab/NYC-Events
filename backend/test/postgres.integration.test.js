const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const testUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe('postgres integration', { skip: !testUrl }, () => {
  let PostgresDatabase;
  let db;

  before(async () => {
    PostgresDatabase = require('../services/db/postgres').PostgresDatabase;
    db = new PostgresDatabase(testUrl);
    await db.init();
  });

  after(async () => {
    if (db) await db.close();
  });

  it('inserts and queries events', async () => {
    const event = {
      id: `pg_test_${Date.now()}`,
      name: 'PG Integration Event',
      description: 'Test',
      address: 'NYC',
      startTime: '7pm',
      date: '2099-12-31',
      price: 'Free',
      category: 'Music',
      latitude: 40.7,
      longitude: -74,
      website: null,
      source: 'test',
      locationQuality: 'geocoded',
      scrapedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await db.saveEvents([event]);
    const found = await db.getEventsByIds([event.id]);
    assert.strictEqual(found.length, 1);
    assert.strictEqual(found[0].name, event.name);
  });

  it('reports pool stats', () => {
    const stats = db.getPoolStats();
    assert.ok(typeof stats.totalCount === 'number');
    assert.ok(typeof stats.waitingCount === 'number');
  });

  it('staging checkpoint round-trip', async () => {
    const event = {
      id: `pg_stage_${Date.now()}`,
      name: 'Staged Event',
      description: 'D',
      address: 'NYC',
      startTime: '8pm',
      date: '2099-11-01',
      price: 'Free',
      category: 'Music',
      latitude: 40.7,
      longitude: -74,
      website: null,
      source: 'test',
      locationQuality: 'pending',
      createdAt: new Date().toISOString(),
    };

    await db.saveStagingEvent(event, 'validated', 'test');
    const staged = await db.getStagingEventsByState('validated');
    assert.ok(staged.some((r) => r.id === event.id));
    await db.updateStagingState(event.id, 'geocoded');
    await db.deleteStagingEvent(event.id);
    const after = await db.getStagingEventsByState('validated');
    assert.ok(!after.some((r) => r.id === event.id));
  });
});
