const { describe, it } = require('node:test');
const assert = require('node:assert');

process.env.SKIP_EVENT_VALIDATION = 'false';
process.env.SKIP_GEOCODE = 'true';
const fs = require('fs');
const path = require('path');

const { validateEvents } = require('../utils/eventValidator');
const { normalizeEventForValidation } = require('../utils/categoryNormalize');

const fixturesDir = path.join(__dirname, 'fixtures');
const valid = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'valid-events.json'), 'utf8')
);
const invalid = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'invalid-events.json'), 'utf8')
);

describe('validation integration (validation enabled)', () => {
  it('accepts fixture events that match production shape', () => {
    const normalized = valid.map(normalizeEventForValidation);
    const out = validateEvents(normalized);
    assert.strictEqual(out.length, valid.length);
  });

  it('rejects low-quality fixture events', () => {
    const normalized = invalid.map(normalizeEventForValidation);
    const out = validateEvents(normalized);
    assert.strictEqual(out.length, 0);
  });

  it('accepts legitimate titles that mention heritage or outdoor', () => {
    const { isValidEvent } = require('../utils/eventValidator');
    const samples = [
      {
        name: 'AAPI Heritage Celebration Night Market',
        address: '40th Street, Sunnyside, New York, NY',
        date: '2099-06-01',
        startTime: '4:00 PM',
        category: 'Community',
      },
      {
        name: 'Outdoor Jazz at Bryant Park',
        address: 'Bryant Park, New York, NY',
        date: '2099-07-04',
        startTime: '7:00 PM',
        category: 'Music',
      },
    ];
    for (const event of samples) {
      assert.strictEqual(isValidEvent(normalizeEventForValidation(event)), true, event.name);
    }
  });
});
