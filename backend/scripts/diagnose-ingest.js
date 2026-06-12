#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { logger } = require('../logger');

async function runDiagnostic() {
  const service = require('../services/eventService');
  logger.info('diagnose_ingest_start');

  const events = await service._fetchAndNormalizeAggregated({ includeReddit: false });

  logger.info('diagnose_ingest_done', { count: events.length });
  console.log(
    `Ingest fetch complete: ${events.length} events fetched (persisted via pipeline). Check logs for funnel metrics.`
  );
}

runDiagnostic()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
