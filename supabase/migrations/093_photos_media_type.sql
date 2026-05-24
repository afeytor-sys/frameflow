-- Add media_type column to photos table to distinguish images from videos
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'
  CHECK (media_type IN ('image', 'video'));
