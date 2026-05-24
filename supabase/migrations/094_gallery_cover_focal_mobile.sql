-- Separate focal point for mobile viewport (same photo, different crop origin)
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS cover_focal_x_mobile smallint NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cover_focal_y_mobile smallint NOT NULL DEFAULT 50;
