const express = require('express');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const dbService = require('../services/dbService');
const jobQueue = require('../services/jobQueue');
const { requireApiKey } = require('../middleware/requireApiKey');
const { logger } = require('../logger');

const router = express.Router();

router.use(requireApiKey);

const SSE_MAX_CONNECTIONS = parseInt(process.env.SSE_MAX_CONNECTIONS, 10) || 20;
let activeConnections = 0;

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_SSE_PER_MIN, 10) || 5,
  standardHeaders: true,
  legacyHeaders: false,
});

async function getQueuePending() {
  if (!jobQueue.useBullMQ()) return 0;
  return (await jobQueue.hasPendingJob('scrape_all')) ? 1 : 0;
}

router.get('/status', streamLimiter, async (req, res) => {
  try {
    const eventCount = await dbService.getEventCount();
    const lastScrapeMs = await dbService.getLastScrapeAt();
    const queuePending = await getQueuePending();
    const lastIngestMetrics = await dbService.getLastIngestMetrics();

    res.json({
      ok: true,
      eventCount,
      lastScrapeAt: lastScrapeMs ? new Date(lastScrapeMs).toISOString() : null,
      ingesting: queuePending > 0,
      degradedSources: lastIngestMetrics?.scraperHealth?.degradedSources ?? [],
      deadLetter: lastIngestMetrics?.deadLetter ?? null,
      funnel: lastIngestMetrics?.funnel ?? null,
      at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('ingest_status_failed', { message: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/stream', streamLimiter, async (req, res) => {
  if (activeConnections >= SSE_MAX_CONNECTIONS) {
    return res.status(503).json({
      ok: false,
      error: 'TOO_MANY_CONNECTIONS',
      message: 'Too many SSE clients connected',
    });
  }

  activeConnections++;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendStatus = async () => {
    try {
      const eventCount = await dbService.getEventCount();
      const lastScrapeMs = await dbService.getLastScrapeAt();
      const queuePending = await getQueuePending();
      const lastIngestMetrics = await dbService.getLastIngestMetrics();
      const degradedSources = lastIngestMetrics?.scraperHealth?.degradedSources ?? [];
      const payload = {
        eventCount,
        lastScrapeAt: lastScrapeMs ? new Date(lastScrapeMs).toISOString() : null,
        ingesting: queuePending > 0,
        degradedSources,
        deadLetter: lastIngestMetrics?.deadLetter ?? null,
        at: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      logger.warn('sse_status_failed', { message: err.message });
    }
  };

  await sendStatus();
  const interval = setInterval(sendStatus, 15_000);

  let subscriber = null;
  if (process.env.REDIS_URL) {
    subscriber = new Redis(process.env.REDIS_URL);
    await subscriber.subscribe('ingest:status');
    subscriber.on('message', async () => {
      await sendStatus();
    });
  }

  req.on('close', () => {
    activeConnections = Math.max(0, activeConnections - 1);
    clearInterval(interval);
    if (subscriber) subscriber.quit();
  });
});

module.exports = router;
