-- Add 'request' as a valid availability_type for booking types
ALTER TABLE booking_types
  DROP CONSTRAINT IF EXISTS booking_types_availability_type_check;

ALTER TABLE booking_types
  ADD CONSTRAINT booking_types_availability_type_check
  CHECK (availability_type IN ('slots', 'recurring', 'request'));
