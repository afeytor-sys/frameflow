import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { deleteCalendarEvent } from '@/lib/googleCalendar'

// PATCH /api/bookings/[id]/cancel  (authenticated — photographer only)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { reason } = body

  const serviceSupabase = createServiceClient()

  const { data: booking } = await serviceSupabase
    .from('bookings')
    .select('id, status, google_calendar_event_id, client_name, client_email, booking_types(title), booked_date, booked_time')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
  }

  const { error } = await serviceSupabase
    .from('bookings')
    .update({ status: 'cancelled', notes: reason || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove Google Calendar event if exists
  if (booking.google_calendar_event_id) {
    const { data: photographer } = await serviceSupabase
      .from('photographers')
      .select('id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry')
      .eq('id', user.id)
      .single()

    if (photographer?.google_calendar_access_token) {
      await deleteCalendarEvent(photographer, booking.google_calendar_event_id, serviceSupabase)
    }
  }

  // Cancel pending reminder emails
  await serviceSupabase
    .from('scheduled_emails')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('photographer_id', user.id)
    .eq('to_email', booking.client_email)
    .eq('status', 'pending')

  return NextResponse.json({ ok: true })
}
