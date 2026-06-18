-- Add share_token (auto-generated UUID) and custom_slug to galleries table
-- so project-less galleries can have a unique public share URL.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS custom_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS galleries_share_token_key
  ON galleries (share_token);

CREATE UNIQUE INDEX IF NOT EXISTS galleries_custom_slug_idx
  ON galleries (custom_slug)
  WHERE custom_slug IS NOT NULL;
