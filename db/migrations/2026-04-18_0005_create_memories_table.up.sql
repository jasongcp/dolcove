-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  memory_text TEXT NOT NULL,
  confidence NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Foreign key to groups (assumes groups table exists)
ALTER TABLE memories
  ADD CONSTRAINT fk_memories_group
  FOREIGN KEY (group_id) REFERENCES groups(id);

-- Indexes to support common queries
CREATE INDEX IF NOT EXISTS idx_memories_group_id ON memories (group_id);
CREATE INDEX IF NOT EXISTS idx_memories_source_type ON memories (source_type);
CREATE INDEX IF NOT EXISTS idx_memories_memory_type ON memories (memory_type);

-- Note: For very large datasets, consider creating indexes with CREATE INDEX CONCURRENTLY in a separate non-transactional migration.
