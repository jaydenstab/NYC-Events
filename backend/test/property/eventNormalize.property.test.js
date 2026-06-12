const { describe, it } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { normalizeEvent, buildEventId, applyJitteredDefaults } = require('../../utils/eventNormalize');

const sourceArb = fc.constantFrom('the_skint', 'eventbrite', 'bench');
const rawArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
  description: fc.string({ maxLength: 200 }),
  address: fc.string({ minLength: 3, maxLength: 120 }),
  date: fc.constantFrom('2099-06-15', 'TBD'),
  category: fc.constantFrom('Music', 'Art', 'Other'),
  website: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
});

describe('eventNormalize properties', () => {
  it('buildEventId is deterministic', () => {
    fc.assert(
      fc.property(sourceArb, rawArb, (source, raw) => {
        const a = buildEventId(source, raw);
        const b = buildEventId(source, raw);
        assert.strictEqual(a, b);
      })
    );
  });

  it('normalizeEvent strips HTML from name', () => {
    fc.assert(
      fc.property(sourceArb, (source) => {
        const event = normalizeEvent(source, {
          name: '<b>Hello</b> World Event',
          address: '123 Main St, Brooklyn, NY',
          description: 'desc',
        });
        assert.ok(!event.name.includes('<'));
        assert.ok(!event.name.includes('>'));
      })
    );
  });

  it('applyJitteredDefaults keeps coordinates in NYC bounding box', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 8, maxLength: 16 }), (digits) => {
        const idSuffix = digits.map((d) => d.toString(16)).join('');
        const event = applyJitteredDefaults({
          id: `bench_${idSuffix}`,
          name: 'Test',
          latitude: null,
          longitude: null,
        });
        assert.ok(Number.isFinite(event.latitude) && Number.isFinite(event.longitude));
        assert.ok(event.latitude >= 40.4 && event.latitude <= 41.0);
        assert.ok(event.longitude >= -74.3 && event.longitude <= -73.7);
        assert.strictEqual(event.locationQuality, 'default');
      })
    );
  });

  it('normalizeEvent id is stable for same inputs', () => {
    fc.assert(
      fc.property(sourceArb, rawArb, (source, raw) => {
        const e1 = normalizeEvent(source, raw);
        const e2 = normalizeEvent(source, raw);
        assert.strictEqual(e1.id, e2.id);
      })
    );
  });
});
