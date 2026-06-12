#!/usr/bin/env node
/**
 * Post-ingest smoke checks (run after npm run ingest or manual refresh).
 * Usage: node scripts/smoke-ingest.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbService = require('../services/dbService');
const { isNavJunkTitle } = require('../utils/blocklist');
const { logger } = require('../logger');

const MIN_EVENTS = parseInt(process.env.SMOKE_MIN_EVENTS, 10) || 35;
const MIN_COMPLETE_RATIO = parseFloat(process.env.SMOKE_MIN_COMPLETE_RATIO || '0.7');
const PRIMARY_SOURCES = ['the_skint', 'oh_my_rockness'];

async function main() {
  await dbService.init();
  const events = await dbService.getAllEvents();
  const count = events.length;

  if (count < MIN_EVENTS) {
    logger.error('smoke_ingest_failed', { reason: 'low_count', count, min: MIN_EVENTS });
    process.exit(1);
  }

  const primaryEvents = events.filter((e) => PRIMARY_SOURCES.includes(e.source));
  const withDateOrTime = primaryEvents.filter(
    (e) => (e.date && e.date !== 'TBD') || (e.startTime && e.startTime !== 'TBD')
  );
  const primaryCount = primaryEvents.length;
  const completeRatio = primaryCount > 0 ? withDateOrTime.length / primaryCount : 0;
  if (primaryCount < 10) {
    logger.error('smoke_ingest_failed', {
      reason: 'low_primary_source_count',
      primaryCount,
      min: 10,
    });
    process.exit(1);
  }
  if (completeRatio < MIN_COMPLETE_RATIO) {
    logger.error('smoke_ingest_failed', {
      reason: 'low_date_time_coverage',
      completeRatio,
      minRatio: MIN_COMPLETE_RATIO,
      withDateOrTime: withDateOrTime.length,
      primaryCount,
      count,
    });
    process.exit(1);
  }

  const junk = events.filter((e) => isNavJunkTitle(e.name));
  if (junk.length > 0) {
    logger.error('smoke_ingest_failed', {
      reason: 'nav_junk_titles',
      samples: junk.slice(0, 5).map((e) => e.name),
    });
    process.exit(1);
  }

  const missingId = events.filter((e) => !e.id);
  if (missingId.length > 0) {
    logger.error('smoke_ingest_failed', { reason: 'missing_id', count: missingId.length });
    process.exit(1);
  }

  const meta = await dbService.getLastIngestMetrics();
  if (meta && typeof meta === 'object') {
    if (meta.funnel) {
      logger.info('smoke_funnel', meta.funnel);
    }
    const counts = meta.sourceCounts || {};
    const coreSources = ['the_skint', 'oh_my_rockness', 'eventbrite'];
    const hasCoreSource = coreSources.some((s) => (counts[s] || 0) > 0);
    if (!hasCoreSource) {
      logger.error('smoke_ingest_failed', {
        reason: 'no_core_source_events',
        sourceCounts: counts,
      });
      process.exit(1);
    }

    const degraded = meta.scraperHealth?.degradedSources || [];
    if (degraded.length > 0) {
      logger.error('smoke_ingest_failed', {
        reason: 'scraper_degraded',
        degradedSources: degraded,
        sourceStatus: meta.scraperHealth?.sourceStatus,
      });
      process.exit(1);
    }
  }

  logger.info('smoke_ingest_ok', {
    eventCount: count,
    completeRatio: Math.round(completeRatio * 100) / 100,
  });
  process.exit(0);
}

main().catch((err) => {
  logger.error('smoke_ingest_error', { message: err.message });
  process.exit(1);
});
