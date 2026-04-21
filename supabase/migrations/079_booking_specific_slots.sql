-- Add specific_slots column to booking_types for 'slots' availability type
ALTER TABLE booking_types
  ADD COLUMN IF NOT EXISTS specific_slots jsonb NOT NULL DEFAULT '[]';
