#!/usr/bin/env node
/**
 * Smoke-test a single scraper source.
 * Usage: node scripts/smoke-scraper.js --source=nyc_parks
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { fetchSource } = require('../services/scraperRegistry');
const { logger } = require('../logger');

const OPT_IN_SOURCES = ['nyc_parks', 'nyc_go', 'union_square'];
const MIN_EVENTS = parseInt(process.env.SMOKE_SCRAPER_MIN_EVENTS, 10) || 1;

function parseSourceArg() {
  const arg = process.argv.find((a) => a.startsWith('--source='));
  if (!arg) {
    console.error('Usage: node scripts/smoke-scraper.js --source=nyc_parks|nyc_go|union_square');
    process.exit(1);
  }
  return arg.split('=')[1];
}

async function main() {
  const source = parseSourceArg();
  if (!OPT_IN_SOURCES.includes(source)) {
    console.error(`Unknown opt-in source: ${source}. Allowed: ${OPT_IN_SOURCES.join(', ')}`);
    process.exit(1);
  }

  logger.info('smoke_scraper_start', { source });
  const events = await fetchSource(source);
  const count = Array.isArray(events) ? events.length : 0;

  if (count < MIN_EVENTS) {
    logger.error('smoke_scraper_failed', { source, count, min: MIN_EVENTS });
    process.exit(1);
  }

  const withName = events.filter((e) => e.name && e.name.length > 2);
  if (withName.length < MIN_EVENTS) {
    logger.error('smoke_scraper_failed', {
      source,
      reason: 'missing_names',
      withName: withName.length,
      min: MIN_EVENTS,
    });
    process.exit(1);
  }

  logger.info('smoke_scraper_ok', { source, count, sample: withName[0]?.name });
  process.exit(0);
}

main().catch((err) => {
  logger.error('smoke_scraper_error', { message: err.message });
  process.exit(1);
});
