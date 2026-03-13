-- ─────────────────────────────────────────────
-- Migration 001: photo_comments + moodboard_items
-- ─────────────────────────────────────────────

-- Photo comments
CREATE TABLE IF NOT EXISTS photo_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id    uuid REFERENCES photos(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  comment     text NOT NULL,
  created_at  timestamp DEFAULT now()
);

-- Enable RLS
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- Photographers can read comments on their projects
CREATE POLICY "photographers_read_comments" ON photo_comments
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE photographer_id = auth.uid()
    )
  );

-- Anyone with the project token can insert (handled via API route, no auth needed)
-- We use a service role in the API route for inserts

-- Moodboard items
CREATE TABLE IF NOT EXISTS moodboard_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  type          text CHECK (type IN ('image', 'link')) DEFAULT 'image',
  url           text NOT NULL,
  caption       text,
  display_order int DEFAULT 0,
  created_at    timestamp DEFAULT now()
);

ALTER TABLE moodboard_items ENABLE ROW LEVEL SECURITY;

-- Photographers can read/delete moodboard items on their projects
CREATE POLICY "photographers_read_moodboard" ON moodboard_items
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "photographers_delete_moodboard" ON moodboard_items
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE photographer_id = auth.uid()
    )
  );

-- Add comments_enabled column to galleries
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS comments_enabled boolean DEFAULT true;
