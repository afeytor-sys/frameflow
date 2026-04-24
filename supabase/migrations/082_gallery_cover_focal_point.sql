-- Add focal point to gallery cover photo (0-100 percentage, default center)
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS cover_focal_x smallint NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cover_focal_y smallint NOT NULL DEFAULT 50;
