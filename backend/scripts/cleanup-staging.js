#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbService = require('../services/dbService');
const { STAGING_RETENTION_DAYS } = require('../configs/constants');
const { logger } = require('../logger');

async function main() {
  await dbService.init();
  const removed = await dbService.cleanupStaleStaging(STAGING_RETENTION_DAYS);
  logger.info('staging_cleanup_done', { removed, retentionDays: STAGING_RETENTION_DAYS });
}

main().catch((err) => {
  logger.error('staging_cleanup_failed', { message: err.message });
  process.exit(1);
});
