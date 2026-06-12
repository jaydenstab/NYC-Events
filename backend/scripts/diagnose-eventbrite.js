#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const EventbriteScraper = require('../eventbriteScraper');

async function main() {
  const scraper = new EventbriteScraper();
  const events = await scraper.scrapeEvents();
  console.log('\n=== Eventbrite scrape result ===');
  console.log('count:', events.length);
  for (const e of events.slice(0, 8)) {
    console.log('---');
    console.log('name:', e.name);
    console.log('date:', e.date, 'time:', e.startTime);
    console.log('address:', e.address);
    console.log('method:', e.extractionMethod);
    console.log('website:', e.website?.slice(0, 80));
    console.log('desc:', (e.description || '').slice(0, 80));
  }
  const paint = events.find((e) => /paint and shop/i.test(e.name));
  if (paint) {
    console.log('\n=== FREE PAINT AND SHOP ===');
    console.log(JSON.stringify(paint, null, 2));
  } else {
    console.log('\nFREE PAINT AND SHOP not in results');
  }
  await require('../services/browserService').closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
