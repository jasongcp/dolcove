-- Rollback: drop messages table and indexes
BEGIN;

DROP TABLE IF EXISTS messages;

COMMIT;
