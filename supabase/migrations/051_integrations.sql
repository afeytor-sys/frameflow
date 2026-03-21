-- ============================================================
-- Migration 051: Integrations
-- Adds notification_email (BCC) and Google Calendar OAuth tokens
-- to the photographers table.
-- Safe to run multiple times — uses IF NOT EXISTS.
-- ============================================================

-- Email BCC / Reply-To: photographer's personal notification email
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS notification_email text DEFAULT NULL;

-- Google Calendar OAuth tokens
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS google_calendar_access_token  text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_token_expiry  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_id            text DEFAULT NULL;

-- Store Google Calendar event IDs per project so we can update/delete them
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text DEFAULT NULL;
