import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { waitUntil } from '@vercel/functions'
import { deleteCalendarEvent } from '@/lib/googleCalendar'
import { bookingEmailShell } from '@/lib/bookingEmailShell'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/bookings/[id]/client-cancel  (public — the booking id in the client's link is the access key)

const CANCELLABLE = ['pending', 'deposit_received', 'confirmed']

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''

  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, photographer_id, google_calendar_event_id, client_name, client_email, booked_date, booked_time, booking_types(title)')
    .eq('id', id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status === 'cancelled') return NextResponse.json({ error: 'Dieser Termin wurde bereits storniert.' }, { status: 400 })
  if (!CANCELLABLE.includes(booking.status)) {
    return NextResponse.json({ error: 'Dieser Termin kann nicht mehr storniert werden.' }, { status: 400 })
  }

  const time = String(booking.booked_time).slice(0, 5)
  if (new Date(`${booking.booked_date}T${time}:00`) < new Date()) {
    return NextResponse.json({ error: 'Der Termin liegt in der Vergangenheit und kann nicht mehr storniert werden.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .in('status', CANCELLABLE)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: ph } = await supabase
    .from('photographers')
    .select('id, notification_email, email, full_name, studio_name, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry')
    .eq('id', booking.photographer_id)
    .maybeSingle()

  // Free the slot in Google Calendar
  if (booking.google_calendar_event_id && ph?.google_calendar_access_token) {
    await deleteCalendarEvent(ph, booking.google_calendar_event_id, supabase).catch(e =>
      console.error('[client-cancel] calendar delete error:', e))
  }

  // Stop the reminder email for this booking
  await supabase
    .from('scheduled_emails')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('reference_id', id)
    .eq('status', 'pending')

  const btTitle = (booking.booking_types as unknown as { title: string } | null)?.title ?? 'Termin'
  const shootDate = fmtDate(booking.booked_date)
  const reasonText = reason ? `Grund: „${reason}"` : 'Kein Grund angegeben.'

  // In-app notification for the photographer
  waitUntil(
    Promise.resolve(
      supabase.from('notifications').insert({
        photographer_id: booking.photographer_id,
        type: 'booking_cancelled',
        title_de: `Termin storniert: ${booking.client_name}`,
        title_en: `Booking cancelled: ${booking.client_name}`,
        body_de: `${booking.client_name} hat ${btTitle} am ${shootDate} um ${time} Uhr storniert. ${reasonText}`,
        body_en: `${booking.client_name} cancelled ${btTitle} on ${booking.booked_date} at ${time}.${reason ? ` Reason: "${reason}"` : ''}`,
        client_name: booking.client_name,
      })
    ).then(({ error }) => { if (error) console.error('[client-cancel] notification error:', error) })
  )

  if (ph) {
    let photographerEmail: string | null = ph.notification_email || ph.email || null
    if (!photographerEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(ph.id)
      photographerEmail = authUser?.user?.email ?? null
    }
    const studioName = ph.studio_name || ph.full_name || 'Fotonizer'
    const infoRows = [
      { label: 'Leistung', value: escapeHtml(btTitle) },
      { label: 'Datum', value: shootDate },
      { label: 'Uhrzeit', value: `${time} Uhr` },
    ]

    // Email to photographer
    if (photographerEmail) {
      waitUntil(
        resend.emails.send({
          from: 'Fotonizer <noreply@fotonizer.com>',
          to: photographerEmail,
          replyTo: booking.client_email,
          subject: `Termin storniert: ${btTitle} — ${booking.client_name}`,
          html: bookingEmailShell({
            studioName,
            heading: 'Termin<br>storniert.',
            subheading: `${escapeHtml(booking.client_name)} hat den Termin abgesagt.`,
            body: `${escapeHtml(reasonText)}<br><br>Der Zeitslot ist wieder frei und kann neu gebucht werden.`,
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings`,
            ctaLabel: 'Buchungen öffnen',
            infoRows: [...infoRows, { label: 'Kunde', value: `${escapeHtml(booking.client_name)} · ${escapeHtml(booking.client_email)}` }],
            footerLine: 'Fotonizer',
          }),
        }).catch(e => console.error('[client-cancel] photographer email error:', e))
      )
    }

    // Confirmation to client
    waitUntil(
      resend.emails.send({
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        to: booking.client_email,
        replyTo: photographerEmail || undefined,
        subject: `Termin storniert: ${btTitle} am ${shootDate}`,
        html: bookingEmailShell({
          studioName,
          heading: 'Dein Termin<br>ist storniert.',
          subheading: `Hallo ${escapeHtml(booking.client_name)}.`,
          body: 'Schade, dass es nicht klappt. Wir haben deine Stornierung erhalten. Bei Fragen, z. B. zu einer Anzahlung, antworte einfach auf diese E-Mail.',
          ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/b/booking/${booking.id}`,
          ctaLabel: 'Buchung ansehen',
          infoRows,
          footerLine: `Bereitgestellt von ${studioName}`,
        }),
      }).catch(e => console.error('[client-cancel] client email error:', e))
    )
  }

  return NextResponse.json({ ok: true })
}
