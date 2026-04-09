-- Extended photographer profile for professional invoices
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'Deutschland',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  -- 'kleinunternehmer' | 'vat_19' | 'vat_7'
  ADD COLUMN IF NOT EXISTS tax_status text NOT NULL DEFAULT 'kleinunternehmer';
