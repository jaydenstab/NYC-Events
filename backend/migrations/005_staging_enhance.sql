-- Staging checkpoint enhancements

ALTER TABLE event_staging
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_event_staging_state_updated
  ON event_staging (processing_state, updated_at);
