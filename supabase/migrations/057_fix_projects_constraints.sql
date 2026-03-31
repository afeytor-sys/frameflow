-- Migration 057: Fix projects table constraints
-- Safe to run multiple times — uses IF NOT EXISTS / ALTER COLUMN safely

-- 1. Make client_id nullable (may not have run from 009)
ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;

-- 2. Ensure all booking-related columns exist
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS shooting_type text,
  ADD COLUMN IF NOT EXISTS package text,
  ADD COLUMN IF NOT EXISTS include_video boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS portal_locale text,
  ADD COLUMN IF NOT EXISTS reminder_7d_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_disabled boolean DEFAULT false;
