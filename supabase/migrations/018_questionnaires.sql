-- Questionnaires: templates created by photographer
CREATE TABLE IF NOT EXISTS questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Submissions: answers from clients
CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage their questionnaires"
  ON questionnaires FOR ALL
  USING (photographer_id = auth.uid());

CREATE POLICY "Anyone can read questionnaires by project"
  ON questionnaires FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit answers"
  ON questionnaire_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Photographers read submissions"
  ON questionnaire_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires q
      WHERE q.id = questionnaire_id AND q.photographer_id = auth.uid()
    )
  );
