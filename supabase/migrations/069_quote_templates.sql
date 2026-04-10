-- Quote templates (Angebotsvorlagen)
CREATE TABLE IF NOT EXISTS quote_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Vorlage',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_template_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'fixed', -- fixed | single_choice | multiple_choice
  required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quote_template_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES quote_template_sections(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  unit_price integer NOT NULL DEFAULT 0, -- cents
  editable_qty boolean NOT NULL DEFAULT false,
  default_qty integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photographer owns templates" ON quote_templates
  FOR ALL USING (photographer_id = auth.uid());

CREATE POLICY "photographer owns template sections" ON quote_template_sections
  FOR ALL USING (
    template_id IN (SELECT id FROM quote_templates WHERE photographer_id = auth.uid())
  );

CREATE POLICY "photographer owns template items" ON quote_template_items
  FOR ALL USING (
    template_id IN (SELECT id FROM quote_templates WHERE photographer_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS quote_template_sections_template_id ON quote_template_sections(template_id);
CREATE INDEX IF NOT EXISTS quote_template_items_section_id ON quote_template_items(section_id);
CREATE INDEX IF NOT EXISTS quote_template_items_template_id ON quote_template_items(template_id);
