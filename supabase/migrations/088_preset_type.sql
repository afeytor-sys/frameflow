-- Add preset_type to distinguish service presets from extra presets
ALTER TABLE photographer_service_presets
  ADD COLUMN IF NOT EXISTS preset_type text NOT NULL DEFAULT 'service'
  CHECK (preset_type IN ('service', 'extra'));
