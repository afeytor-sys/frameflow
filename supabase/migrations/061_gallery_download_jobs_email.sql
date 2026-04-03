-- Add email delivery fields to gallery_download_jobs
alter table gallery_download_jobs
  add column if not exists email text,
  add column if not exists download_token text unique,
  add column if not exists token_expires_at timestamptz;

-- Fast lookup by download_token (used by /download/[token] page)
create index if not exists idx_gallery_download_jobs_download_token
  on gallery_download_jobs (download_token)
  where download_token is not null;
