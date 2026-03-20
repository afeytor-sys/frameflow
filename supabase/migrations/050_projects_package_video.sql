-- Add package (free text) and include_video (boolean) to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS package TEXT,
  ADD COLUMN IF NOT EXISTS include_video BOOLEAN DEFAULT false;
