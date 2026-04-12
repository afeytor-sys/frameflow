-- Migration 072: Self-service booking system
-- Photographers can create BookingTypes (service templates) with availability,
-- custom questions, and Anzahlung (deposit) configuration.
-- Clients access: /b/{photographer-slug}/{booking-type-slug}

-- ── Photographer public slug ──────────────────────────────────────────────────
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS photographers_slug_idx ON photographers(slug)
  WHERE slug IS NOT NULL;

-- ── Booking Types ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_types (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id     uuid REFERENCES photographers(id) ON DELETE CASCADE NOT NULL,
  slug                text NOT NULL,
  title               text NOT NULL,
  description         text,
  duration_minutes    integer NOT NULL DEFAULT 60,
  location_type       text NOT NULL DEFAULT 'external'
                      CHECK (location_type IN ('studio','external','online')),
  price               integer NOT NULL DEFAULT 0,   -- cents
  currency            text NOT NULL DEFAULT 'EUR',
  availability_type   text NOT NULL DEFAULT 'recurring'
                      CHECK (availability_type IN ('slots','recurring')),
  buffer_minutes      integer NOT NULL DEFAULT 0,   -- gap between bookings
  max_advance_days    integer NOT NULL DEFAULT 60,  -- how far ahead clients can book
  min_notice_hours    integer NOT NULL DEFAULT 24,  -- minimum notice required
  questions           jsonb NOT NULL DEFAULT '[]',  -- [{id,label,type,options,required}]
  -- Anzahlung (deposit)
  anzahlung_enabled   boolean NOT NULL DEFAULT false,
  anzahlung_type      text CHECK (anzahlung_type IN ('fixed','percent')),
  anzahlung_amount    integer,  -- cents if fixed; basis points (e.g. 3000 = 30%) if percent
  anzahlung_days_due  integer,  -- days before shoot by which deposit must be paid
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, slug)
);

CREATE INDEX IF NOT EXISTS booking_types_photographer_idx
  ON booking_types(photographer_id, active);

-- ── Recurring availability windows (per day of week) ─────────────────────────
-- Used when booking_types.availability_type = 'recurring'
CREATE TABLE IF NOT EXISTS booking_recurring_availability (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type_id uuid REFERENCES booking_types(id) ON DELETE CASCADE NOT NULL,
  day_of_week     integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon...
  start_time      time NOT NULL,
  end_time        time NOT NULL
);

CREATE INDEX IF NOT EXISTS booking_recurring_idx
  ON booking_recurring_availability(booking_type_id, day_of_week);

-- ── Blocked slots (manual overrides — block a specific date/time) ─────────────
CREATE TABLE IF NOT EXISTS booking_blocked_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type_id uuid REFERENCES booking_types(id) ON DELETE CASCADE NOT NULL,
  blocked_date    date NOT NULL,
  blocked_time    time,         -- NULL means the entire day is blocked
  reason          text
);

CREATE INDEX IF NOT EXISTS booking_blocked_idx
  ON booking_blocked_slots(booking_type_id, blocked_date);

-- ── Bookings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type_id          uuid REFERENCES booking_types(id) NOT NULL,
  photographer_id          uuid REFERENCES photographers(id) NOT NULL,
  client_name              text NOT NULL,
  client_email             text NOT NULL,
  client_phone             text,
  booked_date              date NOT NULL,
  booked_time              time NOT NULL,
  status                   text NOT NULL DEFAULT 'pending'
                           CHECK (status IN (
                             'pending',           -- waiting for deposit (or awaiting confirmation if no deposit)
                             'deposit_received',  -- client marked deposit as paid
                             'confirmed',         -- photographer confirmed
                             'completed',         -- shoot done
                             'cancelled'
                           )),
  answers                  jsonb NOT NULL DEFAULT '{}',   -- { question_id: value }
  payment_reference        text UNIQUE,                   -- "BK-2026-0042"
  deposit_amount           integer,                       -- cents
  deposit_paid_at          timestamptz,
  deposit_proof_url        text,                          -- Supabase Storage path
  google_calendar_event_id text,
  google_meet_link         text,
  invoice_id               uuid REFERENCES invoices(id),  -- set after completion
  notes                    text,                          -- internal photographer notes
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_photographer_idx
  ON bookings(photographer_id, booked_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx
  ON bookings(photographer_id, status);
CREATE INDEX IF NOT EXISTS bookings_booking_type_idx
  ON bookings(booking_type_id, booked_date, booked_time);

-- ── Atomic payment reference counter ─────────────────────────────────────────
-- Sequence per photographer for BK-YYYY-NNNN references
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year  integer := EXTRACT(YEAR FROM now());
  v_seq   bigint;
BEGIN
  v_seq := nextval('booking_reference_seq');
  RETURN 'BK-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

ALTER TABLE booking_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_recurring_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- booking_types: photographer can manage their own; public can read active ones
CREATE POLICY "booking_types_select_own" ON booking_types
  FOR SELECT USING (photographer_id = auth.uid() OR active = true);
CREATE POLICY "booking_types_insert_own" ON booking_types
  FOR INSERT WITH CHECK (photographer_id = auth.uid());
CREATE POLICY "booking_types_update_own" ON booking_types
  FOR UPDATE USING (photographer_id = auth.uid());
CREATE POLICY "booking_types_delete_own" ON booking_types
  FOR DELETE USING (photographer_id = auth.uid());

-- recurring availability: same as booking_types via photographer
CREATE POLICY "booking_recurring_select" ON booking_recurring_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_types bt
      WHERE bt.id = booking_type_id
        AND (bt.photographer_id = auth.uid() OR bt.active = true)
    )
  );
CREATE POLICY "booking_recurring_manage" ON booking_recurring_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM booking_types bt
      WHERE bt.id = booking_type_id AND bt.photographer_id = auth.uid()
    )
  );

-- blocked slots: photographer manages; public can read
CREATE POLICY "booking_blocked_select" ON booking_blocked_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_types bt
      WHERE bt.id = booking_type_id
        AND (bt.photographer_id = auth.uid() OR bt.active = true)
    )
  );
CREATE POLICY "booking_blocked_manage" ON booking_blocked_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM booking_types bt
      WHERE bt.id = booking_type_id AND bt.photographer_id = auth.uid()
    )
  );

-- bookings: photographer sees their own; no direct client RLS (API handles it)
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT USING (photographer_id = auth.uid());
CREATE POLICY "bookings_insert_own" ON bookings
  FOR INSERT WITH CHECK (photographer_id = auth.uid());
CREATE POLICY "bookings_update_own" ON bookings
  FOR UPDATE USING (photographer_id = auth.uid());
