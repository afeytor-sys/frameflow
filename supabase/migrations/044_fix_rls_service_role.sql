-- ============================================================
-- Migration 044: Fix RLS for service role on notifications
-- Run this in Supabase SQL Editor
-- ============================================================

-- The service role client bypasses RLS by default in Supabase,
-- BUT only if the table does NOT have FORCE ROW LEVEL SECURITY.
-- We need to make sure the service role can always INSERT.

-- Drop existing conflicting policies and recreate cleanly
DO $$
BEGIN
  -- Drop the generic insert policy if it exists (may be too permissive or wrong)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'service role can insert notifications'
  ) THEN
    DROP POLICY "service role can insert notifications" ON notifications;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Photographers can manage their own notifications (read/update/delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'photographers can manage own notifications'
  ) THEN
    CREATE POLICY "photographers can manage own notifications"
      ON notifications FOR ALL
      USING (photographer_id = auth.uid());
  END IF;
END $$;

-- Policy 2: Allow INSERT for anyone (service role uses this to insert notifications)
-- The service role bypasses RLS, but having this policy ensures anon/service inserts work
CREATE POLICY "allow insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ── Ensure automation_settings has a row for every photographer ──────────────
-- This prevents the case where settings is NULL and defaults aren't applied
INSERT INTO automation_settings (photographer_id)
SELECT id FROM photographers
WHERE id NOT IN (SELECT photographer_id FROM automation_settings WHERE photographer_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- ── Verify the notifications table structure ─────────────────────────────────
-- Make sure all columns exist
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title_de    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_en    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_de     text,
  ADD COLUMN IF NOT EXISTS body_en     text,
  ADD COLUMN IF NOT EXISTS project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS read        boolean DEFAULT false;
