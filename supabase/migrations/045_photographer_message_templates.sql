-- ============================================================
-- Migration 045: Add portal_message_templates to photographers
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS portal_message_templates jsonb DEFAULT '[]'::jsonb;

-- Example structure:
-- [
--   { "label": "Begrüßung Hochzeit", "text": "Hallo ihr zwei 😊..." },
--   { "label": "Galerie bereit",     "text": "Eure Fotos sind fertig..." }
-- ]
