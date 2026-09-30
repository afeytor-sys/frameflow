-- Migration 109: Fix gallery_sections RLS policies for project-less galleries
--
-- Root cause: migration 007 added a second policy "gallery_sections_all_own"
-- that checks ownership via
--
--   JOIN projects ON projects.id = galleries.project_id
--
-- Migration 101 later made galleries.project_id nullable so photographers
-- can create standalone galleries. For those, the JOIN produces no rows,
-- so this policy denies access — creating a "Set" in a project-less
-- gallery fails. (Same class of bug fixed for the `photos` table in
-- migration 103.)
--
-- Fix: drop every existing policy on gallery_sections and recreate them
-- checking galleries.photographer_id directly, which is always set
-- regardless of whether a project is linked.

DROP POLICY IF EXISTS "Photographers can manage their gallery sections" ON gallery_sections;
DROP POLICY IF EXISTS "Public can read gallery sections" ON gallery_sections;
DROP POLICY IF EXISTS "gallery_sections_all_own" ON gallery_sections;
DROP POLICY IF EXISTS "gallery_sections_select_public" ON gallery_sections;
DROP POLICY IF EXISTS "gallery_sections_insert_own" ON gallery_sections;
DROP POLICY IF EXISTS "gallery_sections_update_own" ON gallery_sections;
DROP POLICY IF EXISTS "gallery_sections_delete_own" ON gallery_sections;

CREATE POLICY "gallery_sections_select_public"
  ON gallery_sections FOR SELECT USING (true);

CREATE POLICY "gallery_sections_insert_own"
  ON gallery_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = gallery_sections.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));

CREATE POLICY "gallery_sections_update_own"
  ON gallery_sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = gallery_sections.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));

CREATE POLICY "gallery_sections_delete_own"
  ON gallery_sections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = gallery_sections.gallery_id
      AND galleries.photographer_id = auth.uid()
  ));
