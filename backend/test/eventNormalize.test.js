const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  buildEventId,
  normalizeEvent,
  keywordFilter,
} = require('../utils/eventNormalize');

describe('eventNormalize', () => {
  it('buildEventId is stable for same inputs', () => {
    const a = buildEventId('bing_food_events', {
      name: 'Free Pizza',
      date: '2026-05-22',
      address: '123 Main St, New York, NY',
    });
    const b = buildEventId('bing_food_events', {
      name: 'Free Pizza',
      date: '2026-05-22',
      address: '123 Main St, New York, NY',
    });
    assert.strictEqual(a, b);
    assert.ok(a.startsWith('bing_food_events_'));
  });

  it('buildEventId differs when name changes', () => {
    const a = buildEventId('reddit', { name: 'A', date: '2026-01-01', address: 'NYC' });
    const b = buildEventId('reddit', { name: 'B', date: '2026-01-01', address: 'NYC' });
    assert.notStrictEqual(a, b);
  });

  it('normalizeEvent leaves coordinates null when none provided', () => {
    const e = normalizeEvent('union_square', {
      name: 'Market',
      address: 'Union Square, New York, NY',
      date: '2026-06-01',
      category: 'Community',
    });
    assert.strictEqual(e.source, 'union_square');
    assert.strictEqual(e.latitude, null);
    assert.strictEqual(e.longitude, null);
    assert.strictEqual(e.locationQuality, null);
  });

  it('applyJitteredDefaults assigns deterministic coordinates for same id', () => {
    const { applyJitteredDefaults } = require('../utils/eventNormalize');
    const raw = {
      name: 'Market',
      address: 'Union Square, New York, NY',
      date: '2026-06-01',
      category: 'Community',
    };
    const a = applyJitteredDefaults(normalizeEvent('union_square', raw));
    const b = applyJitteredDefaults(normalizeEvent('union_square', raw));
    assert.strictEqual(a.latitude, b.latitude);
    assert.strictEqual(a.longitude, b.longitude);
    assert.strictEqual(a.locationQuality, 'default');
  });

  it('keywordFilter matches description and address', () => {
    const events = [
      normalizeEvent('test', { name: 'Jazz Night', address: 'Brooklyn', date: '2026-01-01' }),
      normalizeEvent('test', { name: 'Art Walk', address: 'Manhattan', date: '2026-01-02' }),
    ];
    const out = keywordFilter(events, 'jazz');
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].name, 'Jazz Night');
  });
});
