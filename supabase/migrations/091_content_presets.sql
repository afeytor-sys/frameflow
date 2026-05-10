-- Library presets for intro texts, link blocks, and text blocks
CREATE TABLE IF NOT EXISTS photographer_content_presets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES photographers(id) ON DELETE CASCADE NOT NULL,
  preset_type     text NOT NULL CHECK (preset_type IN ('intro', 'link', 'textblock')),
  name            text NOT NULL,
  data            jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE photographer_content_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_content_presets" ON photographer_content_presets
  FOR ALL USING (photographer_id = auth.uid());
