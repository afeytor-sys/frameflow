import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createBookingEvent } from '@/lib/googleCalendar'

// PATCH /api/bookings/[id]/confirm  (authenticated — photographer only)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const serviceSupabase = createServiceClient()

  // Fetch booking + booking type
  const { data: booking } = await serviceSupabase
    .from('bookings')
    .select('*, booking_types(title, duration_minutes, location_type, price)')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['pending', 'deposit_received'].includes(booking.status)) {
    return NextResponse.json({ error: 'Cannot confirm booking in current state' }, { status: 400 })
  }

  // Fetch photographer for Google Calendar
  const { data: photographer } = await serviceSupabase
    .from('photographers')
    .select('id, email, full_name, studio_name, notification_email, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry')
    .eq('id', user.id)
    .single()

  const bt = booking.booking_types as { title: string; duration_minutes: number; location_type: string; price: number } | null

  // Create Google Calendar event
  let googleEventId: string | null = null
  let meetLink: string | null = null

  if (photographer?.google_calendar_access_token && bt) {
    const result = await createBookingEvent(
      photographer,
      {
        bookingId: booking.id,
        title: `${bt.title} — ${booking.client_name}`,
        description: `Buchung: ${booking.client_name} (${booking.client_email})`,
        date: booking.booked_date,
        startTime: String(booking.booked_time).slice(0, 5),
        durationMinutes: bt.duration_minutes,
        isOnline: bt.location_type === 'online',
      },
      serviceSupabase,
    )
    googleEventId = result.eventId
    meetLink = result.meetLink
  }

  // Update booking to confirmed
  const { error } = await serviceSupabase
    .from('bookings')
    .update({
      status: 'confirmed',
      google_calendar_event_id: googleEventId,
      google_meet_link: meetLink,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Schedule reminders (24h and 1h before)
  const shootDateTime = new Date(`${booking.booked_date}T${String(booking.booked_time).slice(0, 5)}:00`)
  const reminder24h = new Date(shootDateTime.getTime() - 24 * 60 * 60 * 1000)
  const reminder1h  = new Date(shootDateTime.getTime() - 60 * 60 * 1000)
  const studioName  = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
  const shootDateStr = shootDateTime.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const shootTimeStr = String(booking.booked_time).slice(0, 5)

  const reminderHtml = (hoursLeft: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111;background:#f9f9f7;margin:0;padding:0">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="height:4px;background:linear-gradient(90deg,#C9A96E,#d4b483)"></div>
    <div style="padding:32px">
      <h2 style="margin:0 0 4px;font-size:20px">Erinnerung: ${bt?.title ?? 'Buchung'} in ${hoursLeft}</h2>
      <p style="margin:4px 0 20px;color:#6B7280;font-size:14px">${studioName}</p>
      <p style="color:#374151">Hallo ${booking.client_name},<br><br>dein Termin findet statt am <strong>${shootDateStr} um ${shootTimeStr} Uhr</strong>.</p>
      ${meetLink ? `<p style="margin:16px 0"><a href="${meetLink}" style="background:#1A1A18;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Google Meet beitreten</a></p>` : ''}
    </div>
  </div>
</body></html>`

  const reminders = [
    { scheduled_at: reminder24h, label: '24 Stunden' },
    { scheduled_at: reminder1h,  label: '1 Stunde' },
  ].filter(r => r.scheduled_at > new Date())

  for (const reminder of reminders) {
    await serviceSupabase.from('scheduled_emails').insert({
      photographer_id: user.id,
      to_email: booking.client_email,
      to_name: booking.client_name,
      subject: `Erinnerung: ${bt?.title ?? 'Buchung'} am ${shootDateStr}`,
      html_body: reminderHtml(reminder.label),
      type: 'custom',
      status: 'pending',
      scheduled_at: reminder.scheduled_at.toISOString(),
    })
  }

  // Send confirmation email to client
  await serviceSupabase.from('scheduled_emails').insert({
    photographer_id: user.id,
    to_email: booking.client_email,
    to_name: booking.client_name,
    subject: `Buchung bestätigt: ${bt?.title ?? 'Buchung'} am ${shootDateStr}`,
    html_body: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111;background:#f9f9f7;margin:0;padding:0">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="height:4px;background:linear-gradient(90deg,#10B981,#34D399)"></div>
    <div style="padding:32px">
      <h2 style="margin:0 0 4px;font-size:20px">Buchung bestätigt ✓</h2>
      <p style="margin:4px 0 20px;color:#6B7280;font-size:14px">${studioName}</p>
      <p style="color:#374151">Hallo ${booking.client_name},<br><br>deine Buchung <strong>${bt?.title ?? ''}</strong> am <strong>${shootDateStr} um ${shootTimeStr} Uhr</strong> wurde bestätigt.</p>
      ${meetLink ? `<p style="margin:16px 0"><a href="${meetLink}" style="background:#1A1A18;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Google Meet beitreten</a></p>` : ''}
    </div>
  </div>
</body></html>`,
    type: 'custom',
    status: 'pending',
    scheduled_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, meetLink })
}
