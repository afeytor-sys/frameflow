-- ── Migration 032: Ensure automation_settings and notifications tables exist ──
-- Safe to run on existing installs — uses IF NOT EXISTS throughout.
-- Fixes "Fehler beim Speichern" on the Automations settings tab for installs
-- that were bootstrapped from schema.sql (which only covered up to migration 028).

-- 1. Notifications table (in-app bell)
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

-- 2. Automation settings per photographer
CREATE TABLE IF NOT EXISTS automation_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL UNIQUE REFERENCES photographers(id) ON DELETE CASCADE,
  email_portal_created    boolean DEFAULT true,
  email_contract_sent     boolean DEFAULT true,
  email_gallery_delivered boolean DEFAULT true,
  reminder_7d             boolean DEFAULT true,
  reminder_1d             boolean DEFAULT true,
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

-- 3. Ensure projects reminder columns exist (also from migration 030)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS reminder_7d_sent    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_disabled  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes      text    DEFAULT NULL;
