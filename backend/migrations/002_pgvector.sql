-- pgvector for semantic search (384-dim BGE-small-en-v1.5)

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE event_vectors ADD COLUMN IF NOT EXISTS embedding vector(384);

CREATE INDEX IF NOT EXISTS idx_event_vectors_embedding
  ON event_vectors USING hnsw (embedding vector_cosine_ops);
