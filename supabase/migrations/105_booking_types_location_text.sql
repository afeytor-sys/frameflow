-- Add location_text to booking_types for photographer-defined meeting points
ALTER TABLE booking_types ADD COLUMN IF NOT EXISTS location_text text;
