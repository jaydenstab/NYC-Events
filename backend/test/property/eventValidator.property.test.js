const { describe, it } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { validateEvents } = require('../../utils/eventValidator');
const { normalizeEventForValidation } = require('../../utils/categoryNormalize');
const { todayNYC } = require('../../utils/dateUtils');

function validRaw() {
  return {
    name: 'Brooklyn Jazz Night Live',
    address: '123 Atlantic Ave, Brooklyn, NY',
    description: 'A great show',
    date: '2099-12-01',
    startTime: '8:00 PM',
    category: 'Music',
    source: 'fixture',
  };
}

describe('eventValidator properties', () => {
  it('validateEvents returns a subset', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ maxLength: 250 }),
            address: fc.string({ maxLength: 120 }),
            date: fc.constantFrom('2099-06-15', 'TBD', '2020-01-01'),
            source: fc.constant('fixture'),
          }),
          { maxLength: 20 }
        ),
        (events) => {
          const normalized = events.map((e) => normalizeEventForValidation(e));
          const out = validateEvents(normalized);
          assert.ok(out.length <= normalized.length);
        }
      )
    );
  });

  it('validateEvents is deterministic', () => {
    const batch = [validRaw(), { ...validRaw(), name: 'Another Valid Event Name' }];
    const a = validateEvents(batch.map(normalizeEventForValidation));
    const b = validateEvents(batch.map(normalizeEventForValidation));
    assert.deepStrictEqual(a.map((e) => e.name), b.map((e) => e.name));
  });

  it('events dated today pass when otherwise valid', () => {
    const today = todayNYC();
    const event = normalizeEventForValidation({ ...validRaw(), date: today });
    const out = validateEvents([event]);
    assert.strictEqual(out.length, 1);
  });

  it('valid names are within 5-200 chars when accepted', () => {
    const out = validateEvents([normalizeEventForValidation(validRaw())]);
    for (const e of out) {
      assert.ok(e.name.length >= 5 && e.name.length <= 200);
    }
  });
});
