-- Track when the download-ready email was sent to prevent duplicate sends
alter table gallery_download_jobs
  add column if not exists email_sent_at timestamptz;
