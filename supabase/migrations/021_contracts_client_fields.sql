-- Add client_fields column to contracts table
-- Stores the values filled in by the client for {{variable}} placeholders
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_fields JSONB DEFAULT '{}';
