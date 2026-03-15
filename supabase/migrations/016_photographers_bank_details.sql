-- Add bank account details to photographers table
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_name           text,
  ADD COLUMN IF NOT EXISTS bank_iban           text,
  ADD COLUMN IF NOT EXISTS bank_bic            text;
