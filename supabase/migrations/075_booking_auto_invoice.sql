ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS auto_invoice_on_complete boolean NOT NULL DEFAULT true;
