-- Add tags_enabled column to galleries table
-- This stores which color tags are enabled for client use (e.g. ['green', 'yellow', 'red'])
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS tags_enabled text[] DEFAULT ARRAY['green', 'yellow', 'red'];
