-- Add shooting_type and sort_order to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS shooting_type text,
  ADD COLUMN IF NOT EXISTS sort_order    integer DEFAULT 0;

-- Initialize sort_order based on created_at so existing projects get a sensible default
UPDATE projects
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY photographer_id ORDER BY created_at DESC) AS rn
  FROM projects
) sub
WHERE projects.id = sub.id;
