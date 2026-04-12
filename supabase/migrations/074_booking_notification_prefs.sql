ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_new_booking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_new_booking boolean NOT NULL DEFAULT true;
