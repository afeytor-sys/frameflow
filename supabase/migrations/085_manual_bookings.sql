-- Allow creating bookings without a booking_type (manual/lightweight bookings)
ALTER TABLE bookings ALTER COLUMN booking_type_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manual_title text;

-- Update RLS select policy to handle null booking_type_id
DROP POLICY IF EXISTS "Photographers can view own bookings" ON bookings;
CREATE POLICY "Photographers can view own bookings"
  ON bookings FOR SELECT
  USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS "Photographers can update own bookings" ON bookings;
CREATE POLICY "Photographers can update own bookings"
  ON bookings FOR UPDATE
  USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS "Photographers can insert own bookings" ON bookings;
CREATE POLICY "Photographers can insert own bookings"
  ON bookings FOR INSERT
  WITH CHECK (photographer_id = auth.uid());
