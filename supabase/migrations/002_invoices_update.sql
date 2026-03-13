-- ─────────────────────────────────────────────
-- Migration 002: Update invoices table
-- Add missing columns: photographer_id, description, invoice_number
-- ─────────────────────────────────────────────

-- Add photographer_id if not exists
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES photographers(id) ON DELETE CASCADE;

-- Add description
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS description text;

-- Add invoice_number
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- Update existing rows to set photographer_id from project
UPDATE invoices i
SET photographer_id = p.photographer_id
FROM projects p
WHERE i.project_id = p.id
  AND i.photographer_id IS NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS invoices_photographer_id_idx ON invoices(photographer_id);
CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON invoices(project_id);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photographers manage own invoices" ON invoices;
CREATE POLICY "Photographers manage own invoices"
  ON invoices FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
