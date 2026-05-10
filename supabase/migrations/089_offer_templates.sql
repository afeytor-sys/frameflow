-- User-saved offer templates (photographer-specific)
CREATE TABLE IF NOT EXISTS photographer_offer_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES photographers(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  intro_text      text,
  base_price      integer,
  services        jsonb NOT NULL DEFAULT '[]',
  extras          jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE photographer_offer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_offer_templates" ON photographer_offer_templates
  FOR ALL USING (photographer_id = auth.uid());
