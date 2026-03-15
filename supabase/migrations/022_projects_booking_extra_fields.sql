-- Add extra booking fields to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS shoot_time          TEXT,
  ADD COLUMN IF NOT EXISTS shoot_duration      TEXT,
  ADD COLUMN IF NOT EXISTS num_persons         INTEGER,
  ADD COLUMN IF NOT EXISTS price               TEXT,
  ADD COLUMN IF NOT EXISTS custom_type_label   TEXT,
  ADD COLUMN IF NOT EXISTS custom_type_color   TEXT,
  ADD COLUMN IF NOT EXISTS custom_status_label TEXT,
  ADD COLUMN IF NOT EXISTS custom_status_color TEXT;
