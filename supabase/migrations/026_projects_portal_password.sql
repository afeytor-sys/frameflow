-- Add portal_password field to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_password text DEFAULT NULL;
