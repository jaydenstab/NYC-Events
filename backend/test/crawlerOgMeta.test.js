const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isCrawler, getPublicSiteUrl } = require('../middleware/crawlerOgMeta');

describe('crawlerOgMeta', () => {
  it('detects social crawlers', () => {
    assert.equal(isCrawler('Twitterbot/1.0'), true);
    assert.equal(isCrawler('Mozilla/5.0 Chrome'), false);
  });

  it('uses PUBLIC_SITE_URL when set', () => {
    const prev = process.env.PUBLIC_SITE_URL;
    process.env.PUBLIC_SITE_URL = 'https://app.example.com';
    const url = getPublicSiteUrl({
      get: (h) => (h === 'host' ? 'localhost:8000' : null),
      protocol: 'http',
    });
    assert.equal(url, 'https://app.example.com');
    process.env.PUBLIC_SITE_URL = prev;
  });
});
