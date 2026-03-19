-- ============================================================
-- Migration 040: Fix notifications system
-- Ensures notifications table has all required columns,
-- automation_settings has notification preference columns,
-- and RLS allows service role inserts.
-- ============================================================

-- 1. Ensure notifications table exists with all columns
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

-- 2. Ensure automation_settings has all notification preference columns
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
