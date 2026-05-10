-- Reusable service library per photographer
CREATE TABLE IF NOT EXISTS photographer_service_presets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES photographers(id) ON DELETE CASCADE NOT NULL,
  title           text NOT NULL,
  description     text,
  price           integer,   -- cents, optional
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE photographer_service_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_service_presets" ON photographer_service_presets
  FOR ALL USING (photographer_id = auth.uid());
