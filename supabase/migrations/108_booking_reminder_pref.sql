-- Separate toggle for the automatic 24h-before reminder sent to clients who booked
-- an online (video call) booking type — independent from the project shoot
-- reminder_7d/reminder_1d toggles, which only apply to projects.shoot_date.
ALTER TABLE automation_settings
  ADD COLUMN IF NOT EXISTS reminder_booking_online boolean NOT NULL DEFAULT true;
