-- ─── Interactive Proposal (Offer) System ────────────────────────────────────

CREATE TABLE IF NOT EXISTS offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES photographers(id) ON DELETE CASCADE NOT NULL,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  title           text NOT NULL,
  slug            text UNIQUE NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','viewed','accepted','expired','declined')),
  event_date      date,
  valid_until     date,
  base_price      integer NOT NULL DEFAULT 0,   -- cents
  currency        text NOT NULL DEFAULT 'EUR',
  deposit_amount  integer,                       -- cents, optional
  intro_text      text,
  notes           text,
  gallery_links   jsonb NOT NULL DEFAULT '[]',   -- [{label, url}]
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    uuid REFERENCES offers(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  description text,
  included    boolean NOT NULL DEFAULT true,
  price       integer,                           -- cents, null = part of base price
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS offer_extras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    uuid REFERENCES offers(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  description text,
  price       integer NOT NULL DEFAULT 0,        -- cents
  selectable  boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_extras ENABLE ROW LEVEL SECURITY;

-- Photographer owns their offers
CREATE POLICY "photographer_own_offers" ON offers
  FOR ALL USING (photographer_id = auth.uid());

-- Offer services follow offer ownership
CREATE POLICY "photographer_own_offer_services" ON offer_services
  FOR ALL USING (
    offer_id IN (SELECT id FROM offers WHERE photographer_id = auth.uid())
  );

-- Offer extras follow offer ownership
CREATE POLICY "photographer_own_offer_extras" ON offer_extras
  FOR ALL USING (
    offer_id IN (SELECT id FROM offers WHERE photographer_id = auth.uid())
  );

-- Public read for published offers (by slug)
CREATE POLICY "public_view_sent_offers" ON offers
  FOR SELECT USING (status IN ('sent','viewed','accepted','expired','declined'));

CREATE POLICY "public_view_offer_services" ON offer_services
  FOR SELECT USING (
    offer_id IN (
      SELECT id FROM offers WHERE status IN ('sent','viewed','accepted','expired','declined')
    )
  );

CREATE POLICY "public_view_offer_extras" ON offer_extras
  FOR SELECT USING (
    offer_id IN (
      SELECT id FROM offers WHERE status IN ('sent','viewed','accepted','expired','declined')
    )
  );

-- Service-role can update offer status (for accept action via anon)
CREATE POLICY "service_update_offer_status" ON offers
  FOR UPDATE USING (true);
