-- Add notification preference columns to automation_settings
-- These control what the PHOTOGRAPHER receives (in-app + email)

ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS notify_inapp_contract_signed   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_contract_signed   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_viewed    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_viewed    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_questionnaire     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_questionnaire     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_photo_downloaded  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_photo_downloaded  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp_gallery_downloaded boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_gallery_downloaded boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_favorite_marked   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_favorite_marked   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_email_shoot_reminder_photographer boolean DEFAULT true;
