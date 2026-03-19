-- ============================================================
-- Migration 042: Fix notifications + download counters
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Notifications table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type            text NOT NULL,
  title_de        text NOT NULL DEFAULT '',
  title_en        text NOT NULL DEFAULT '',
  body_de         text,
  body_en         text,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_name     text,
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Add missing columns if table already exists
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title_de    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_en    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_de     text,
  ADD COLUMN IF NOT EXISTS body_en     text,
  ADD COLUMN IF NOT EXISTS project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS read        boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS notifications_photographer_id_idx ON notifications(photographer_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(photographer_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS: photographers can read/update/delete their own notifications
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

-- Service role bypass (needed for notify API route)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'service role can insert notifications'
  ) THEN
    CREATE POLICY "service role can insert notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ── 2. Gallery download counters ─────────────────────────────
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS download_count       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_download_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count           integer DEFAULT 0;

-- ── 3. RPC: increment full gallery download count ────────────
CREATE OR REPLACE FUNCTION increment_download_count(gallery_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE galleries
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = gallery_id;
$$;

-- ── 4. RPC: increment individual photo download count ────────
CREATE OR REPLACE FUNCTION increment_photo_download_count(gallery_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE galleries
  SET photo_download_count = COALESCE(photo_download_count, 0) + 1
  WHERE id = gallery_id;
$$;

-- ── 5. RPC: increment gallery view count ─────────────────────
CREATE OR REPLACE FUNCTION increment_view_count(gallery_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE galleries
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = gallery_id;
$$;

-- ── 6. automation_settings notification columns ──────────────
ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_contract_signed    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_contract_signed    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_viewed     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_viewed     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_questionnaire      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_questionnaire      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_photo_downloaded   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_photo_downloaded   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_downloaded boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_downloaded boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_favorite_marked    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_favorite_marked    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_email_shoot_reminder_photographer boolean DEFAULT true;
