BEGIN;

-- Drop indexes and table created in 2026-04-19_0006_create_recaps_table.up.sql
DROP INDEX IF EXISTS idx_recaps_group_period;
DROP INDEX IF EXISTS idx_recaps_group_id;
DROP TABLE IF EXISTS recaps;

COMMIT;
