-- Migration 041: Add photo_download_count to galleries
-- Tracks individual photo downloads separately from full gallery downloads

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS photo_download_count integer DEFAULT 0;

-- Also create an RPC function to increment photo_download_count
CREATE OR REPLACE FUNCTION increment_photo_download_count(gallery_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE galleries
  SET photo_download_count = COALESCE(photo_download_count, 0) + 1
  WHERE id = gallery_id;
$$;
