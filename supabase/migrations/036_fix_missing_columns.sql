-- ============================================================
-- Migration 036: Create missing tables + add missing columns
-- Safe to run on any existing install — uses IF NOT EXISTS.
-- This covers migrations 030, 032, 033, 034, 035 in one shot.
-- ============================================================

-- ============================================================
-- 1. NOTIFICATIONS table (migration 030 / 032)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type            text NOT NULL,
  title_de        text NOT NULL,
  title_en        text NOT NULL,
  body_de         text,
  body_en         text,
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name     text,
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_photographer_id_idx ON notifications(photographer_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(photographer_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- 2. AUTOMATION SETTINGS table (migration 030 / 032)
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL UNIQUE REFERENCES photographers(id) ON DELETE CASCADE,
  -- Email automations
  email_portal_created    boolean DEFAULT true,
  email_contract_sent     boolean DEFAULT true,
  email_gallery_delivered boolean DEFAULT true,
  -- Reminders
  reminder_7d boolean DEFAULT true,
  reminder_1d boolean DEFAULT true,
  -- Notification preferences (migration 034)
  notify_inapp_contract_signed             boolean DEFAULT true,
  notify_email_contract_signed             boolean DEFAULT true,
  notify_inapp_gallery_viewed              boolean DEFAULT true,
  notify_email_gallery_viewed              boolean DEFAULT false,
  notify_inapp_questionnaire               boolean DEFAULT true,
  notify_email_questionnaire               boolean DEFAULT true,
  notify_inapp_photo_downloaded            boolean DEFAULT true,
  notify_email_photo_downloaded            boolean DEFAULT false,
  notify_inapp_gallery_downloaded          boolean DEFAULT true,
  notify_email_gallery_downloaded          boolean DEFAULT true,
  notify_inapp_favorite_marked             boolean DEFAULT true,
  notify_email_favorite_marked             boolean DEFAULT false,
  notify_email_shoot_reminder_photographer boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automation_settings'
      AND policyname = 'photographers can manage own automation_settings'
  ) THEN
    CREATE POLICY "photographers can manage own automation_settings"
      ON automation_settings FOR ALL
      USING (photographer_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 3. If automation_settings already existed without notif columns,
--    add them now (safe with IF NOT EXISTS)
-- ============================================================
ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_contract_signed             boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_contract_signed             boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_viewed              boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_viewed              boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_questionnaire               boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_questionnaire               boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_photo_downloaded            boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_photo_downloaded            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_downloaded          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_downloaded          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_favorite_marked             boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_favorite_marked             boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_email_shoot_reminder_photographer boolean DEFAULT true;

-- ============================================================
-- 4. PROJECTS: reminder tracking columns (migration 030)
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS reminder_7d_sent   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_disabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes     text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portal_locale      text;

-- ============================================================
-- 5. PHOTOGRAPHERS: bank_account_holder (migration 016 fix)
-- ============================================================
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS bank_account_holder text;

-- ============================================================
-- 6. GALLERIES: favorite_list_name (migration 033)
-- ============================================================
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS favorite_list_name text DEFAULT NULL;

-- ============================================================
-- 7. GALLERIES: password (migration 035)
-- ============================================================
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS password text DEFAULT NULL;

-- ============================================================
-- 8. updated_at trigger for automation_settings
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_automation_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_automation_settings_updated_at
      BEFORE UPDATE ON automation_settings
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
