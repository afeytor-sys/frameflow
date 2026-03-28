-- Add new_inquiry notification toggles to automation_settings
-- These control whether the photographer gets notified when a form inquiry is submitted

ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_new_inquiry boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_new_inquiry boolean DEFAULT true;

-- Update existing rows to have the default values
UPDATE automation_settings
SET
  notify_inapp_new_inquiry = true,
  notify_email_new_inquiry = true
WHERE notify_inapp_new_inquiry IS NULL
   OR notify_email_new_inquiry IS NULL;
