const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { logger } = require('../../logger');
const { rowToEvent } = require('../../utils/rowToEvent');
const { resolveDatabasePath } = require('../../utils/dbPath');

const META_LAST_SCRAPE = 'last_scrape_at';
const META_LAST_INGEST_METRICS = 'last_ingest_metrics';
const META_SCRAPER_SOURCE_HISTORY = 'scraper_source_history';

class SqliteDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    this.db = await open({
      filename: resolveDatabasePath(),
      driver: sqlite3.Database,
    });

    logger.info('database_init_start', { driver: 'sqlite' });

    await this.db.exec('PRAGMA journal_mode = WAL');
    await this.db.exec('PRAGMA synchronous = NORMAL');
    await this.db.exec('PRAGMA busy_timeout = 5000');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        address TEXT,
        startTime TEXT,
        date TEXT,
        price TEXT,
        category TEXT,
        latitude REAL,
        longitude REAL,
        website TEXT,
        source TEXT,
        locationQuality TEXT,
        scrapedAt TEXT,
        createdAt TEXT
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_vectors (
        event_id TEXT PRIMARY KEY,
        vector_json TEXT,
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ingest_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        last_error TEXT,
        run_at TEXT,
        started_at TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    await this.db.exec('ALTER TABLE jobs ADD COLUMN started_at TEXT').catch(() => {});

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS geocode_cache (
        address TEXT PRIMARY KEY,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        quality TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_staging (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        processing_state TEXT NOT NULL DEFAULT 'validated',
        source TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(
      'CREATE INDEX IF NOT EXISTS idx_event_staging_state ON event_staging (processing_state, created_at)'
    );
    await this.db.exec('ALTER TABLE event_staging ADD COLUMN last_error TEXT').catch(() => {});
    await this.db.exec('ALTER TABLE event_staging ADD COLUMN updated_at TEXT').catch(() => {});

    logger.info('database_init_done', { driver: 'sqlite' });
    return this.db;
  }

  async getCachedLocation(address) {
    const db = await this.init();
    return db.get('SELECT * FROM geocode_cache WHERE address = ?', address.toLowerCase().trim());
  }

  async saveCachedLocation(address, coords) {
    const db = await this.init();
    await db.run(
      `INSERT OR REPLACE INTO geocode_cache (address, latitude, longitude, quality)
       VALUES (?, ?, ?, ?)`,
      [address.toLowerCase().trim(), coords.latitude, coords.longitude, coords.locationQuality]
    );
  }

  async saveEvents(events) {
    const db = await this.init();
    await db.run('BEGIN TRANSACTION');
    try {
      const stmt = await db.prepare(`
        INSERT OR REPLACE INTO events
        (id, name, description, address, startTime, date, price, category, latitude, longitude, website, source, locationQuality, scrapedAt, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const event of events) {
        await stmt.run(
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
          event.createdAt || new Date().toISOString()
        );
      }
      await stmt.finalize();
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  }

  async saveVector(eventId, vector) {
    const db = await this.init();
    await db.run('INSERT OR REPLACE INTO event_vectors (event_id, vector_json) VALUES (?, ?)', [
      eventId,
      JSON.stringify(vector),
    ]);
  }

  async getAllEvents() {
    const db = await this.init();
    const rows = await db.all('SELECT * FROM events ORDER BY date DESC');
    return rows.map(rowToEvent).filter(Boolean);
  }

  async getEventsPaginated(limit = 50, offset = 0) {
    const db = await this.init();
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const rows = await db.all('SELECT * FROM events ORDER BY date DESC LIMIT ? OFFSET ?', [
      safeLimit,
      safeOffset,
    ]);
    const countRow = await db.get('SELECT COUNT(*) AS count FROM events');
    return {
      events: rows.map(rowToEvent).filter(Boolean),
      totalCount: countRow?.count ?? 0,
    };
  }

  async getEventCount() {
    const db = await this.init();
    const row = await db.get('SELECT COUNT(*) AS count FROM events');
    return row?.count ?? 0;
  }

  async hasPendingJob(type) {
    const db = await this.init();
    const row = await db.get(
      `SELECT 1 FROM jobs WHERE type = ? AND status = 'pending' LIMIT 1`,
      type
    );
    return Boolean(row);
  }

  async getPendingJobCount() {
    const db = await this.init();
    const row = await db.get(`SELECT COUNT(*) AS count FROM jobs WHERE status = 'pending'`);
    return row?.count ?? 0;
  }

  async getIndexedVectors() {
    const db = await this.init();
    return db.all(
      'SELECT e.*, v.vector_json FROM events e JOIN event_vectors v ON e.id = v.event_id'
    );
  }

  async countEventVectors() {
    const db = await this.init();
    const row = await db.get('SELECT COUNT(*) AS count FROM event_vectors');
    return row?.count ?? 0;
  }

  async semanticSearch() {
    return [];
  }

  async fullTextSearch(query, limit = 50) {
    const { keywordFilter } = require('../../utils/eventNormalize');
    const all = await this.getAllEvents();
    const filtered = keywordFilter(all, query);
    return filtered.slice(0, limit).map((event, rank) => ({
      ...event,
      bm25Score: 1 / (rank + 1),
    }));
  }

  async getEventsByIds(ids) {
    if (!ids?.length) return [];
    const db = await this.init();
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await db.all(`SELECT * FROM events WHERE id IN (${placeholders})`, ids);
    return rows.map(rowToEvent).filter(Boolean);
  }

  async updateEventCoordinates(id, latitude, longitude, locationQuality) {
    const db = await this.init();
    await db.run(
      'UPDATE events SET latitude = ?, longitude = ?, locationQuality = ? WHERE id = ?',
      [latitude, longitude, locationQuality, id]
    );
  }

  async getMeta(key) {
    const db = await this.init();
    const row = await db.get('SELECT value FROM ingest_meta WHERE key = ?', key);
    return row ? row.value : null;
  }

  async setMeta(key, value) {
    const db = await this.init();
    await db.run('INSERT OR REPLACE INTO ingest_meta (key, value) VALUES (?, ?)', key, String(value));
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
    const db = await this.init();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString().split('T')[0];
    const scrapedCutoff = cutoff.toISOString();

    const result = await db.run(
      `DELETE FROM events WHERE
        (date IS NOT NULL AND date != 'TBD' AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date < ?)
        OR
        ((date IS NULL OR date = 'TBD' OR date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]') AND createdAt < ?)`,
      [cutoffIso, scrapedCutoff]
    );
    return result.changes ?? 0;
  }

  async getEventsByDates(dates) {
    if (!dates || dates.length === 0) return [];
    const unique = [...new Set(dates)]
      .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .slice(0, 50);
    if (unique.length === 0) return [];
    const db = await this.init();
    const placeholders = unique.map(() => '?').join(', ');
    const rows = await db.all(`SELECT * FROM events WHERE date IN (${placeholders})`, unique);
    return rows.map(rowToEvent).filter(Boolean);
  }

  async enqueueJob(job) {
    const db = await this.init();
    await db.run(
      `INSERT OR IGNORE INTO jobs (id, type, payload, run_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.type,
        JSON.stringify(job.payload || {}),
        job.runAt || new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  async getNextJob() {
    const db = await this.init();
    const now = new Date().toISOString();
    await db.run('BEGIN');
    try {
      const candidate = await db.get(
        `SELECT id FROM jobs WHERE status = 'pending' AND run_at <= ? AND attempts < max_attempts ORDER BY created_at ASC LIMIT 1`,
        [now]
      );
      if (!candidate) {
        await db.run('ROLLBACK');
        return null;
      }
      const claim = await db.run(
        `UPDATE jobs SET status = 'processing', started_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
        [now, now, candidate.id]
      );
      if (!claim.changes) {
        await db.run('ROLLBACK');
        return null;
      }
      const job = await db.get('SELECT * FROM jobs WHERE id = ?', candidate.id);
      await db.run('COMMIT');
      return job;
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  }

  async updateJobStatus(id, status, error = null) {
    const db = await this.init();
    const now = new Date().toISOString();
    if (status === 'processing') {
      await db.run(
        `UPDATE jobs SET status = ?, last_error = ?, started_at = ?, updated_at = ? WHERE id = ?`,
        [status, error, now, now, id]
      );
      return;
    }
    if (status === 'failed') {
      await db.run(
        `UPDATE jobs SET status = ?, last_error = ?, attempts = attempts + 1, started_at = NULL, updated_at = ? WHERE id = ?`,
        [status, error, now, id]
      );
    } else {
      await db.run(
        `UPDATE jobs SET status = ?, last_error = ?, started_at = NULL, updated_at = ? WHERE id = ?`,
        [status, error, now, id]
      );
    }
  }

  async reclaimStaleJobs(staleMinutes = 10) {
    const db = await this.init();
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
    const result = await db.run(
      `UPDATE jobs SET status = 'pending', started_at = NULL, updated_at = ?
       WHERE status = 'processing'
         AND (
           (started_at IS NOT NULL AND started_at < ?)
           OR (started_at IS NULL AND updated_at < ?)
         )`,
      [new Date().toISOString(), cutoff, cutoff]
    );
    const reclaimed = result.changes ?? 0;
    if (reclaimed > 0) logger.warn('jobs_reclaimed_stale', { count: reclaimed, staleMinutes });
    return reclaimed;
  }

  async rescheduleJob(id, runAt) {
    const db = await this.init();
    await db.run(`UPDATE jobs SET status = 'pending', run_at = ?, updated_at = ? WHERE id = ?`, [
      runAt,
      new Date().toISOString(),
      id,
    ]);
  }

  async rescheduleFailedJob(id, nextRun, error) {
    const db = await this.init();
    await db.run(
      `UPDATE jobs SET status = 'pending', run_at = ?, last_error = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?`,
      [nextRun, error, new Date().toISOString(), id]
    );
  }

  getPoolStats() {
    return { totalCount: 1, idleCount: 1, waitingCount: 0 };
  }

  async saveStagingEvent(event, processingState = 'validated', source = null) {
    await this.saveStagingEvents([event], processingState, source);
  }

  async saveStagingEvents(events, processingState = 'validated', source = null) {
    if (!events?.length) return;
    const db = await this.init();
    const now = new Date().toISOString();
    for (const event of events) {
      await db.run(
        `INSERT INTO event_staging (id, payload, processing_state, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           processing_state = excluded.processing_state,
           source = excluded.source,
           updated_at = excluded.updated_at`,
        [
          event.id,
          JSON.stringify(event),
          processingState,
          source || event.source || null,
          now,
          now,
        ]
      );
    }
  }

  async getStagingEventsByState(processingState) {
    const db = await this.init();
    return db.all(
      `SELECT id, payload, processing_state, source, created_at
       FROM event_staging WHERE processing_state = ?
       ORDER BY created_at ASC LIMIT 500`,
      processingState
    );
  }

  async updateStagingState(id, processingState, lastError = null) {
    const db = await this.init();
    const now = new Date().toISOString();
    await db.run(
      `UPDATE event_staging SET processing_state = ?, last_error = ?, updated_at = ? WHERE id = ?`,
      [processingState, lastError, now, id]
    );
  }

  async deleteStagingEvent(id) {
    const db = await this.init();
    await db.run(`DELETE FROM event_staging WHERE id = ?`, [id]);
  }

  async cleanupStaleStaging(retentionDays = 7) {
    const db = await this.init();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.run(
      `DELETE FROM event_staging
       WHERE processing_state IN ('failed', 'geocoding')
         AND COALESCE(updated_at, created_at) < ?`,
      [cutoff]
    );
    return result.changes ?? 0;
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

module.exports = { SqliteDatabase };
