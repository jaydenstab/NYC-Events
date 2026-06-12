#!/usr/bin/env node
/**
 * Background ingest: scrape → normalize → geocode → persist → vector index.
 * Run via cron: npm run ingest --prefix backend
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const eventService = require('../services/eventService');
const { logger } = require('../logger');

async function main() {
  const includeReddit = process.argv.includes('--reddit');
  logger.info('ingest_script_start', { includeReddit });

  const events = await eventService._runIngest({ includeReddit });
  logger.info('ingest_script_done', { count: events.length });
  process.exit(0);
}

main().catch((err) => {
  logger.error('ingest_script_failed', { message: err.message });
  process.exit(1);
});
