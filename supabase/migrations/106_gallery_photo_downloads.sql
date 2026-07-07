-- Tracks individual photo downloads from client galleries.
-- Logged server-side via the service role when a client downloads a photo
-- after entering their email in the gate modal.

create table if not exists gallery_photo_downloads (
  id            uuid primary key default gen_random_uuid(),
  gallery_id    uuid not null references galleries(id) on delete cascade,
  photo_id      uuid references photos(id) on delete set null,
  email         text not null,
  filename      text not null,
  downloaded_at timestamptz not null default now()
);

create index if not exists gallery_photo_downloads_gallery_idx
  on gallery_photo_downloads (gallery_id, downloaded_at desc);

alter table gallery_photo_downloads enable row level security;

-- Photographers can read their own gallery's download activity.
create policy "Gallery owner can read photo downloads"
  on gallery_photo_downloads for select
  using (
    exists (
      select 1 from galleries g
      join projects p on p.id = g.project_id
      where g.id = gallery_photo_downloads.gallery_id
        and p.photographer_id = auth.uid()
    )
  );

-- Inserts are done server-side via service role (bypasses RLS).
-- No anon insert policy needed.
