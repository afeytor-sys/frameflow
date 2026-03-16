-- ============================================================
-- FrameFlow — Run these in Supabase SQL Editor
-- Migrations 027 + 028
-- ============================================================

-- ── Migration 027: Email Templates table ──────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'general', -- 'rechnung' | 'galerie' | 'fragebogen' | 'general'
  subject         text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photographers can manage own email templates"
  ON email_templates FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- ── Migration 028: portal_links column on projects ────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_links jsonb DEFAULT '[]'::jsonb;
