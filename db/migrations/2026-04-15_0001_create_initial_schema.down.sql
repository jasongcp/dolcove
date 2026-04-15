BEGIN;

-- Drop indexes and tables in reverse order created by the up migration
DROP INDEX IF EXISTS idx_group_members_group_id;
DROP INDEX IF EXISTS idx_group_members_user_id;
DROP INDEX IF EXISTS ux_group_user_unique;

DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;

COMMIT;
