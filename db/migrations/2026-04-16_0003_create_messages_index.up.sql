-- Migration: create index for messages latest-per-group lookup
-- IMPORTANT: This migration uses CREATE INDEX CONCURRENTLY and MUST NOT be run inside a transaction.
-- Run separately from transactional migration runners if they wrap .sql in BEGIN/COMMIT.

-- Create a descending index on (group_id, created_at) to optimize MAX(created_at) queries per group
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_group_created_at ON messages (group_id, created_at DESC);
