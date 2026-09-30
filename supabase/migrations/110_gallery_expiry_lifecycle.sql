-- Migration 110: Gallery expiry lifecycle
--
-- Supports: blocking client access once a gallery's expires_at passes,
-- warning the client 7 days before expiry, and auto-deleting the
-- gallery 14 days after expiry if the photographer hasn't extended it.
--
-- client_email: for project-less galleries there is no linked client
-- record to pull an email from, so the photographer can set one
-- directly on the gallery just for these notifications. Project-linked
-- galleries keep using the project's client email automatically.
--
-- expiry_warning_sent_at: tracks whether the 7-day warning email has
-- already gone out, so the daily cron doesn't resend it every day.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at timestamptz;
