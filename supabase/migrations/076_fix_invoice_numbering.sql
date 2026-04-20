-- ─────────────────────────────────────────────────────────────────
-- Migration 076: Fix invoice numbering to skip already-used numbers
-- ─────────────────────────────────────────────────────────────────
-- Patches generate_next_invoice_number and peek_next_invoice_number
-- to skip any invoice numbers that already exist in the invoices
-- table, keeping the counter in sync even if it drifted.

CREATE OR REPLACE FUNCTION peek_next_invoice_number(p_photographer_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_prefix    text;
  v_start     integer;
  v_last      integer;
  v_next      integer;
  v_candidate text;
  v_exists    boolean;
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

  v_next := COALESCE(v_last, v_start - 1) + 1;

  -- Also consider the real max in the invoices table
  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ ('^' || regexp_replace(v_prefix, '([^a-zA-Z0-9])', '\\\1', 'g') || '[0-9]+$')
      THEN CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO v_next
  FROM (SELECT GREATEST(v_next - 1,
    COALESCE((
      SELECT MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS integer))
      FROM invoices
      WHERE photographer_id = p_photographer_id
        AND invoice_number LIKE v_prefix || '%'
        AND invoice_number ~ ('^' || v_prefix || '[0-9]+$')
    ), 0)
  ) AS base) sub, (SELECT v_next AS base2) sub2
  LIMIT 1;

  -- Recalculate simply:
  SELECT GREATEST(
    COALESCE(v_last, v_start - 1) + 1,
    COALESCE((
      SELECT MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS integer))
      FROM invoices
      WHERE photographer_id = p_photographer_id
        AND invoice_number LIKE v_prefix || '%'
        AND invoice_number ~ ('^' || v_prefix || '[0-9]+$')
    ), 0) + 1
  ) INTO v_next;

  -- Skip any that already exist
  LOOP
    v_candidate := v_prefix || lpad(v_next::text, 3, '0');
    SELECT EXISTS(
      SELECT 1 FROM invoices
      WHERE photographer_id = p_photographer_id AND invoice_number = v_candidate
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_next := v_next + 1;
  END LOOP;

  RETURN v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION generate_next_invoice_number(p_photographer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix    text;
  v_start     integer;
  v_last      integer;
  v_next      integer;
  v_candidate text;
  v_exists    boolean;
BEGIN
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

  -- Start from the higher of: counter+1 or actual max in invoices table+1
  SELECT GREATEST(
    COALESCE(v_last, v_start - 1) + 1,
    COALESCE((
      SELECT MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS integer))
      FROM invoices
      WHERE photographer_id = p_photographer_id
        AND invoice_number LIKE v_prefix || '%'
        AND invoice_number ~ ('^' || v_prefix || '[0-9]+$')
    ), 0) + 1
  ) INTO v_next;

  -- Skip any numbers that already exist (handles gaps)
  LOOP
    v_candidate := v_prefix || lpad(v_next::text, 3, '0');
    SELECT EXISTS(
      SELECT 1 FROM invoices
      WHERE photographer_id = p_photographer_id AND invoice_number = v_candidate
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_next := v_next + 1;
  END LOOP;

  -- Persist the new counter value
  UPDATE photographers
  SET last_invoice_number = v_next
  WHERE id = p_photographer_id;

  RETURN v_candidate;
END;
$$;
