-- Rollback: drop the messages latest-per-group index
-- NOTE: DROP INDEX CONCURRENTLY also must not be run inside a transaction.

DROP INDEX CONCURRENTLY IF EXISTS idx_messages_group_created_at;
