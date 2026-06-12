const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  computeZeroStreak,
  updateSourceHistory,
  evaluateScraperHealth,
  applyIngestToHistory,
  checkSkintStructure,
  checkOmrStructure,
  validateEventContent,
} = require('../utils/scraperHealth');

describe('scraperHealth', () => {
  it('computeZeroStreak counts trailing zeros only', () => {
    assert.strictEqual(computeZeroStreak([10, 0, 0, 0]), 3);
    assert.strictEqual(computeZeroStreak([0, 0, 5]), 0);
    assert.strictEqual(computeZeroStreak([]), 0);
  });

  it('updateSourceHistory caps lastCounts and sets lastOutcome', () => {
    let entry = updateSourceHistory(null, { count: 10, at: 't1', failed: false, historyLimit: 3 });
    entry = updateSourceHistory(entry, { count: 0, at: 't2', failed: false, historyLimit: 3 });
    entry = updateSourceHistory(entry, { count: 0, at: 't3', failed: true, error: 'boom', historyLimit: 3 });
    assert.deepStrictEqual(entry.lastCounts, [10, 0, 0]);
    assert.strictEqual(entry.lastOutcome, 'scrape_failed');
    assert.strictEqual(entry.lastError, 'boom');
  });

  it('evaluateScraperHealth marks degraded after threshold streak', () => {
    const history = {
      the_skint: {
        lastCounts: [0, 0, 0],
        lastAt: 't',
        lastOutcome: 'empty',
      },
    };
    const health = evaluateScraperHealth(history, {
      participatedSources: ['the_skint'],
      threshold: 3,
    });
    assert.deepStrictEqual(health.degradedSources, ['the_skint']);
    assert.strictEqual(health.sourceStatus.the_skint.streak, 3);
  });

  it('applyIngestToHistory does not degrade on first zero ingest', () => {
    const { history, scraperHealth } = applyIngestToHistory(
      {},
      [{ name: 'the_skint', count: 0, failed: false }],
      { threshold: 3, historyLimit: 5 }
    );
    assert.strictEqual(scraperHealth.degradedSources.length, 0);
    assert.strictEqual(history.the_skint.lastCounts.length, 1);
  });

  it('applyIngestToHistory degrades after three zero ingests', () => {
    let history = {};
    for (let i = 0; i < 3; i++) {
      const result = applyIngestToHistory(
        history,
        [{ name: 'eventbrite', count: 0, failed: false }],
        { threshold: 3 }
      );
      history = result.history;
      if (i < 2) assert.strictEqual(result.scraperHealth.degradedSources.length, 0);
      else assert.deepStrictEqual(result.scraperHealth.degradedSources, ['eventbrite']);
    }
  });

  it('checkSkintStructure fails on low bullets or empty parse', () => {
    assert.strictEqual(checkSkintStructure({ bulletCount: 2, parsedLength: 5, rawTextLength: 100 }).ok, false);
    assert.strictEqual(
      checkSkintStructure({ bulletCount: 10, parsedLength: 0, rawTextLength: 600 }).ok,
      false
    );
    assert.strictEqual(checkSkintStructure({ bulletCount: 5, parsedLength: 3, rawTextLength: 100 }).ok, true);
  });

  it('checkOmrStructure fails on zero count', () => {
    assert.strictEqual(checkOmrStructure({ count: 0 }).ok, false);
    assert.strictEqual(checkOmrStructure({ count: 5 }).ok, true);
  });

  describe('validateEventContent', () => {
    it('returns valid for a good event list', () => {
      const events = [{ name: 'Cool Show', date: '2026-07-20T19:00:00' }];
      const result = validateEventContent(events);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.issues.length, 0);
    });

    it('flags events with missing names', () => {
      const events = [{ name: ' ', date: '2026-07-20T19:00:00' }];
      const result = validateEventContent(events);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.issues[0].error, 'missing_or_short_name');
    });

    it('flags events with invalid dates', () => {
      const events = [{ name: 'Cool Show', date: 'not a date' }];
      const result = validateEventContent(events);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.issues[0].error, 'invalid_date');
    });

    it('returns a correct error rate', () => {
      const events = [
        { name: 'Good Event', date: '2026-07-20T19:00:00' },
        { name: 'Bad Event', date: 'not a date' },
      ];
      const result = validateEventContent(events);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errorRate, 0.5);
    });
  });
});
