-- Extend hero_style CHECK constraint to include frame, journal, luxury
ALTER TABLE galleries DROP CONSTRAINT IF EXISTS galleries_hero_style_check;

ALTER TABLE galleries
  ADD CONSTRAINT galleries_hero_style_check
  CHECK (hero_style IN ('cinematic', 'classic', 'minimal', 'editorial', 'frame', 'journal', 'luxury'));
