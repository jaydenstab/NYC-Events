const { describe, it } = require('node:test');
const assert = require('node:assert');
const vectorService = require('../services/vectorService');

describe('vectorService.reciprocalRankFusion', () => {
  it('merges ranked lists with higher score for items in both', () => {
    const semantic = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const bm25 = [
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ];
    const fused = vectorService.reciprocalRankFusion([semantic, bm25], 60);
    assert.strictEqual(fused[0].id, 'b');
    assert.ok(fused[0].score > 0);
    assert.deepStrictEqual(
      fused.map((e) => e.id),
      ['b', 'a', 'c']
    );
  });

  it('returns empty for empty inputs', () => {
    assert.deepStrictEqual(vectorService.reciprocalRankFusion([]), []);
  });
});
