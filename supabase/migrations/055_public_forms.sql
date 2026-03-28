-- ── Public Form System Migration ────────────────────────────────────────────
-- Creates: forms, leads, conversations, messages
-- All tables use service role for public inserts (no auth required)

-- 1. forms — photographer creates and shares these
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forms_photographer_id_idx ON forms(photographer_id);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- Photographers can manage their own forms
CREATE POLICY "photographers can manage own forms"
  ON forms FOR ALL
  USING (photographer_id = auth.uid());

-- Public read: anyone with the form ID can fetch it (needed for the public form page)
CREATE POLICY "public can read forms"
  ON forms FOR SELECT
  USING (true);


-- 2. leads — one record per form submission
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_photographer_id_idx ON leads(photographer_id);
CREATE INDEX IF NOT EXISTS leads_form_id_idx ON leads(form_id);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Photographers can read their own leads
CREATE POLICY "photographers can read own leads"
  ON leads FOR SELECT
  USING (photographer_id = auth.uid());

-- Public insert via service role (API route uses service client)
CREATE POLICY "service role can insert leads"
  ON leads FOR INSERT
  WITH CHECK (true);


-- 3. conversations — inbox thread per lead
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  lead_email text NOT NULL,
  lead_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_photographer_id_idx ON conversations(photographer_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Photographers can manage their own conversations
CREATE POLICY "photographers can manage own conversations"
  ON conversations FOR ALL
  USING (photographer_id = auth.uid());

-- Public insert via service role
CREATE POLICY "service role can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);


-- 4. messages — individual messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('lead', 'photographer')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Photographers can manage messages in their conversations
CREATE POLICY "photographers can manage own messages"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE photographer_id = auth.uid()
    )
  );

-- Public insert via service role
CREATE POLICY "service role can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);
