-- Add gallery_links to offer templates (stores link blocks + text blocks)
ALTER TABLE photographer_offer_templates
  ADD COLUMN IF NOT EXISTS gallery_links jsonb NOT NULL DEFAULT '[]';
