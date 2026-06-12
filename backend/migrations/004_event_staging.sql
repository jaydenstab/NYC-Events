-- Checkpoint staging for ingest pipeline resume

CREATE TABLE IF NOT EXISTS event_staging (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  processing_state TEXT NOT NULL DEFAULT 'validated',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_staging_state ON event_staging (processing_state, created_at);
