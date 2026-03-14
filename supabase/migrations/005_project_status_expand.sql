-- Expand project_status ENUM with new workflow values
-- Run this in Supabase SQL Editor

ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'booked';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'shooting';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'editing';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'cancelled';
