const { describe, it } = require('node:test');
const assert = require('node:assert');
const scraperRegistry = require('../services/scraperRegistry');

describe('scraper contract', () => {
  it('registry exports fetch functions for core sources', () => {
    const required = [
      'fetchTheSkintEvents',
      'fetchOhMyRocknessEvents',
      'fetchEventbriteEvents',
    ];
    for (const fn of required) {
      assert.strictEqual(typeof scraperRegistry[fn], 'function', `${fn} missing`);
    }
  });

  it('getTargets returns array of { name, fetch }', () => {
    const targets = scraperRegistry.getTargets({ includeReddit: false });
    assert.ok(Array.isArray(targets));
    assert.ok(targets.length >= 3);
    for (const t of targets) {
      assert.ok(typeof t.name === 'string');
      assert.strictEqual(typeof t.fetch, 'function');
    }
  });
});
