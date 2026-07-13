-- Fixes a bug where a guest (Gäste-password) "download all" request could be
-- served a stale ZIP that was built earlier for the Kunden (owner) view,
-- before some photos were marked private — leaking private photos to guests.
--
-- gallery_download_jobs is now scoped per access level: a guest job only ever
-- contains public (non-private) photos, and is deduped/reused separately from
-- owner jobs, which contain every photo.

alter table gallery_download_jobs
  add column if not exists is_guest boolean not null default false;

create index if not exists idx_gallery_download_jobs_guest_lookup
  on gallery_download_jobs (gallery_id, is_guest, status, expires_at);
