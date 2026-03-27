-- Ensure client_fields column exists on contracts table
-- (idempotent — safe to run even if already applied via migration 021)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_fields JSONB DEFAULT '{}';
