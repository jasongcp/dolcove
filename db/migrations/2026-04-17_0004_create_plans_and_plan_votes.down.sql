-- Rollback: drop plan_votes and plans tables and indexes
BEGIN;

DROP INDEX IF EXISTS idx_plan_votes_user_id;
DROP INDEX IF EXISTS idx_plan_votes_plan_id;
DROP INDEX IF EXISTS idx_plans_created_by;
DROP INDEX IF EXISTS idx_plans_group_id;

DROP TABLE IF EXISTS plan_votes;
DROP TABLE IF EXISTS plans;

COMMIT;
