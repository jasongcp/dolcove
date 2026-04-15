-- Migration: create plans and plan_votes tables
BEGIN;

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL,
  start_time TIMESTAMPTZ NULL,
  location TEXT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plans_status_check CHECK (status IN ('proposed','confirmed','cancelled','completed')),
  CONSTRAINT plans_group_fk FOREIGN KEY (group_id) REFERENCES groups(id),
  CONSTRAINT plans_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plan_votes (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_votes_vote_check CHECK (vote IN ('yes','no','maybe')),
  CONSTRAINT plan_votes_plan_fk FOREIGN KEY (plan_id) REFERENCES plans(id),
  CONSTRAINT plan_votes_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT plan_votes_unique UNIQUE (plan_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_group_id ON plans (group_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON plans (created_by);
CREATE INDEX IF NOT EXISTS idx_plan_votes_plan_id ON plan_votes (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_votes_user_id ON plan_votes (user_id);

COMMIT;
