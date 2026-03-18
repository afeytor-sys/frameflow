-- ── CRM Features Migration ──────────────────────────────────────────────────

-- 1. Notifications table (in-app bell)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'contract_signed' | 'questionnaire_filled' | 'gallery_viewed' | 'portal_opened' | 'contract_sent' | 'gallery_delivered'
  title_de text NOT NULL,
  title_en text NOT NULL,
  body_de text,
  body_en text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_photographer_id_idx ON notifications(photographer_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(photographer_id, read);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographers can manage own notifications"
  ON notifications FOR ALL
  USING (photographer_id = auth.uid());

-- 2. Automation settings per photographer
CREATE TABLE IF NOT EXISTS automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL UNIQUE REFERENCES photographers(id) ON DELETE CASCADE,
  -- Email automations
  email_portal_created boolean DEFAULT true,
  email_contract_sent boolean DEFAULT true,
  email_gallery_delivered boolean DEFAULT true,
  -- Reminders
  reminder_7d boolean DEFAULT true,
  reminder_1d boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographers can manage own automation_settings"
  ON automation_settings FOR ALL
  USING (photographer_id = auth.uid());

-- 3. Add reminder tracking + internal notes to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS reminder_7d_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_disabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text DEFAULT NULL;
