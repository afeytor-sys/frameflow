-- Migration 071: Lead status pipeline for inbox conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new_lead'
    CHECK (lead_status IN ('new_lead','not_available','offer_sent','no_response','video_call','booking_confirmed')),
  ADD COLUMN IF NOT EXISTS status_changed_at jsonb NOT NULL DEFAULT '{}';
-- status_changed_at stores {status: ISO timestamp} for each stage reached
-- e.g. {"new_lead":"2026-01-01T10:00:00Z","offer_sent":"2026-01-05T14:00:00Z"}

-- Index for funnel analytics queries
CREATE INDEX IF NOT EXISTS conversations_lead_status_idx ON conversations(photographer_id, lead_status);
