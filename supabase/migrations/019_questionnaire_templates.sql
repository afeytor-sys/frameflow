-- Custom questionnaire templates saved by photographers
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage their questionnaire templates"
  ON questionnaire_templates FOR ALL
  USING (photographer_id = auth.uid());
