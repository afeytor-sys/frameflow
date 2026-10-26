-- Optional per-form redirect URL, shown to the visitor's browser after a
-- successful submit instead of the default confirmation message.
-- NULL (the default) keeps existing forms behaving exactly as before.
ALTER TABLE forms ADD COLUMN IF NOT EXISTS redirect_url text;
