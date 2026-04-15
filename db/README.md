Applying the DB migrations

- Apply a migration:
  psql -d <DATABASE_URL> -f db/migrations/2026-04-17_0004_create_plans_and_plan_votes.up.sql

- Rollback (reverse order):
  psql -d <DATABASE_URL> -f db/migrations/2026-04-17_0004_create_plans_and_plan_votes.down.sql

Memories migration (T-015)

- Apply memories table migration:
  psql -d <DATABASE_URL> -f db/migrations/2026-04-18_0005_create_memories_table.up.sql

- Verify tables and indexes:
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('memories');
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'memories';

- Rollback:
  psql -d <DATABASE_URL> -f db/migrations/2026-04-18_0005_create_memories_table.down.sql

Recaps migration (T-017)

- Apply recaps table migration:
  psql -d <DATABASE_URL> -f db/migrations/2026-04-19_0006_create_recaps_table.up.sql

- Verify tables and indexes:
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('recaps');
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'recaps';

- Rollback:
  psql -d <DATABASE_URL> -f db/migrations/2026-04-19_0006_create_recaps_table.down.sql

Notes

- Prerequisite: ensure groups (and users if referenced by FK) exist before running the migration.
- For large production databases, consider running index creation with CREATE INDEX CONCURRENTLY in a separate non-transactional step. See task T-015a for tracking automation.
