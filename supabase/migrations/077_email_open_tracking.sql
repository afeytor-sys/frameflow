-- ── Email Open Tracking ───────────────────────────────────────────────────────
-- Adds open tracking fields to scheduled_emails and an atomic RPC to record opens.

ALTER TABLE scheduled_emails
  ADD COLUMN IF NOT EXISTS opened_at   timestamptz,
  ADD COLUMN IF NOT EXISTS open_count  integer NOT NULL DEFAULT 0;

-- Atomic update: sets opened_at on first open, always increments open_count.
-- Called by the public /track/open/[id] endpoint (SECURITY DEFINER bypasses RLS).
CREATE OR REPLACE FUNCTION track_email_open(email_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE scheduled_emails
  SET
    opened_at  = COALESCE(opened_at, NOW()),
    open_count = open_count + 1
  WHERE id = email_id;
$$;

-- Allow unauthenticated callers to invoke this one function (tracking pixel is public)
GRANT EXECUTE ON FUNCTION track_email_open(uuid) TO anon, authenticated;
