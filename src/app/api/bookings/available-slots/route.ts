import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import {
  generateAvailableSlots,
  type RecurringWindow,
  type ExistingBooking,
  type BlockedSlot,
  type BusyPeriod,
} from '@/lib/bookingSlots'
import { getFreeBusy } from '@/lib/googleCalendar'

// GET /api/bookings/available-slots
// ?photographerSlug=john-doe&bookingTypeSlug=portrait-session&month=2026-05
// Returns available dates + slots for a given month (public, no auth)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const photographerSlug = searchParams.get('photographerSlug')
  const bookingTypeSlug  = searchParams.get('bookingTypeSlug')
  const month            = searchParams.get('month')  // "YYYY-MM"

  if (!photographerSlug || !bookingTypeSlug) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Resolve photographer by slug
  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry')
    .eq('slug', photographerSlug)
    .maybeSingle()

  if (!photographer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Resolve booking type
  const { data: bt } = await supabase
    .from('booking_types')
    .select('*')
    .eq('photographer_id', photographer.id)
    .eq('slug', bookingTypeSlug)
    .eq('active', true)
    .maybeSingle()

  if (!bt) return NextResponse.json({ error: 'Booking type not found' }, { status: 404 })

  // Fetch recurring availability
  const { data: recurringRaw } = await supabase
    .from('booking_recurring_availability')
    .select('day_of_week, start_time, end_time')
    .eq('booking_type_id', bt.id)

  const recurring: RecurringWindow[] = recurringRaw ?? []

  // Compute date range for the requested month (or next max_advance_days from today)
  const now = new Date()

  // If month param provided, limit to that month; otherwise return full window
  let rangeStart = now
  let rangeEnd: Date | null = null
  if (month) {
    const [yr, mo] = month.split('-').map(Number)
    const monthStart = new Date(yr, mo - 1, 1)
    const monthEnd   = new Date(yr, mo, 0)  // last day of month
    if (monthStart > now) rangeStart = monthStart
    rangeEnd = monthEnd
  }

  // Fetch existing bookings in window
  const windowEnd = rangeEnd
    ? rangeEnd.toISOString().slice(0, 10)
    : new Date(now.getTime() + bt.max_advance_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Fetch ALL active bookings for this photographer (any booking type)
  // so cross-type conflicts are also blocked on the calendar.
  const { data: existingRaw } = await supabase
    .from('bookings')
    .select('booked_date, booked_time, status, booking_types(duration_minutes)')
    .eq('photographer_id', photographer.id)
    .gte('booked_date', now.toISOString().slice(0, 10))
    .lte('booked_date', windowEnd)
    .in('status', ['pending', 'deposit_received', 'confirmed'])

  const existing: ExistingBooking[] = (existingRaw ?? []).map(b => ({
    booked_date: b.booked_date,
    booked_time: b.booked_time,
    status: b.status,
    duration_minutes: (b.booking_types as unknown as { duration_minutes: number } | null)?.duration_minutes ?? bt.duration_minutes,
  }))

  // Fetch blocked slots in window
  const { data: blockedRaw } = await supabase
    .from('booking_blocked_slots')
    .select('blocked_date, blocked_time')
    .eq('booking_type_id', bt.id)
    .gte('blocked_date', now.toISOString().slice(0, 10))
    .lte('blocked_date', windowEnd)

  const blocked: BlockedSlot[] = blockedRaw ?? []

  // Optionally fetch Google Calendar freebusy
  let busyPeriods: BusyPeriod[] = []
  if (photographer.google_calendar_access_token) {
    const timeMin = rangeStart.toISOString()
    const timeMax = rangeEnd
      ? new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() + (bt.max_advance_days + 1) * 24 * 60 * 60 * 1000).toISOString()

    busyPeriods = await getFreeBusy(photographer, timeMin, timeMax, supabase)
  }

  // Generate slots, then optionally filter to requested month
  const allSlots = generateAvailableSlots(
    {
      id: bt.id,
      availability_type: bt.availability_type,
      duration_minutes: bt.duration_minutes,
      buffer_minutes: bt.buffer_minutes,
      min_notice_hours: bt.min_notice_hours,
      max_advance_days: bt.max_advance_days,
    },
    recurring,
    existing,
    blocked,
    busyPeriods,
    rangeStart,
  )

  // If month requested, filter to just that month's dates
  const slots = month
    ? allSlots.filter(d => d.date.startsWith(month))
    : allSlots

  return NextResponse.json({ slots })
}
