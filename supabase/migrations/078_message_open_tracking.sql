-- Add open tracking columns to messages (inbox replies)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS opened_at   timestamptz,
  ADD COLUMN IF NOT EXISTS open_count  integer NOT NULL DEFAULT 0;

-- SECURITY DEFINER function so anon (email pixel load) can update
CREATE OR REPLACE FUNCTION track_message_open(message_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE messages
  SET
    opened_at  = COALESCE(opened_at, NOW()),
    open_count = open_count + 1
  WHERE id = message_id
    AND sender = 'photographer';  -- only track outbound messages
$$;

GRANT EXECUTE ON FUNCTION track_message_open(uuid) TO anon, authenticated;
