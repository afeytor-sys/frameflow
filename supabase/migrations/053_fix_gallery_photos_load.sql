-- Migration 053: Fix gallery photos loading
-- Ensures is_private column exists with correct default
-- and fixes any NULL values from before the column existed

-- Ensure columns exist (safe to run multiple times)
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS guest_password TEXT;

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL;

-- Fix any NULL is_private values (photos uploaded before this column existed)
UPDATE photos SET is_private = false WHERE is_private IS NULL;

-- Make the column NOT NULL with default false going forward
ALTER TABLE photos ALTER COLUMN is_private SET DEFAULT false;
ALTER TABLE photos ALTER COLUMN is_private SET NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_photos_is_private ON photos(gallery_id, is_private);
CREATE INDEX IF NOT EXISTS idx_galleries_cover_photo ON galleries(cover_photo_id);
