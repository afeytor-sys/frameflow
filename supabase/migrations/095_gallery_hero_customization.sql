-- Gallery hero style and spacing density options
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS hero_style text NOT NULL DEFAULT 'cinematic'
    CHECK (hero_style IN ('cinematic', 'classic', 'minimal', 'editorial')),
  ADD COLUMN IF NOT EXISTS spacing_density text NOT NULL DEFAULT 'balanced'
    CHECK (spacing_density IN ('compact', 'balanced', 'airy'));
