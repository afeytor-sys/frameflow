-- Add password column to galleries table
-- Used to protect individual gallery access with a password

ALTER TABLE galleries ADD COLUMN IF NOT EXISTS password text DEFAULT NULL;
