-- Add company name to clients (address fields already exist from migration 020)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company_name text;
