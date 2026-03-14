-- Add missing columns to galleries table
-- Run this in Supabase SQL Editor

ALTER TABLE galleries ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS design_theme text;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS tags_enabled text[];
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES photographers(id) ON DELETE SET NULL;

-- Add missing columns to photos table
ALTER TABLE photos ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS tag text;

-- Create gallery_sections table if not exists
CREATE TABLE IF NOT EXISTS gallery_sections (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id    uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT 'Set',
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on gallery_sections
ALTER TABLE gallery_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "gallery_sections_select_public"
  ON gallery_sections FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "gallery_sections_all_own"
  ON gallery_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      JOIN projects ON projects.id = galleries.project_id
      WHERE galleries.id = gallery_sections.gallery_id
      AND projects.photographer_id = auth.uid()
    )
  );
