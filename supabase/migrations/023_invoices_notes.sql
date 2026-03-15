-- Add internal notes field to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS notes TEXT;
