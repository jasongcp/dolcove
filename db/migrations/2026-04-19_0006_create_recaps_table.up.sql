BEGIN;

-- Create recaps table (T-017)
CREATE TABLE IF NOT EXISTS recaps (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_recaps_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Indexes to support queries by group and timeframe
CREATE INDEX IF NOT EXISTS idx_recaps_group_id ON recaps(group_id);
CREATE INDEX IF NOT EXISTS idx_recaps_group_period ON recaps(group_id, period_start DESC);

COMMIT;
