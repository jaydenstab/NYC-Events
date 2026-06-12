const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseParksDateTime, formatParksAddress } = require('../utils/nycParksNormalize');
const { isValidEvent } = require('../utils/eventValidator');
const { normalizeEvent } = require('../utils/eventNormalize');

describe('nycParksNormalize', () => {
  it('parses Saturday May 24 2026 with 10:00 AM', () => {
    const ref = new Date('2026-05-01T12:00:00Z');
    const { date, startTime } = parseParksDateTime(
      'Saturday, May 24, 2026',
      '10:00 AM',
      ref
    );
    assert.strictEqual(date, '2026-05-24');
    assert.match(startTime, /10:00/i);
  });

  it('produces a valid normalized nyc_parks event', () => {
    const ref = new Date('2026-05-01T12:00:00Z');
    const { date, startTime } = parseParksDateTime(
      'Saturday, June 14, 2026',
      '10:00 AM',
      ref
    );
    const event = normalizeEvent('nyc_parks', {
      name: 'Park Walk',
      description: 'NYC Parks event: Park Walk',
      address: formatParksAddress('Central Park'),
      startTime,
      date,
      price: 'Free',
      category: 'Outdoor',
      website: 'https://www.nycgovparks.org/events',
    });
    assert.strictEqual(isValidEvent(event), true);
    assert.notStrictEqual(event.startTime, '');
  });
});
