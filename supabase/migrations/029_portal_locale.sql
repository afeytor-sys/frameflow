-- Add portal_locale to projects (per-project language override)
-- and locale to photographers (photographer's preferred language)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_locale text DEFAULT NULL;

ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'de';

-- Update existing photographers to use their 'language' field if it exists
UPDATE photographers SET locale = language WHERE language IS NOT NULL AND language IN ('de', 'en');
