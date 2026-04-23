-- Replaces the JSONB `parts` race-condition pattern with a proper relational table.
-- Each row is one ZIP part for one download job.
-- UNIQUE (job_id, part_number) prevents duplicates; no read-modify-write needed.

CREATE TABLE IF NOT EXISTS gallery_download_parts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       uuid        NOT NULL REFERENCES gallery_download_jobs(id) ON DELETE CASCADE,
  part_number  integer     NOT NULL,
  total_parts  integer     NOT NULL,
  gallery_id   uuid        NOT NULL,
  part_name    text        NOT NULL,
  r2_key       text        NOT NULL,
  photo_ids    text[]      NOT NULL,
  photo_count  integer     NOT NULL,
  timestamp    text        NOT NULL,
  status       text        NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (job_id, part_number)
);

CREATE INDEX IF NOT EXISTS gallery_download_parts_job_idx
  ON gallery_download_parts(job_id);

CREATE INDEX IF NOT EXISTS gallery_download_parts_status_idx
  ON gallery_download_parts(job_id, status);
