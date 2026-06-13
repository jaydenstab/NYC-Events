const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  summarizeSearchBenchmark,
  precisionAtK,
} = require('../benchmarks/lib/metrics');

describe('search benchmark metrics', () => {
  it('returns null metrics when no evaluations', () => {
    const summary = summarizeSearchBenchmark([]);
    assert.equal(summary.count, 0);
    assert.equal(summary.precisionAt5, null);
    assert.equal(summary.mrr, null);
  });

  it('computes precision@5', () => {
    const p = precisionAtK(['a', 'b'], ['x', 'a', 'b', 'c', 'd'], 5);
    assert.equal(p, 0.4);
  });

  it('summarizes labeled queries', () => {
    const summary = summarizeSearchBenchmark([
      { relevantIds: ['a'], rankedIds: ['a', 'b'] },
      { relevantIds: ['c'], rankedIds: ['x', 'c'] },
    ]);
    assert.equal(summary.count, 2);
    assert.ok(summary.precisionAt5 > 0);
  });
});
