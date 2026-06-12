const { Pool } = require('pg');
const { logger } = require('../../logger');
const { rowToEvent } = require('../../utils/rowToEvent');
const { runMigrations } = require('./migrate');
const { PG_POOL_MAX } = require('../../configs/constants');

const META_LAST_SCRAPE = 'last_scrape_at';
const META_LAST_INGEST_METRICS = 'last_ingest_metrics';
const META_SCRAPER_SOURCE_HISTORY = 'scraper_source_history';

const EVENT_COLS = `
  id, name, description, address, "startTime", date, price, category,
  latitude, longitude, website, source, "locationQuality", "scrapedAt", "createdAt"
`;

class PostgresDatabase {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      max: PG_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    this.ready = false;
    this._poolMonitorStarted = false;

    this.pool.on('error', (err) => {
      logger.error('pg_pool_unexpected_error', { message: err.message });
    });
  }

  _startPoolMonitor() {
    if (this._poolMonitorStarted) return;
    this._poolMonitorStarted = true;
    setInterval(() => {
      const { totalCount, idleCount, waitingCount } = this.pool;
      if (waitingCount > 0) {
        logger.warn('pg_pool_pressure', { totalCount, idleCount, waitingCount });
      }
    }, 10_000).unref();
  }

  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  async init() {
    if (this.ready) return this.pool;
    logger.info('database_init_start', { driver: 'postgres' });
    await runMigrations(this.pool, { logger });
    this._startPoolMonitor();
    this.ready = true;
    logger.info('database_init_done', { driver: 'postgres' });
    return this.pool;
  }

  async close() {
    await this.pool.end();
    this.ready = false;
  }

  async getCachedLocation(address) {
    await this.init();
    const key = address.toLowerCase().trim();
    const { rows } = await this.pool.query('SELECT * FROM geocode_cache WHERE address = $1', [key]);
    return rows[0] || null;
  }

  async saveCachedLocation(address, coords) {
    await this.init();
    const key = address.toLowerCase().trim();
    await this.pool.query(
      `INSERT INTO geocode_cache (address, latitude, longitude, quality)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (address) DO UPDATE SET
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         quality = EXCLUDED.quality`,
      [key, coords.latitude, coords.longitude, coords.locationQuality]
    );
  }

  _eventInsertParams(event) {
    return [
      event.id,
      event.name,
      event.description,
      event.address,
      event.startTime,
      event.date,
      event.price,
      event.category,
      event.latitude,
      event.longitude,
      event.website,
      event.source,
      event.locationQuality || 'pending',
      event.scrapedAt || null,
      event.createdAt || new Date().toISOString(),
    ];
  }

  async saveEvents(events) {
    if (!events.length) return;
    await this.init();
    const client = await this.pool.connect();
    const upsertSuffix = `
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          address = EXCLUDED.address,
          "startTime" = EXCLUDED."startTime",
          date = EXCLUDED.date,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          website = EXCLUDED.website,
          source = EXCLUDED.source,
          "locationQuality" = EXCLUDED."locationQuality",
          "scrapedAt" = EXCLUDED."scrapedAt",
          "createdAt" = EXCLUDED."createdAt"`;
    const COLS_PER_ROW = 15;
    const CHUNK = 50;

    try {
      await client.query('BEGIN');
      for (let i = 0; i < events.length; i += CHUNK) {
        const batch = events.slice(i, i + CHUNK);
        const values = [];
        const params = [];
        batch.forEach((event, idx) => {
          const off = idx * COLS_PER_ROW;
          values.push(
            `(${Array.from({ length: COLS_PER_ROW }, (_, k) => `$${off + k + 1}`).join(',')})`
          );
          params.push(...this._eventInsertParams(event));
        });
        await client.query(
          `INSERT INTO events (${EVENT_COLS}) VALUES ${values.join(',')}${upsertSuffix}`,
          params
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async saveVector(eventId, vector) {
    await this.init();
    const json = JSON.stringify(vector);
    const vecLiteral = `[${vector.join(',')}]`;
    await this.pool.query(
      `INSERT INTO event_vectors (event_id, vector_json, embedding)
       VALUES ($1, $2, $3::vector)
       ON CONFLICT (event_id) DO UPDATE SET
         vector_json = EXCLUDED.vector_json,
         embedding = EXCLUDED.embedding`,
      [eventId, json, vecLiteral]
    );
  }

  async getAllEvents() {
    await this.init();
    const { rows } = await this.pool.query(`SELECT ${EVENT_COLS} FROM events ORDER BY date DESC`);
    return rows.map(rowToEvent).filter(Boolean);
  }

  async getEventsPaginated(limit = 50, offset = 0) {
    await this.init();
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const [{ rows }, countResult] = await Promise.all([
      this.pool.query(
        `SELECT ${EVENT_COLS} FROM events ORDER BY date DESC LIMIT $1 OFFSET $2`,
        [safeLimit, safeOffset]
      ),
      this.pool.query('SELECT COUNT(*)::int AS count FROM events'),
    ]);
    return {
      events: rows.map(rowToEvent).filter(Boolean),
      totalCount: countResult.rows[0]?.count ?? 0,
    };
  }

  async getEventCount() {
    await this.init();
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM events');
    return rows[0]?.count ?? 0;
  }

  async hasPendingJob(type) {
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT 1 FROM jobs WHERE type = $1 AND status = 'pending' LIMIT 1`,
      [type]
    );
    return rows.length > 0;
  }

  async getPendingJobCount() {
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM jobs WHERE status = 'pending'`
    );
    return rows[0]?.count ?? 0;
  }

  async getIndexedVectors() {
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT e.*, v.vector_json, v.embedding::text AS embedding_text
       FROM events e
       JOIN event_vectors v ON e.id = v.event_id`
    );
    return rows.map((row) => ({
      ...row,
      vector_json: row.vector_json,
    }));
  }

  async countEventVectors() {
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM event_vectors WHERE embedding IS NOT NULL`
    );
    return rows[0]?.count ?? 0;
  }

  async semanticSearch(queryVector, limit = 50) {
    await this.init();
    const vecLiteral = `[${queryVector.join(',')}]`;
    const { rows } = await this.pool.query(
      `SELECT e.*, 1 - (v.embedding <=> $1::vector) AS score
       FROM event_vectors v
       JOIN events e ON e.id = v.event_id
       WHERE v.embedding IS NOT NULL
       ORDER BY v.embedding <=> $1::vector
       LIMIT $2`,
      [vecLiteral, limit]
    );
    return rows.map((row) => ({
      ...(rowToEvent(row) || {}),
      score: parseFloat(row.score) || 0,
    }));
  }

  async fullTextSearch(query, limit = 50) {
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT ${EVENT_COLS}, ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS bm25_score
       FROM events
       WHERE search_vector @@ plainto_tsquery('english', $1)
       ORDER BY bm25_score DESC
       LIMIT $2`,
      [query, limit]
    );
    return rows.map((row) => ({
      ...(rowToEvent(row) || {}),
      bm25Score: parseFloat(row.bm25_score) || 0,
    }));
  }

  async getEventsByIds(ids) {
    if (!ids?.length) return [];
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT ${EVENT_COLS} FROM events WHERE id = ANY($1::text[])`,
      [ids]
    );
    return rows.map(rowToEvent).filter(Boolean);
  }

  async updateEventCoordinates(id, latitude, longitude, locationQuality) {
    await this.init();
    await this.pool.query(
      `UPDATE events SET latitude = $2, longitude = $3, "locationQuality" = $4 WHERE id = $1`,
      [id, latitude, longitude, locationQuality]
    );
  }

  async getMeta(key) {
    await this.init();
    const { rows } = await this.pool.query('SELECT value FROM ingest_meta WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
  }

  async setMeta(key, value) {
    await this.init();
    await this.pool.query(
      `INSERT INTO ingest_meta (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, String(value)]
    );
  }

  async getLastScrapeAt() {
    const raw = await this.getMeta(META_LAST_SCRAPE);
    if (!raw) return null;
    return Date.parse(raw);
  }

  async setLastScrapeAt(iso = null) {
    await this.setMeta(META_LAST_SCRAPE, iso || new Date().toISOString());
  }

  async getLastIngestMetrics() {
    const raw = await this.getMeta(META_LAST_INGEST_METRICS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async setLastIngestMetrics(metrics) {
    await this.setMeta(META_LAST_INGEST_METRICS, JSON.stringify(metrics));
  }

  async getScraperSourceHistory() {
    const raw = await this.getMeta(META_SCRAPER_SOURCE_HISTORY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  async setScraperSourceHistory(history) {
    await this.setMeta(META_SCRAPER_SOURCE_HISTORY, JSON.stringify(history));
  }

  async deleteOldEvents(days = 7) {
    await this.init();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString().split('T')[0];
    const scrapedCutoff = cutoff.toISOString();
    const { rowCount } = await this.pool.query(
      `DELETE FROM events WHERE
        (date IS NOT NULL AND date != 'TBD' AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND date < $1)
        OR
        ((date IS NULL OR date = 'TBD' OR date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') AND "createdAt" < $2)`,
      [cutoffIso, scrapedCutoff]
    );
    return rowCount ?? 0;
  }

  async getEventsByDates(dates) {
    if (!dates?.length) return [];
    const unique = [...new Set(dates)]
      .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .slice(0, 50);
    if (!unique.length) return [];
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT ${EVENT_COLS} FROM events WHERE date = ANY($1::text[])`,
      [unique]
    );
    return rows.map(rowToEvent).filter(Boolean);
  }

  async enqueueJob(job) {
    await this.init();
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO jobs (id, type, payload, run_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        job.id,
        job.type,
        JSON.stringify(job.payload || {}),
        job.runAt || now,
        now,
        now,
      ]
    );
  }

  async getNextJob() {
    await this.init();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE jobs
         SET status = 'processing', started_at = NOW(), updated_at = NOW()
         WHERE id = (
           SELECT id FROM jobs
           WHERE status = 'pending' AND run_at <= NOW() AND attempts < max_attempts
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`
      );
      await client.query('COMMIT');
      return rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateJobStatus(id, status, error = null) {
    await this.init();
    const now = new Date().toISOString();
    if (status === 'processing') {
      await this.pool.query(
        `UPDATE jobs SET status = $1, last_error = $2, started_at = $3, updated_at = $3 WHERE id = $4`,
        [status, error, now, id]
      );
      return;
    }
    if (status === 'failed') {
      await this.pool.query(
        `UPDATE jobs SET status = $1, last_error = $2, attempts = attempts + 1, started_at = NULL, updated_at = $3 WHERE id = $4`,
        [status, error, now, id]
      );
    } else {
      await this.pool.query(
        `UPDATE jobs SET status = $1, last_error = $2, started_at = NULL, updated_at = $3 WHERE id = $4`,
        [status, error, now, id]
      );
    }
  }

  async reclaimStaleJobs(staleMinutes = 10) {
    await this.init();
    const { rowCount } = await this.pool.query(
      `UPDATE jobs SET status = 'pending', started_at = NULL, updated_at = NOW()
       WHERE status = 'processing'
         AND (
           (started_at IS NOT NULL AND started_at < NOW() - ($1::int * interval '1 minute'))
           OR (started_at IS NULL AND updated_at < NOW() - ($1::int * interval '1 minute'))
         )`,
      [staleMinutes]
    );
    const reclaimed = rowCount ?? 0;
    if (reclaimed > 0) logger.warn('jobs_reclaimed_stale', { count: reclaimed, staleMinutes });
    return reclaimed;
  }

  async rescheduleJob(id, runAt) {
    await this.init();
    await this.pool.query(
      `UPDATE jobs SET status = 'pending', run_at = $1, updated_at = NOW() WHERE id = $2`,
      [runAt, id]
    );
  }

  async rescheduleFailedJob(id, nextRun, error) {
    await this.init();
    await this.pool.query(
      `UPDATE jobs SET status = 'pending', run_at = $1, last_error = $2, attempts = attempts + 1, updated_at = NOW() WHERE id = $3`,
      [nextRun, error, id]
    );
  }

  async saveStagingEvent(event, processingState = 'validated', source = null) {
    await this.saveStagingEvents([event], processingState, source);
  }

  async saveStagingEvents(events, processingState = 'validated', source = null) {
    if (!events?.length) return;
    await this.init();
    for (const event of events) {
      await this.pool.query(
        `INSERT INTO event_staging (id, payload, processing_state, source, created_at, updated_at)
         VALUES ($1, $2::jsonb, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           payload = EXCLUDED.payload,
           processing_state = EXCLUDED.processing_state,
           source = EXCLUDED.source,
           updated_at = NOW()`,
        [event.id, JSON.stringify(event), processingState, source || event.source || null]
      );
    }
  }

  async getStagingEventsByState(processingState) {
    await this.init();
    const { rows } = await this.pool.query(
      `SELECT id, payload, processing_state, source, created_at
       FROM event_staging WHERE processing_state = $1
       ORDER BY created_at ASC LIMIT 500`,
      [processingState]
    );
    return rows;
  }

  async updateStagingState(id, processingState, lastError = null) {
    await this.init();
    await this.pool.query(
      `UPDATE event_staging SET processing_state = $2, last_error = $3, updated_at = NOW() WHERE id = $1`,
      [id, processingState, lastError]
    );
  }

  async deleteStagingEvent(id) {
    await this.init();
    await this.pool.query(`DELETE FROM event_staging WHERE id = $1`, [id]);
  }

  async cleanupStaleStaging(retentionDays = 7) {
    await this.init();
    const { rowCount } = await this.pool.query(
      `DELETE FROM event_staging
       WHERE processing_state IN ('failed', 'geocoding')
         AND updated_at < NOW() - ($1::int * interval '1 day')`,
      [retentionDays]
    );
    return rowCount ?? 0;
  }
}

module.exports = { PostgresDatabase };
