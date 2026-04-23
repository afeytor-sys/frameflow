ALTER TABLE gallery_download_jobs
  ADD COLUMN IF NOT EXISTS total_parts integer;
