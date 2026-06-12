const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseLines, filterFutureEvents } = require('../utils/skintParse');

const fixturePath = path.join(__dirname, 'fixtures', 'skint-sample.txt');
const sampleText = fs.readFileSync(fixturePath, 'utf8');

// Reference date: May 22, 2026 (matches fixture context)
const REF_DATE = new Date('2026-05-22T12:00:00Z');

describe('skintParse', () => {
  it('parses ► bullet lines from fixture', () => {
    const events = parseLines(sampleText, REF_DATE);
    assert.ok(events.length >= 5, `expected >= 5 events, got ${events.length}`);
  });

  it('extracts name, date, and ticket URL from night market line', () => {
    const events = parseLines(sampleText, REF_DATE);
    const nightMarket = events.find((e) =>
      e.name.toLowerCase().includes('sunnyside night market')
    );
    assert.ok(nightMarket, 'night market event not found');
    assert.ok(nightMarket.website?.includes('sunnysideshines.org'));
    assert.ok(nightMarket.address.toLowerCase().includes('sunnyside'));
    assert.notStrictEqual(nightMarket.date, 'TBD');
  });

  it('extracts free admission price from comedy show', () => {
    const events = parseLines(sampleText, REF_DATE);
    const comedy = events.find((e) => e.name.toLowerCase().includes('bitches brew'));
    assert.ok(comedy);
    assert.strictEqual(comedy.price, 'Free');
  });

  it('does not emit events from sponsored-only blocks without ►', () => {
    const text = 'sponsored post\n\nSome long sponsored prose about tickets.';
    const events = parseLines(text, REF_DATE);
    assert.strictEqual(events.length, 0);
  });

  it('infers Food & Drink category for market events', () => {
    const events = parseLines(sampleText, REF_DATE);
    const vintage = events.find((e) => e.name.toLowerCase().includes('vintage market'));
    assert.ok(vintage);
    assert.strictEqual(vintage.category, 'Food & Drink');
  });

  it('filterFutureEvents drops only clearly past dated events', () => {
    const events = parseLines(sampleText, REF_DATE);
    const future = filterFutureEvents(events, REF_DATE);
    assert.ok(future.length >= 5);
    assert.ok(future.some((e) => e.name.toLowerCase().includes('sunnyside')));
    assert.ok(!future.some((e) => e.date === '2026-05-16'));
  });
});
