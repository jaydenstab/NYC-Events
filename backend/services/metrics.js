const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const ingestEventsSavedTotal = new client.Counter({
  name: 'ingest_events_saved_total',
  help: 'Events saved by ingest pipeline',
  registers: [register],
});

const ingestEventsFailedTotal = new client.Counter({
  name: 'ingest_events_failed_total',
  help: 'Events failed during ingest',
  labelNames: ['reason'],
  registers: [register],
});

const scrapeSourceEvents = new client.Gauge({
  name: 'scrape_source_events',
  help: 'Events scraped per source in last run',
  labelNames: ['source'],
  registers: [register],
});

const bullmqJobsActive = new client.Gauge({
  name: 'bullmq_jobs_active',
  help: 'Active BullMQ jobs (0 or 1 for scrape_all pending)',
  registers: [register],
});

const pgPoolWaiting = new client.Gauge({
  name: 'pg_pool_waiting',
  help: 'Postgres pool waiting connection count',
  registers: [register],
});

const vectorModelReadyGauge = new client.Gauge({
  name: 'vector_model_ready',
  help: '1 if embedding model is warmed up',
  registers: [register],
});

const dataQualityGeocodeRate = new client.Gauge({
  name: 'data_quality_geocode_rate',
  help: 'Share of events with non-default geocoded coordinates',
  registers: [register],
});

const dataQualityDateCompleteness = new client.Gauge({
  name: 'data_quality_date_completeness',
  help: 'Share of events with non-TBD dates',
  registers: [register],
});

const dataQualityEmbeddingCoverage = new client.Gauge({
  name: 'data_quality_embedding_coverage',
  help: 'Share of events with vector embeddings',
  registers: [register],
});

const aiQueueDepth = new client.Gauge({
  name: 'ai_task_queue_depth',
  help: 'Pending AI orchestrator tasks',
  registers: [register],
});

function normalizePath(path) {
  if (!path) return 'unknown';
  if (path === '/api/events' || path === '/api/events/') return '/api/events';
  if (path.startsWith('/api/events/')) {
    const segment = path.split('/')[3];
    if (segment === 'stream' || segment === 'status') return `/api/events/${segment}`;
    return '/api/events/other';
  }
  if (path === '/api/health') return '/api/health';
  if (path === '/metrics') return '/metrics';
  return path.split('?')[0].slice(0, 64);
}

function recordHttpRequest(method, path, status) {
  httpRequestsTotal.inc({
    method: method || 'GET',
    path: normalizePath(path),
    status: String(status || 0),
  });
}

function recordIngestSaved(count = 1) {
  ingestEventsSavedTotal.inc(count);
}

function recordIngestFailed(reason = 'unknown', count = 1) {
  const safeReason = String(reason || 'unknown').slice(0, 40);
  ingestEventsFailedTotal.inc({ reason: safeReason }, count);
}

function setScrapeSourceCount(source, count) {
  scrapeSourceEvents.set({ source: source || 'unknown' }, count);
}

function setBullmqJobsActive(count) {
  bullmqJobsActive.set(count);
}

function setPgPoolWaiting(count) {
  pgPoolWaiting.set(count);
}

function setVectorModelReady(ready) {
  vectorModelReadyGauge.set(ready ? 1 : 0);
}

function setDataQualityGauges(quality) {
  if (!quality) return;
  dataQualityGeocodeRate.set(quality.geocodeSuccessRate ?? 0);
  dataQualityDateCompleteness.set(quality.dateCompleteness ?? 0);
  if (quality.embeddingCoverage != null) {
    dataQualityEmbeddingCoverage.set(quality.embeddingCoverage);
  }
}

function setBullmqJobsActiveFromPending(hasPending) {
  bullmqJobsActive.set(hasPending ? 1 : 0);
}

function setAiQueueDepth(depth) {
  aiQueueDepth.set(depth);
}

async function getMetricsText() {
  return register.metrics();
}

module.exports = {
  register,
  recordHttpRequest,
  recordIngestSaved,
  recordIngestFailed,
  setScrapeSourceCount,
  setBullmqJobsActive,
  setBullmqJobsActiveFromPending,
  setPgPoolWaiting,
  setVectorModelReady,
  setDataQualityGauges,
  setAiQueueDepth,
  getMetricsText,
};
