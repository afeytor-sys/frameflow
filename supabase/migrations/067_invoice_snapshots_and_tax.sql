-- Snapshot photographer/client data at invoice creation time
-- so old invoices remain unchanged when profiles are updated.
-- Also adds proper tax fields.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS photographer_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS client_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS tax_status text NOT NULL DEFAULT 'kleinunternehmer',
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal integer NOT NULL DEFAULT 0,   -- in cents
  ADD COLUMN IF NOT EXISTS tax_amount integer NOT NULL DEFAULT 0; -- in cents
-- amount stays as gross total for backward compat
