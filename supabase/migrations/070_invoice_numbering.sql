-- ─────────────────────────────────────────────────────────────────
-- Migration 070: Sequential invoice numbering per photographer
-- ─────────────────────────────────────────────────────────────────

-- 1. Add sequencing columns to photographers
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS invoice_prefix        text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_start_number  integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_invoice_number   integer;           -- NULL = never issued

-- 2. Unique constraint: no two invoices for the same photographer may share a number.
--    This is the ultimate safety net against race conditions.
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_photographer_number_unique;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_photographer_number_unique
    UNIQUE (photographer_id, invoice_number);

-- ─────────────────────────────────────────────────────────────────
-- 3. peek_next_invoice_number
--    Read-only preview — safe to call when opening the create form.
--    Does NOT increment the counter.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION peek_next_invoice_number(p_photographer_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_prefix text;
  v_start  integer;
  v_last   integer;
  v_next   integer;
BEGIN
  SELECT
    COALESCE(invoice_prefix, ''),
    COALESCE(invoice_start_number, 1),
    last_invoice_number
  INTO v_prefix, v_start, v_last
  FROM photographers
  WHERE id = p_photographer_id;

  IF NOT FOUND THEN
    RETURN 'INV-001';
  END IF;

  -- If no invoice has ever been issued, start at invoice_start_number
  v_next := COALESCE(v_last, v_start - 1) + 1;

  RETURN v_prefix || lpad(v_next::text, 3, '0');
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 4. generate_next_invoice_number
--    Atomically increments the counter and returns the number.
--    Uses FOR UPDATE to serialize concurrent calls — two
--    simultaneous invoice creations will queue and each receive
--    a different, unique number.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_next_invoice_number(p_photographer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix text;
  v_start  integer;
  v_last   integer;
  v_next   integer;
BEGIN
  -- Lock the photographer row for this transaction.
  -- Concurrent calls block here until the current transaction commits.
  SELECT
    COALESCE(invoice_prefix, ''),
    COALESCE(invoice_start_number, 1),
    last_invoice_number
  INTO v_prefix, v_start, v_last
  FROM photographers
  WHERE id = p_photographer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photographer % not found', p_photographer_id;
  END IF;

  v_next := COALESCE(v_last, v_start - 1) + 1;

  -- Persist the new counter value atomically
  UPDATE photographers
  SET last_invoice_number = v_next
  WHERE id = p_photographer_id;

  RETURN v_prefix || lpad(v_next::text, 3, '0');
END;
$$;
