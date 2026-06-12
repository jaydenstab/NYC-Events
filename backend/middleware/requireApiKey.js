const crypto = require('crypto');
const { logger } = require('../logger');
const { AppError } = require('../utils/AppError');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseApiKeys() {
  const parts = [
    process.env.API_KEYS,
    process.env.INGEST_API_KEY,
    process.env.READ_API_KEY,
    process.env.ADMIN_API_KEY,
  ]
    .filter(Boolean)
    .join(',');

  const unique = new Set();
  for (const key of parts.split(',')) {
    const trimmed = key.trim();
    if (trimmed) unique.add(trimmed);
  }
  return [...unique];
}

function extractApiKey(req, { allowQuery = false } = {}) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const headerKey = req.headers['x-api-key'] || bearer || '';
  if (headerKey) return { key: headerKey, viaQuery: false };

  if (allowQuery && req.query?.api_key) {
    return { key: String(req.query.api_key), viaQuery: true };
  }
  return { key: '', viaQuery: false };
}

function isStreamRoute(req) {
  const urlPath = (req.originalUrl || req.url || '').split('?')[0] || '';
  const mounted = `${req.baseUrl || ''}${req.path || ''}`;
  return (
    req.path === '/stream' ||
    req.path.endsWith('/stream') ||
    urlPath.endsWith('/stream') ||
    mounted.endsWith('/stream')
  );
}

function requireApiKey(req, res, next) {
  const keys = parseApiKeys();
  const allowQuery = isStreamRoute(req);
  const { key: apiKey, viaQuery } = extractApiKey(req, { allowQuery });

  if (keys.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      return next(
        new AppError('API key not configured', 500, 'SERVER_MISCONFIGURED')
      );
    }
    return next();
  }

  const keyIndex = keys.findIndex((expected) => safeCompare(apiKey, expected));
  if (keyIndex < 0) {
    return next(new AppError('Valid API key required', 401, 'UNAUTHORIZED'));
  }

  logger.info('api_key_accepted', { keyIndex, auth_via_query: viaQuery });
  return next();
}

/** @deprecated use requireApiKey — refresh uses same keys */
function requireIngestApiKey(req, res, next) {
  return requireApiKey(req, res, next);
}

function requireMetricsAuth(req, res, next) {
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken) {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.headers['x-metrics-token'] || '';
    if (safeCompare(token, metricsToken)) return next();
    return next(new AppError('Invalid metrics token', 401, 'UNAUTHORIZED'));
  }
  return requireApiKey(req, res, next);
}

module.exports = {
  requireApiKey,
  requireIngestApiKey,
  requireMetricsAuth,
  parseApiKeys,
  extractApiKey,
  isStreamRoute,
};
