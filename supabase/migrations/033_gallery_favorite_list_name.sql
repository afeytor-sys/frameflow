-- Add favorite_list_name column to galleries table
-- This stores the name the client gives to their favorites list

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS favorite_list_name TEXT DEFAULT NULL;
