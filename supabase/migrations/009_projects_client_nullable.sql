-- Make client_id nullable in projects table
-- This allows creating bookings/projects without a client assigned yet
-- Run this in Supabase SQL Editor

ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;

-- Also add 'inquiry' to project_status ENUM for completeness
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'inquiry';
