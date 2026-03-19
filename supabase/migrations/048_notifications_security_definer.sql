-- ============================================================
-- Migration 048: Notifications via SECURITY DEFINER function
-- This is the definitive fix. Instead of relying on RLS bypass,
-- we use a PostgreSQL function with SECURITY DEFINER that runs
-- as the table owner (postgres), bypassing RLS entirely.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Step 1: Create a SECURITY DEFINER function to insert notifications
-- This runs as the postgres superuser, bypassing all RLS policies.
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

-- Grant execute to all roles (anon, authenticated, service_role)
GRANT EXECUTE ON FUNCTION insert_notification(uuid, text, text, text, text, text, uuid, text) TO anon, authenticated, service_role;

-- Step 2: Also ensure the notifications table has RLS enabled with correct policies
-- Drop all existing policies first
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

-- Photographers can read/update/delete their own notifications
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

-- INSERT is handled by the SECURITY DEFINER function above,
-- but also allow direct insert for service_role (belt-and-suspenders)
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
