-- ============================================================
-- PENDING MIGRATIONS: 045 + 046 + 047 + 048
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Migration 045: Add portal_message_templates to photographers
-- ============================================================

ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS portal_message_templates jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- Migration 046: Definitive fix for notifications INSERT
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

-- Step 2: Re-enable RLS (without FORCE, so service role bypasses automatically)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create clean policies
CREATE POLICY "photographers_own_notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

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

-- ============================================================
-- Migration 047: Custom shooting types per photographer
-- ============================================================

ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS custom_shooting_types jsonb DEFAULT '[]'::jsonb;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS shooting_type text;

-- ============================================================
-- Migration 048: Notifications via SECURITY DEFINER function
-- ============================================================

-- Step 1: Create a SECURITY DEFINER function to insert notifications
CREATE OR REPLACE FUNCTION insert_notification(
  p_photographer_id uuid,
  p_type            text,
  p_title_de        text,
  p_title_en        text,
  p_body_de         text,
  p_body_en         text,
  p_project_id      uuid DEFAULT NULL,
  p_client_name     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO notifications (
    photographer_id,
    type,
    title_de,
    title_en,
    body_de,
    body_en,
    project_id,
    client_name,
    read,
    created_at
  ) VALUES (
    p_photographer_id,
    p_type,
    p_title_de,
    p_title_en,
    p_body_de,
    p_body_en,
    p_project_id,
    p_client_name,
    false,
    now()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION insert_notification(uuid, text, text, text, text, text, uuid, text) TO anon, authenticated, service_role;

-- Step 2: Drop all existing policies and recreate clean
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

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_photographer_select"
  ON notifications FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

CREATE POLICY "notifications_photographer_update"
  ON notifications FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "notifications_photographer_delete"
  ON notifications FOR DELETE
  TO authenticated
  USING (photographer_id = auth.uid());

CREATE POLICY "notifications_service_insert"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Step 3: Ensure automation_settings row exists for all photographers
INSERT INTO automation_settings (photographer_id)
SELECT id FROM photographers
WHERE id NOT IN (
  SELECT photographer_id FROM automation_settings
  WHERE photographer_id IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- Step 4: Ensure all notification columns exist with proper defaults
ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_photo_downloaded    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_photo_downloaded    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_downloaded  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_downloaded  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_favorite_marked     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_favorite_marked     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_viewed      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_viewed      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_contract_signed     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_contract_signed     boolean NOT NULL DEFAULT true;

-- Fix any NULL values in existing rows
UPDATE automation_settings SET
  notify_inapp_photo_downloaded   = COALESCE(notify_inapp_photo_downloaded, true),
  notify_email_photo_downloaded   = COALESCE(notify_email_photo_downloaded, false),
  notify_inapp_gallery_downloaded = COALESCE(notify_inapp_gallery_downloaded, true),
  notify_email_gallery_downloaded = COALESCE(notify_email_gallery_downloaded, true),
  notify_inapp_favorite_marked    = COALESCE(notify_inapp_favorite_marked, true),
  notify_email_favorite_marked    = COALESCE(notify_email_favorite_marked, false),
  notify_inapp_gallery_viewed     = COALESCE(notify_inapp_gallery_viewed, true),
  notify_email_gallery_viewed     = COALESCE(notify_email_gallery_viewed, false),
  notify_inapp_contract_signed    = COALESCE(notify_inapp_contract_signed, true),
  notify_email_contract_signed    = COALESCE(notify_email_contract_signed, true);
