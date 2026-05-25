-- Add shooting_type to manual bookings so type pills are persisted
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shooting_type text;
