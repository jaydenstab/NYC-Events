const { describe, it } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { isFuzzyDuplicate, removeDuplicates } = require('../../utils/dedupe');
const { normalizeEvent } = require('../../utils/eventNormalize');

function mk(raw) {
  return normalizeEvent('bench', {
    description: 'Event description here',
    category: 'Music',
    ...raw,
  });
}

describe('dedupe properties', () => {
  it('removeDuplicates is idempotent', () => {
    const rowArb = fc.record({
      name: fc.string({ minLength: 6, maxLength: 40 }),
      date: fc.constantFrom('2099-01-01', '2099-02-02', 'TBD'),
      address: fc.string({ minLength: 10, maxLength: 60 }),
    });
    fc.assert(
      fc.property(fc.array(rowArb, { maxLength: 15 }), (rows) => {
          const events = rows.map((r) => mk(r));
          const once = removeDuplicates(events);
          const twice = removeDuplicates(once);
          assert.strictEqual(once.length, twice.length);
          assert.deepStrictEqual(
            once.map((e) => e.id),
            twice.map((e) => e.id)
          );
        }
      )
    );
  });

  it('removeDuplicates output is subset of input', () => {
    const rowArb = fc.record({
      name: fc.string({ minLength: 6, maxLength: 40 }),
      date: fc.constant('2099-03-03'),
      address: fc.constant('100 Broadway, New York, NY'),
    });
    fc.assert(
      fc.property(fc.array(rowArb, { maxLength: 10 }), (rows) => {
        const events = rows.map((r) => mk(r));
        const unique = removeDuplicates(events);
        assert.ok(unique.length <= events.length);
      })
    );
  });

  it('event is fuzzy duplicate of itself', () => {
    const e = mk({
      name: 'Symmetry Test Concert',
      date: '2099-04-04',
      address: '200 West St, New York, NY',
    });
    assert.strictEqual(isFuzzyDuplicate(e, [e]), true);
  });

  it('order preservation: first occurrence kept', () => {
    const a = mk({
      name: 'Order Test Show',
      date: '2099-05-05',
      address: '1 Wall St',
      website: 'https://example.com/a',
    });
    const b = mk({
      name: 'Order Test Show',
      date: '2099-05-05',
      address: '1 Wall St',
      website: 'https://example.com/a',
    });
    const out = removeDuplicates([a, b]);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].id, a.id);
  });
});
