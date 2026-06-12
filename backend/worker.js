#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { logger } = require('./logger');
const { validateEnv } = require('./config/validateEnv');
const jobQueue = require('./services/jobQueue');
const { registerBullMQHandlers } = require('./services/workerHandlers');
const dbService = require('./services/dbService');
const browserService = require('./services/browserService');
const { STAGING_RETENTION_DAYS } = require('./configs/constants');

validateEnv({ role: 'worker' });

async function main() {
  logger.info('worker_start', {
    bullmq: jobQueue.useBullMQ(),
    database: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
  });

  if (!jobQueue.useBullMQ()) {
    logger.error('worker_redis_required', {
      message: 'REDIS_URL is required for the worker. Background jobs are disabled without Redis.',
    });
    process.exit(1);
  }

  await dbService.init();
  if (typeof dbService.cleanupStaleStaging === 'function') {
    const removed = await dbService.cleanupStaleStaging(STAGING_RETENTION_DAYS);
    if (removed > 0) {
      logger.info('staging_cleanup_on_start', { removed });
    }
  }
  await registerBullMQHandlers();
}

async function shutdown(signal) {
  logger.info('worker_shutdown', { signal });
  try {
    await browserService.closeBrowser();
  } catch (err) {
    logger.warn('worker_shutdown_browser_failed', { message: err.message });
  }
  try {
    await jobQueue.closeWorker();
  } catch (err) {
    logger.warn('worker_shutdown_queue_failed', { message: err.message });
  }
  try {
    const { getDatabase } = require('./services/db');
    const db = getDatabase();
    if (typeof db.close === 'function') await db.close();
  } catch (err) {
    logger.warn('worker_shutdown_db_failed', { message: err.message });
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((err) => {
  logger.error('worker_failed', { message: err.message });
  process.exit(1);
});
