-- Gallery sections (like Pixieset "Sets")
CREATE TABLE IF NOT EXISTS gallery_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Unbenannt',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add section_id to photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES gallery_sections(id) ON DELETE SET NULL;

-- Add design_theme to galleries (stores theme key like 'classic-white', 'midnight-black', etc.)
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS design_theme TEXT DEFAULT 'classic-white';

-- RLS for gallery_sections
ALTER TABLE gallery_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can manage their gallery sections"
  ON gallery_sections
  FOR ALL
  USING (
    gallery_id IN (
      SELECT id FROM galleries WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Public can read gallery sections"
  ON gallery_sections
  FOR SELECT
  USING (
    gallery_id IN (
      SELECT id FROM galleries WHERE status = 'active'
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_gallery_sections_gallery_id ON gallery_sections(gallery_id);
CREATE INDEX IF NOT EXISTS idx_photos_section_id ON photos(section_id);
