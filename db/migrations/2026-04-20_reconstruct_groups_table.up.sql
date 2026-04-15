-- RECONSTRUCTION DRAFT (T-018)
-- DO NOT APPLY. This file is a proposed reconstruction for owner review only.
-- Provenance: exhaustive repo search performed (branches, tags, reflog, remote refs, CI artifacts). Authoritative groups migration was not found.
-- Purpose: minimal groups table DDL to restore repo source-of-truth for review. Do NOT merge or apply without explicit owner approval.

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes:
-- 1) id is defined as TEXT per project conventions (application-controlled opaque IDs). This is an assumption; confirm against owners.
-- 2) This reconstruction is intentionally minimal. Do NOT assume additional columns, constraints, or FKs.
-- 3) If this DDL is approved, ensure a matching reversible DOWN migration is used and verified in CI before applying to any live DB.
