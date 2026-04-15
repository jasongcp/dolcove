-- Drop indexes and table in reverse order
DROP INDEX IF EXISTS idx_memories_memory_type;
DROP INDEX IF EXISTS idx_memories_source_type;
DROP INDEX IF EXISTS idx_memories_group_id;

-- Drop foreign key constraint if exists (some DBs require constraint name)
ALTER TABLE IF EXISTS memories DROP CONSTRAINT IF EXISTS fk_memories_group;

DROP TABLE IF EXISTS memories;
