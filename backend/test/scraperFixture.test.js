const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { parseLines } = require('../utils/skintParse');
const EventbriteScraper = require('../eventbriteScraper');
const skintConfig = require('../configs/theSkint.config');

const fixturesDir = path.join(__dirname, 'fixtures');
const REF_DATE = new Date('2026-05-22T12:00:00Z');

function loadFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

function parseSkintFixtureHtml(html) {
  const $ = cheerio.load(html);
  const articles = $(skintConfig.articleSelector).slice(0, 7);
  const events = [];
  articles.each((_, article) => {
    const $article = $(article);
    const title = $article.find(skintConfig.titleSelector).first().text() || '';
    const headers = $article
      .find(skintConfig.headerSelector)
      .map((__, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 5 && t.length < 50);
    const innerText = $article.text();
    const combinedText = [title, ...headers, innerText].join('\n');
    events.push(...parseLines(combinedText, REF_DATE));
  });
  return events;
}

function parseOmrFixtureHtml(html, showUrl) {
  const $ = cheerio.load(html);
  const title = $('title').text() || '';
  const venueAddress = $('.venue-address, [itemprop="address"], address').first().text().trim();
  const h1Match = title.match(/^(.+?) @ (.+?) in NYC on (\d{2}\/\d{2}\/\d{4})/i);
  const ticketLink =
    $('a[href*="ticket"], a[href*="dice.fm"], a[href*="eventbrite"]').first().attr('href') ||
    showUrl;

  return {
    name: h1Match ? h1Match[1].trim() : '',
    venue: h1Match ? h1Match[2].trim() : '',
    venueAddress,
    date: h1Match ? h1Match[3] : 'TBD',
    url: ticketLink,
  };
}

describe('scraper HTML fixtures', () => {
  it('parses Skint fixture into events with name and date', () => {
    const html = loadFixture('skint-sample.html');
    const events = parseSkintFixtureHtml(html);
    assert.ok(events.length >= 2, `expected >= 2 events, got ${events.length}`);
    for (const event of events) {
      assert.ok(event.name && event.name.length >= 3);
      assert.ok(event.date);
    }
    const withLink = events.find((e) => e.website?.includes('http'));
    assert.ok(withLink, 'expected at least one event with outbound link');
  });

  it('parses Eventbrite fixture with name, date, and website', () => {
    const scraper = new EventbriteScraper();
    const events = scraper._parseHtml(loadFixture('eventbrite-listing.html'));
    assert.ok(events.length >= 1, `expected >= 1 events, got ${events.length}`);
    const sample = events[0];
    assert.ok(sample.name && sample.name.length >= 5);
    assert.ok(sample.website?.includes('eventbrite.com'));
    assert.ok(sample.date);
  });

  it('parses Eventbrite detail fixture via JSON-LD @graph', () => {
    const cheerio = require('cheerio');
    const { parseJsonLd } = require('../utils/jsonLdParser');
    const html = loadFixture('eventbrite-detail-paint-shop.html');
    const $ = cheerio.load(html);
    const events = parseJsonLd($, 'eventbrite');
    assert.ok(events.length >= 1);
    const ev = events[0];
    assert.strictEqual(ev.name, 'FREE PAINT AND SHOP');
    assert.strictEqual(ev.date, '2026-06-06');
    assert.ok(ev.address.includes('839 Broadway'));
    assert.strictEqual(ev.price, 'Free');
    assert.ok(ev.description.includes('paint for free'));
  });

  it('parses Eventbrite API response fixture', () => {
    const scraper = new EventbriteScraper();
    const json = JSON.parse(loadFixture('eventbrite-api-response.json'));
    const events = scraper._parseApiResponse(json);
    assert.ok(events.length >= 2);
    const paintShop = events.find((e) => e.name === 'FREE PAINT AND SHOP');
    assert.ok(paintShop);
    assert.strictEqual(paintShop.date, '2026-06-06');
    assert.ok(paintShop.address.includes('839 Broadway'));
    assert.strictEqual(paintShop.price, 'Free');
  });

  it('parses OMR detail fixture with street address and ticket URL', () => {
    const show = parseOmrFixtureHtml(
      loadFixture('omr-detail.html'),
      'https://www.ohmyrockness.com/shows/123-indie-rock-night'
    );
    assert.ok(show.name.toLowerCase().includes('indie rock'));
    assert.ok(show.venueAddress.includes('Houston St'));
    assert.ok(show.url.includes('dice.fm'));
    assert.match(show.date, /^\d{2}\/\d{2}\/\d{4}$/);
  });
});
