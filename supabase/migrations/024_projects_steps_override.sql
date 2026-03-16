-- Add project_steps_override column to projects table
-- Allows photographers to manually mark project steps as done
-- (e.g. contract signed externally, gallery delivered, etc.)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_steps_override JSONB DEFAULT NULL;

COMMENT ON COLUMN projects.project_steps_override IS
  'Manual override for Projekt Überblick steps. Keys: contract, shooting, gallery. Value true = force done.';
