-- Migration 111: Store (products, variants, coupons, orders)

CREATE TABLE IF NOT EXISTS store_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  title           text NOT NULL,
  description     text,
  cover_url       text,
  gallery_id      uuid REFERENCES galleries(id) ON DELETE SET NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, slug)
);

CREATE TABLE IF NOT EXISTS store_product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  label       text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  code            text NOT NULL,
  discount_type   text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  integer NOT NULL CHECK (discount_value > 0),
  valid_until     timestamptz,
  max_uses        integer,
  used_count      integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, code)
);

CREATE TABLE IF NOT EXISTS store_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES store_products(id) ON DELETE SET NULL,
  variant_id        uuid REFERENCES store_product_variants(id) ON DELETE SET NULL,
  coupon_id         uuid REFERENCES store_coupons(id) ON DELETE SET NULL,
  product_title     text NOT NULL,
  variant_label     text NOT NULL,
  client_name       text NOT NULL,
  client_email      text NOT NULL,
  shipping_address  jsonb NOT NULL,
  favorite_photo_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents    integer NOT NULL,
  discount_cents    integer NOT NULL DEFAULT 0,
  total_cents       integer NOT NULL,
  currency          text NOT NULL DEFAULT 'eur',
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'in_production', 'shipped', 'cancelled')),
  payment_method    text NOT NULL DEFAULT 'bank_transfer'
                    CHECK (payment_method IN ('bank_transfer', 'stripe')),
  payment_reference text NOT NULL,
  stripe_session_id text,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_products_photographer_idx ON store_products(photographer_id);
CREATE INDEX IF NOT EXISTS store_variants_product_idx ON store_product_variants(product_id);
CREATE INDEX IF NOT EXISTS store_coupons_photographer_idx ON store_coupons(photographer_id);
CREATE INDEX IF NOT EXISTS store_orders_photographer_idx ON store_orders(photographer_id, created_at DESC);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_products_own" ON store_products FOR ALL
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "store_products_public_read" ON store_products FOR SELECT
  USING (active = true);

CREATE POLICY "store_variants_own" ON store_product_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM store_products p WHERE p.id = product_id AND p.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM store_products p WHERE p.id = product_id AND p.photographer_id = auth.uid()));

CREATE POLICY "store_variants_public_read" ON store_product_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM store_products p WHERE p.id = product_id AND p.active = true));

CREATE POLICY "store_coupons_own" ON store_coupons FOR ALL
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "store_orders_own" ON store_orders FOR ALL
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());
