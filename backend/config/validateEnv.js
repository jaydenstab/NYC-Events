const { logger } = require('../logger');

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function shouldSkipValidation() {
  return (
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_DB_PATH)
  );
}

function hasApiKeysConfigured() {
  const raw =
    process.env.API_KEYS ||
    process.env.INGEST_API_KEY ||
    process.env.READ_API_KEY ||
    process.env.ADMIN_API_KEY ||
    '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean).length > 0;
}

/**
 * @param {{ role?: 'api' | 'worker' }} [options]
 */
function validateEnv(options = {}) {
  const role = options.role || 'api';
  if (shouldSkipValidation()) return;

  const errors = [];

  if (isProduction()) {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
    if (role === 'worker' && !process.env.REDIS_URL) {
      errors.push('REDIS_URL is required for the worker in production');
    }
    if (role === 'api' && !process.env.REDIS_URL) {
      logger.warn('env_redis_missing_api', {
        message: 'REDIS_URL not set on API; background jobs disabled unless SYNC_INGEST=true',
      });
    }
    if (!hasApiKeysConfigured()) {
      errors.push('API_KEYS (or INGEST_API_KEY / READ_API_KEY) is required in production');
    }
    if (process.env.SYNC_INGEST === 'true') {
      errors.push('SYNC_INGEST=true is forbidden in production');
    }
    if (process.env.SKIP_GEOCODE !== 'true' && !process.env.MAPBOX_ACCESS_TOKEN) {
      errors.push('MAPBOX_ACCESS_TOKEN is required when SKIP_GEOCODE is not true');
    }
  } else {
    if (!hasApiKeysConfigured()) {
      logger.warn('env_api_keys_missing', {
        message: 'API_KEYS not set; /api/events routes are open in development',
      });
    }
    if (role === 'worker' && !process.env.REDIS_URL) {
      logger.warn('env_redis_missing_worker', { message: 'REDIS_URL not set; worker will exit' });
    }
  }

  if (errors.length > 0) {
    for (const message of errors) {
      logger.error('env_validation_failed', { message, role });
    }
    process.exit(1);
  }
}

module.exports = { validateEnv, shouldSkipValidation, hasApiKeysConfigured };
