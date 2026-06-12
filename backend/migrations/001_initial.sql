-- WhatsUpNYC initial schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  address TEXT,
  "startTime" TEXT,
  date TEXT,
  price TEXT,
  category TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website TEXT,
  source TEXT,
  "locationQuality" TEXT,
  "scrapedAt" TEXT,
  "createdAt" TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
CREATE INDEX IF NOT EXISTS idx_events_source ON events (source);

CREATE TABLE IF NOT EXISTS event_vectors (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  vector_json TEXT
);

CREATE TABLE IF NOT EXISTS ingest_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  run_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run ON jobs (status, run_at);

CREATE TABLE IF NOT EXISTS geocode_cache (
  address TEXT PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  quality TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
