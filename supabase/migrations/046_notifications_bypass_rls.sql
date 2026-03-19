-- ============================================================
-- Migration 046: Definitive fix for notifications INSERT
-- The service role bypasses RLS by default in Supabase,
-- BUT only when the table does NOT have FORCE ROW LEVEL SECURITY.
-- This migration ensures a clean, working state.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Step 1: Drop ALL existing policies on notifications to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname);
  END LOOP;
END $$;

-- Step 2: Disable FORCE ROW LEVEL SECURITY (if set) so service role bypasses RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Do NOT use: ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
-- Without FORCE, the service role (superuser) bypasses RLS automatically.

-- Step 3: Create clean policies
-- Photographers can read/update/delete their own notifications
CREATE POLICY "photographers_own_notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Allow anon/service inserts (belt-and-suspenders for the service role)
CREATE POLICY "service_insert_notifications"
  ON notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Step 4: Ensure automation_settings row exists for all photographers
INSERT INTO automation_settings (photographer_id)
SELECT id FROM photographers
WHERE id NOT IN (
  SELECT photographer_id FROM automation_settings
  WHERE photographer_id IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- Step 5: Ensure all required columns exist on notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title_de    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_en    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_de     text,
  ADD COLUMN IF NOT EXISTS body_en     text,
  ADD COLUMN IF NOT EXISTS project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS read        boolean NOT NULL DEFAULT false;

-- Step 6: Ensure automation_settings has all notification columns
ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_photo_downloaded    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_photo_downloaded    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_downloaded  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_downloaded  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_favorite_marked     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_favorite_marked     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_viewed      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_viewed      boolean NOT NULL DEFAULT false;

-- Step 7: Update existing rows to have proper defaults (not NULL)
UPDATE automation_settings SET
  notify_inapp_photo_downloaded   = COALESCE(notify_inapp_photo_downloaded, true),
  notify_email_photo_downloaded   = COALESCE(notify_email_photo_downloaded, false),
  notify_inapp_gallery_downloaded = COALESCE(notify_inapp_gallery_downloaded, true),
  notify_email_gallery_downloaded = COALESCE(notify_email_gallery_downloaded, true),
  notify_inapp_favorite_marked    = COALESCE(notify_inapp_favorite_marked, true),
  notify_email_favorite_marked    = COALESCE(notify_email_favorite_marked, false),
  notify_inapp_gallery_viewed     = COALESCE(notify_inapp_gallery_viewed, true),
  notify_email_gallery_viewed     = COALESCE(notify_email_gallery_viewed, false);
