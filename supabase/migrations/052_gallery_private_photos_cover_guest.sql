-- Migration 052: Gallery private photos, guest password, cover photo
-- Run in Supabase SQL Editor

-- 1. Private photos: photographer can mark individual photos as private
--    Private photos are hidden from guests (guest_password access)
--    but visible to the main client (Kunden-Password / client portal)
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 2. Guest password: separate from the main gallery password
--    gallery.password     = Kunden-Password (full access, sees private photos)
--    gallery.guest_password = Gast-Password  (limited access, no private photos)
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS guest_password TEXT;

-- 3. Cover photo: photographer can choose which photo appears as the hero
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_photos_is_private ON photos(gallery_id, is_private);
CREATE INDEX IF NOT EXISTS idx_galleries_cover_photo ON galleries(cover_photo_id);
