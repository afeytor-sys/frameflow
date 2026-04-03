-- Gallery download jobs
-- Tracks async ZIP preparation status + stores presigned URLs for each part.
-- Rows expire after 24 hours and are cleaned up by a periodic cron or TTL.

create table if not exists gallery_download_jobs (
  id             uuid primary key default gen_random_uuid(),
  gallery_id     uuid not null references galleries(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending','processing','ready','failed')),
  parts          jsonb,           -- array of { name, url, photo_count, part_number, total_parts }
  processed_parts int default 0,
  error          text,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now()
);

-- Polling lookups are always by gallery_id + status or by id.
create index if not exists gallery_download_jobs_gallery_id_idx
  on gallery_download_jobs (gallery_id, status, expires_at);

-- Public read: client gallery page polls for its own job status.
alter table gallery_download_jobs enable row level security;

create policy "Anyone can read download jobs"
  on gallery_download_jobs for select
  using (true);

-- Inserts/updates are done by service-role only (worker uses createServiceClient).
-- No insert/update policy needed for anon.
