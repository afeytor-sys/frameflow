-- Add photographer signature fields to contracts table
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS photographer_signed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS photographer_signed_by_name text,
  ADD COLUMN IF NOT EXISTS photographer_signature_data text;
