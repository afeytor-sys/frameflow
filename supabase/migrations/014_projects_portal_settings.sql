-- Add portal visibility settings and custom photographer message to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_sections jsonb DEFAULT '{"contract":true,"gallery":true,"timeline":true,"treffpunkt":true,"moodboard":true,"tips":true,"weather":true}'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_message text;
