-- Add meeting_point column to projects for precise shoot location (Google Maps link or coordinates)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meeting_point text;
