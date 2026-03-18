-- ── Scheduled Emails ────────────────────────────────────────────────────────
-- Stores emails that the photographer has scheduled to be sent at a future date/time.
-- The cron job /api/cron/scheduled-emails checks this table every hour.

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id) ON DELETE CASCADE,
  to_email          text NOT NULL,
  to_name           text,
  subject           text NOT NULL,
  html_body         text NOT NULL,
  plain_body        text,
  type              text NOT NULL DEFAULT 'custom',
  -- type: 'questionnaire' | 'contract' | 'gallery' | 'invoice' | 'portal' | 'custom'
  reference_id      uuid,
  -- reference_id: questionnaire_id, contract_id, gallery_id, invoice_id, etc.
  scheduled_at      timestamptz NOT NULL,
  sent_at           timestamptz,
  cancelled_at      timestamptz,
  status            text NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'sent' | 'cancelled' | 'failed'
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for cron job query (pending emails due to be sent)
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_scheduled
  ON scheduled_emails (status, scheduled_at)
  WHERE status = 'pending';

-- Index for project lookup
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_project
  ON scheduled_emails (project_id);

-- Index for photographer lookup
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_photographer
  ON scheduled_emails (photographer_id);

-- RLS
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can manage their own scheduled emails"
  ON scheduled_emails
  FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
