-- ============================================================
-- Migration 047: Custom shooting types per photographer
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add custom_shooting_types column to photographers
-- Stores an array of { label: string, color: string }
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS custom_shooting_types jsonb DEFAULT '[]'::jsonb;

-- Also ensure shooting_type column exists on projects (for list display)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS shooting_type text;
