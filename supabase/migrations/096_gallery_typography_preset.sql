-- Add typography_preset to galleries for independent font/type control
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS typography_preset text NOT NULL DEFAULT 'editorial-serif';
