-- ─────────────────────────────────────────────
-- Migration 010: Add custom_slug to projects
-- ─────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS custom_slug text UNIQUE;

-- Index for fast slug lookup
CREATE UNIQUE INDEX IF NOT EXISTS projects_custom_slug_idx ON projects(custom_slug)
  WHERE custom_slug IS NOT NULL;
