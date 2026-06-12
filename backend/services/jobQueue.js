const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { logger } = require('../logger');

const QUEUE_NAME = 'whatsupnyc';

let connection = null;
let queue = null;
let worker = null;

function getConnection() {
  if (!connection) {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}

function getQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  }
  return queue;
}

function useBullMQ() {
  return Boolean(process.env.REDIS_URL);
}

async function enqueue(type, payload = {}, options = {}) {
  const q = getQueue();
  if (!q) return false;
  await q.add(type, payload, {
    jobId: options.id,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: options.attempts || 3,
    backoff: { type: 'exponential', delay: 60_000 },
  });
  logger.info('bullmq_job_enqueued', { type });
  return true;
}

/**
 * Enqueue a background job or log when Redis is unavailable (no SQLite fallback).
 * @returns {Promise<boolean>}
 */
async function enqueueBackgroundJob(type, payload = {}, options = {}) {
  const ok = await enqueue(type, payload, options);
  if (!ok) {
    logger.warn('redis_unavailable_background_jobs_disabled', { type });
  }
  return ok;
}

async function hasPendingJob(type) {
  const q = getQueue();
  if (!q) return false;
  const jobs = await q.getJobs(['waiting', 'delayed', 'active'], 0, 50);
  return jobs.some((j) => j.name === type);
}

function startWorker(handlers, concurrency = 2) {
  if (!useBullMQ() || worker) return worker;
  const conn = getConnection();
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers.get(job.name);
      if (!handler) {
        throw new Error(`No handler for job type: ${job.name}`);
      }
      logger.info('bullmq_job_start', { id: job.id, type: job.name });
      await handler(job.data);
      logger.info('bullmq_job_done', { id: job.id, type: job.name });
    },
    {
      connection: conn,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY, 10) || concurrency,
      lockDuration: 600_000,
      maxStalledCount: 2,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('bullmq_job_failed', { id: job?.id, type: job?.name, message: err.message });
  });

  logger.info('bullmq_worker_started', { concurrency });
  return worker;
}

async function closeWorker(options = {}) {
  const timeoutMs =
    options.timeoutMs || parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT_MS, 10) || 120000;

  if (worker) {
    const closePromise = worker.close();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Worker shutdown timeout')), timeoutMs);
    });
    try {
      await Promise.race([closePromise, timeoutPromise]);
    } catch (err) {
      logger.warn('worker_shutdown_forced', { message: err.message, timeoutMs });
    }
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
}

module.exports = {
  useBullMQ,
  enqueue,
  enqueueBackgroundJob,
  hasPendingJob,
  startWorker,
  closeWorker,
  getQueue,
};
