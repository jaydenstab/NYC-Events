#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const cheerio = require('cheerio');
const browserService = require('../services/browserService');
const EventbriteScraper = require('../eventbriteScraper');
const { parseJsonLd } = require('../utils/jsonLdParser');

const URL =
  'https://www.eventbrite.com/e/free-paint-and-shop-tickets-1989710502675';

async function main() {
  const scraper = new EventbriteScraper();
  const apiEvents = [];

  await browserService.withPage(async (page) => {
    const onResponse = async (response) => {
      try {
        const u = response.url();
        const ct = response.headers()['content-type'] || '';
        if (!u.includes('/api/v3/') || !ct.includes('json')) return;
        const json = await response.json();
        apiEvents.push(...scraper._parseApiResponse(json));
        console.log('API hit:', u.slice(0, 100));
      } catch {
        // ignore
      }
    };
    page.on('response', onResponse);
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    page.off('response', onResponse);
    const html = await page.content();
    const $ = cheerio.load(html);
    const ld = parseJsonLd($, 'eventbrite');
    const dom = scraper._parseDetailDom($);
    console.log('\napiEvents:', apiEvents.length, apiEvents[0] || null);
    console.log('\njsonLd:', ld[0] || null);
    console.log('\ndom:', dom);
    console.log('\nbot blocked:', scraper._isBotBlocked(html));
    console.log('html len:', html.length);
  });

  await browserService.closeBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
