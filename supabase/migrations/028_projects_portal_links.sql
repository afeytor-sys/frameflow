-- Add portal_links column to projects table
-- Stores an array of { label, url } objects the photographer can share with the client

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_links jsonb DEFAULT '[]'::jsonb;
