-- Auto-increment gallery.download_count whenever a download job becomes 'ready'.
-- Replaces the manual read-modify-write in /prepare (which was racy and read stale anon values).
-- Fires on both INSERT (reuse path: new job inserted as ready) and UPDATE (fresh job marked ready by CF Worker).

CREATE OR REPLACE FUNCTION auto_increment_gallery_download_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ready' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'ready') THEN
    UPDATE galleries
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = NEW.gallery_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_gallery_download_count ON gallery_download_jobs;

CREATE TRIGGER trg_gallery_download_count
AFTER INSERT OR UPDATE OF status ON gallery_download_jobs
FOR EACH ROW
EXECUTE FUNCTION auto_increment_gallery_download_count();
