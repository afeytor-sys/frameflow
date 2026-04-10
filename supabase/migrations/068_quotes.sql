-- Interactive quotes (Angebote)
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Angebot',
  status text NOT NULL DEFAULT 'draft', -- draft | sent | accepted | expired
  valid_until date,
  client_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes text,
  tax_status text NOT NULL DEFAULT 'kleinunternehmer',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'fixed', -- fixed | single_choice | multiple_choice
  required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES quote_sections(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  unit_price integer NOT NULL DEFAULT 0, -- cents
  editable_qty boolean NOT NULL DEFAULT false,
  default_qty integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  client_name text,
  client_email text,
  selections jsonb NOT NULL DEFAULT '{}', -- { item_id: qty }
  total_amount integer NOT NULL DEFAULT 0, -- cents gross
  subtotal integer NOT NULL DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  ip_address text,
  converted_invoice_id uuid,
  submitted_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photographer owns quotes" ON quotes FOR ALL USING (photographer_id = auth.uid());
CREATE POLICY "photographer owns sections" ON quote_sections FOR ALL USING (
  quote_id IN (SELECT id FROM quotes WHERE photographer_id = auth.uid())
);
CREATE POLICY "photographer owns items" ON quote_items FOR ALL USING (
  quote_id IN (SELECT id FROM quotes WHERE photographer_id = auth.uid())
);
CREATE POLICY "photographer reads responses" ON quote_responses FOR SELECT USING (
  quote_id IN (SELECT id FROM quotes WHERE photographer_id = auth.uid())
);
CREATE POLICY "public reads quote by token" ON quotes FOR SELECT USING (true);
CREATE POLICY "public reads sections" ON quote_sections FOR SELECT USING (true);
CREATE POLICY "public reads items" ON quote_items FOR SELECT USING (true);
CREATE POLICY "public inserts response" ON quote_responses FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS quote_sections_quote_id ON quote_sections(quote_id);
CREATE INDEX IF NOT EXISTS quote_items_section_id ON quote_items(section_id);
CREATE INDEX IF NOT EXISTS quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS quote_responses_quote_id ON quote_responses(quote_id);
