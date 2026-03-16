-- ============================================================
-- Migration 025: Storage usage tracking
-- Adds storage_used_bytes cache column to photographers table
-- and a helper RPC function to calculate storage used.
-- ============================================================

-- 1. Add storage_used_bytes column to photographers
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint NOT NULL DEFAULT 0;

-- 2. Backfill existing data: sum file_size for all photos per photographer
UPDATE photographers p
SET storage_used_bytes = COALESCE((
  SELECT SUM(ph.file_size)
  FROM photos ph
  JOIN galleries g ON g.id = ph.gallery_id
  JOIN projects pr ON pr.id = g.project_id
  WHERE pr.photographer_id = p.id
    AND ph.file_size IS NOT NULL
), 0);

-- 3. RPC function: get total storage used by a photographer (reads from cache column)
CREATE OR REPLACE FUNCTION get_photographer_storage_used(photographer_uuid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(storage_used_bytes, 0)
  FROM photographers
  WHERE id = photographer_uuid;
$$;

-- 4. Trigger function: update storage_used_bytes on photo insert
CREATE OR REPLACE FUNCTION update_photographer_storage_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_photographer_id uuid;
BEGIN
  SELECT pr.photographer_id INTO v_photographer_id
  FROM galleries g
  JOIN projects pr ON pr.id = g.project_id
  WHERE g.id = NEW.gallery_id;

  IF v_photographer_id IS NOT NULL AND NEW.file_size IS NOT NULL THEN
    UPDATE photographers
    SET storage_used_bytes = storage_used_bytes + NEW.file_size
    WHERE id = v_photographer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Trigger function: update storage_used_bytes on photo delete
CREATE OR REPLACE FUNCTION update_photographer_storage_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_photographer_id uuid;
BEGIN
  SELECT pr.photographer_id INTO v_photographer_id
  FROM galleries g
  JOIN projects pr ON pr.id = g.project_id
  WHERE g.id = OLD.gallery_id;

  IF v_photographer_id IS NOT NULL AND OLD.file_size IS NOT NULL THEN
    UPDATE photographers
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - OLD.file_size)
    WHERE id = v_photographer_id;
  END IF;

  RETURN OLD;
END;
$$;

-- 6. Attach triggers to photos table
DROP TRIGGER IF EXISTS trg_photos_storage_insert ON photos;
CREATE TRIGGER trg_photos_storage_insert
  AFTER INSERT ON photos
  FOR EACH ROW EXECUTE FUNCTION update_photographer_storage_on_insert();

DROP TRIGGER IF EXISTS trg_photos_storage_delete ON photos;
CREATE TRIGGER trg_photos_storage_delete
  AFTER DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_photographer_storage_on_delete();
