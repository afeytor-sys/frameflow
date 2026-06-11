-- Migration 103: Fix photos RLS policies for project-less galleries
--
-- Root cause: migration 101 made galleries.project_id nullable so photographers
-- can create galleries without linking a project. But the four photographer-scoped
-- policies on the photos table all use:
--
--   JOIN projects ON projects.id = galleries.project_id
--
-- When project_id IS NULL the JOIN produces no rows → EXISTS returns false →
-- every INSERT (and SELECT/UPDATE/DELETE) is rejected for those galleries.
--
-- Fix: replace the project JOIN with a direct check on galleries.photographer_id,
-- which is always set regardless of whether a project is linked.

-- SELECT ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_select_own" ON photos;
CREATE POLICY "photos_select_own"
  ON photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = photos.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));

-- INSERT ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_insert_own" ON photos;
CREATE POLICY "photos_insert_own"
  ON photos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = photos.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));

-- UPDATE ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_update_own" ON photos;
CREATE POLICY "photos_update_own"
  ON photos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = photos.gallery_id
      AND galleries.photographer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = photos.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));

-- DELETE ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_delete_own" ON photos;
CREATE POLICY "photos_delete_own"
  ON photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = photos.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));
