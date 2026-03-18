-- Add internal_notes column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS internal_notes TEXT;

COMMENT ON COLUMN projects.internal_notes IS 'Private notes visible only to the photographer, not shown in client portal';
