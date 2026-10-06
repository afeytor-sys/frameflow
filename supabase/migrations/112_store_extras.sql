-- Migration 112: Store extras (optional add-ons per product, e.g. gift box, +10 pages)

CREATE TABLE IF NOT EXISTS store_product_extras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  label       text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_extras_product_idx ON store_product_extras(product_id);

ALTER TABLE store_product_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_extras_own" ON store_product_extras FOR ALL
  USING (EXISTS (SELECT 1 FROM store_products p WHERE p.id = product_id AND p.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM store_products p WHERE p.id = product_id AND p.photographer_id = auth.uid()));

CREATE POLICY "store_extras_public_read" ON store_product_extras FOR SELECT
  USING (EXISTS (SELECT 1 FROM store_products p WHERE p.id = product_id AND p.active = true));

-- Snapshot of the chosen extras on each order: [{ "label": "...", "price_cents": 1000 }]
ALTER TABLE store_orders
  ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;
