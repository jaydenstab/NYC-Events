const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const fs = require('fs');
const { randomUUID } = require('crypto');
const path = require('path');
const eventRoutes = require('./routes/eventRoutes');
const ingestStatusRoutes = require('./routes/ingestStatusRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const ogRoutes = require('./routes/ogRoutes');
const jobQueue = require('./services/jobQueue');
const nerService = require('./services/nerService');
const dbService = require('./services/dbService');
const vectorService = require('./services/vectorService');
const browserService = require('./services/browserService');
const aiOrchestrator = require('./services/aiOrchestrator');
const readiness = require('./services/readiness');
const metrics = require('./services/metrics');
const { validateEnv } = require('./config/validateEnv');
const { logger } = require('./logger');
const { globalErrorHandler } = require('./utils/errorUtils');
const { createCrawlerOgMiddleware } = require('./middleware/crawlerOgMeta');

dotenv.config();
validateEnv({ role: 'api' });

const app = express();
const PORT = process.env.PORT || 8000;
const SERVER_START_MS = Date.now();
let httpServer = null;

if (process.env.DEPRECATED_REALTIME_ENABLED === 'true' || process.env.REALTIME_EVENTS_ENABLED === 'true') {
  logger.warn('deprecated_realtime_enabled', {
    message: 'DEPRECATED: realtime path is scheduled for removal. Use GET /api/events after npm run ingest.',
  });
}

const CORS_ORIGINS = (process.env.CORS_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  req.id = randomUUID();
  const started = Date.now();

  res.on('finish', () => {
    const duration_ms = Date.now() - started;
    metrics.recordHttpRequest(req.method, req.path, res.statusCode);
    logger.info('http_request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms,
      semantic: req.query?.semantic === 'true',
      refresh: req.query?.refresh === 'true',
    });
  });

  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.mapbox.com'],
        connectSrc: ["'self'", 'https://api.mapbox.com', 'https://events.mapbox.com'],
      },
    },
  })
);
app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: false,
  })
);
app.use(express.json({ limit: '100kb' }));

app.use('/api/events', eventRoutes);
app.use('/api/events', ingestStatusRoutes);
app.use('/metrics', metricsRoutes);
app.use('/api/metrics', qualityRoutes);
app.use('/api/og', ogRoutes);

const frontendDistPath = path.join(__dirname, '../frontend/dist');
const indexHtmlPath = path.join(frontendDistPath, 'index.html');
const indexExists = fs.existsSync(indexHtmlPath);

app.get('/event/:id', (req, res) => {
  res.redirect(302, `/?event=${encodeURIComponent(req.params.id)}`);
});

if (indexExists) {
  app.use(createCrawlerOgMiddleware({ indexHtmlPath, dbService, fs }));
}

app.use(express.static(frontendDistPath));

const HEALTH_CACHE_TTL_MS = 5000;
let healthCache = { data: null, at: 0 };

async function getQueuePending() {
  if (!jobQueue.useBullMQ()) return 0;
  return (await jobQueue.hasPendingJob('scrape_all')) ? 1 : 0;
}

app.get('/api/health', async (req, res) => {
  const now = Date.now();
  const vectorModelReady = readiness.isVectorModelReady();
  const ready = readiness.isReady();

  try {
    await dbService.init();
    const lastIngestMetrics = await dbService.getLastIngestMetrics();
    const peekDegraded = lastIngestMetrics?.scraperHealth?.degradedSources ?? [];

    if (
      healthCache.data &&
      now - healthCache.at < HEALTH_CACHE_TTL_MS &&
      healthCache.data.status === 'OK' &&
      peekDegraded.length === 0
    ) {
      return res.json({
        ...healthCache.data,
        requestId: req.id,
        vectorModelReady,
        ready,
        semanticIndexReady:
          process.env.SEMANTIC_SEARCH_ENABLED === 'false'
            ? true
            : healthCache.data.semanticIndexReady,
        uptime_seconds: Math.floor((now - SERVER_START_MS) / 1000),
      });
    }

    const eventCount = await dbService.getEventCount();
    const lastScrapeMs = await dbService.getLastScrapeAt();
    const queuePending = await getQueuePending();
    metrics.setBullmqJobsActiveFromPending(queuePending > 0);
    const scraperHealth = lastIngestMetrics?.scraperHealth || null;
    const degradedSources = scraperHealth?.degradedSources || [];
    const scraperDegraded = degradedSources.length > 0;

    const poolStats =
      typeof dbService.getPoolStats === 'function' ? dbService.getPoolStats() : null;
    const poolWaiting = poolStats?.waitingCount ?? 0;
    metrics.setPgPoolWaiting(poolWaiting);

    const lastIngestAgeMinutes = lastIngestMetrics?.at
      ? Math.floor((now - Date.parse(lastIngestMetrics.at)) / 60000)
      : lastScrapeMs
        ? Math.floor((now - lastScrapeMs) / 60000)
        : null;

    const semanticReady =
      process.env.SEMANTIC_SEARCH_ENABLED === 'false' ? true : await vectorService.isIndexReady();

    const body = {
      ok: true,
      status: scraperDegraded ? 'DEGRADED' : 'OK',
      db: 'ok',
      eventCount,
      lastScrapeAt: lastScrapeMs ? new Date(lastScrapeMs).toISOString() : null,
      lastIngestMetrics,
      lastIngestAgeMinutes,
      scraperHealth,
      degradedSources,
      semanticIndexReady: semanticReady,
      semanticIndexing: vectorService.isIndexing(),
      vectorModelReady,
      ready,
      queuePending,
      ingesting: queuePending > 0,
      pg_pool_waiting: poolWaiting,
      uptime_seconds: Math.floor((now - SERVER_START_MS) / 1000),
      bullmq: jobQueue.useBullMQ(),
    };
    if (!scraperDegraded) {
      healthCache = { data: body, at: now };
    }
    res.json({ ...body, requestId: req.id });
  } catch (err) {
    logger.error('health_check_failed', { message: err.message });
    res.status(503).json({
      ok: false,
      requestId: req.id,
      status: 'DEGRADED',
      db: 'error',
      message: err.message,
      vectorModelReady,
      ready: false,
    });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (indexExists) {
    res.sendFile(indexHtmlPath);
  } else {
    next();
  }
});

app.use(globalErrorHandler);

async function shutdown(signal) {
  logger.info('server_shutdown', { signal });
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  try {
    await browserService.closeBrowser();
  } catch (err) {
    logger.warn('shutdown_browser_failed', { message: err.message });
  }
  try {
    await aiOrchestrator.terminate();
  } catch (err) {
    logger.warn('shutdown_ai_failed', { message: err.message });
  }
  try {
    await jobQueue.closeWorker();
  } catch (err) {
    logger.warn('shutdown_queue_failed', { message: err.message });
  }
  try {
    const { getDatabase } = require('./services/db');
    const db = getDatabase();
    if (typeof db.close === 'function') await db.close();
  } catch (err) {
    logger.warn('shutdown_db_failed', { message: err.message });
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function warmupServices() {
  try {
    await nerService.init();
  } catch (err) {
    logger.warn('ner_init_failed_startup', { message: err.message });
  }

  if (readiness.isSemanticEnabled()) {
    try {
      await vectorService.warmup();
      readiness.setVectorModelReady(true);
      logger.info('vector_model_warmup_done');
    } catch (err) {
      readiness.setVectorModelReady(false);
      logger.warn('vector_model_warmup_failed', { message: err.message });
    }
  } else {
    readiness.setVectorModelReady(true);
  }

  metrics.setVectorModelReady(readiness.isVectorModelReady());

  if (!jobQueue.useBullMQ()) {
    logger.warn('redis_unavailable_background_jobs_disabled', {
      message: 'Set REDIS_URL for background scrape jobs; use SYNC_INGEST=true only in development',
    });
  } else {
    logger.info('queue_bullmq_mode', { message: 'Run backend/worker.js for job processing' });
  }
}

async function startServer() {
  await warmupServices();
  await dbService.init();

  httpServer = app.listen(PORT, () => {
    logger.info('server_listen', { port: PORT, env: process.env.NODE_ENV || 'development' });
  });

  if (process.env.NODE_ENV !== 'production' && process.env.SYNC_INGEST !== 'false') {
    try {
      const count = await dbService.getEventCount();
      if (count === 0) {
        logger.info('auto_ingest_empty_db');
        const eventService = require('./services/eventService');
        eventService._runIngest({ includeReddit: false }).catch((err) => {
          logger.warn('auto_ingest_failed', { message: err.message });
        });
      }
    } catch (err) {
      logger.warn('auto_ingest_check_failed', { message: err.message });
    }
  }
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('server_start_failed', { message: err.message });
    process.exit(1);
  });
}

module.exports = app;
