-- Migration 102: composite index for the main gallery photo query
--
-- The query in /api/photos/by-gallery executes:
--   SELECT ... FROM photos WHERE gallery_id = $1 ORDER BY display_order ASC
--
-- The existing index idx_photos_is_private covers (gallery_id, is_private)
-- but does NOT include display_order, so PostgreSQL sorts in memory after
-- filtering — O(n log n) sort for every gallery page load.
--
-- This index makes the query a pure index scan with pre-ordered results.
-- CONCURRENTLY allows creation without locking the table on production.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_gallery_order
  ON photos (gallery_id, display_order ASC);

-- Secondary index for section-filtered queries:
--   WHERE gallery_id = $1 AND section_id = $2 ORDER BY display_order ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_gallery_section_order
  ON photos (gallery_id, section_id, display_order ASC)
  WHERE section_id IS NOT NULL;
