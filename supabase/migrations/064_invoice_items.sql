-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit_price integer NOT NULL DEFAULT 0,  -- in cents
  total integer NOT NULL DEFAULT 0,       -- quantity * unit_price, in cents
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage their invoice items"
  ON invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE photographer_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items(invoice_id);
