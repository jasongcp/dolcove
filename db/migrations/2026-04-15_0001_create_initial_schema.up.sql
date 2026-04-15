BEGIN;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES groups(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT chk_group_member_role CHECK (role IN ('owner', 'member'))
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_group_user_unique ON group_members (group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);

COMMIT;
