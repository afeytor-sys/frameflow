import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createBookingEvent } from '@/lib/googleCalendar'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/bookings/create  (public — no auth required)
// Creates a booking for a client. Generates payment reference if anzahlung is enabled.

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    photographerSlug,
    bookingTypeSlug,
    client_name,
    client_email,
    client_phone,
    booked_date,
    booked_time,
    answers = {},
    notes,
  } = body

  if (!photographerSlug || !bookingTypeSlug || !client_name || !client_email || !booked_date || !booked_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use service client for public inserts (bypasses RLS for bookings table)
  const serviceSupabase = createServiceClient()

  // Resolve photographer (include Google Calendar tokens for Meet link creation)
  const { data: photographer } = await serviceSupabase
    .from('photographers')
    .select('id, bank_account_holder, bank_name, bank_iban, bank_bic, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry')
    .eq('slug', photographerSlug)
    .maybeSingle()

  if (!photographer) return NextResponse.json({ error: 'Photographer not found' }, { status: 404 })

  // Resolve booking type
  const { data: bt } = await serviceSupabase
    .from('booking_types')
    .select('*')
    .eq('photographer_id', photographer.id)
    .eq('slug', bookingTypeSlug)
    .eq('active', true)
    .maybeSingle()

  if (!bt) return NextResponse.json({ error: 'Booking type not found' }, { status: 404 })

  // Anti-double-booking: skip for request-only types (no fixed slots)
  if (bt.availability_type !== 'request') {
    const { data: conflict } = await serviceSupabase
      .from('bookings')
      .select('id')
      .eq('booking_type_id', bt.id)
      .eq('booked_date', booked_date)
      .eq('booked_time', booked_time)
      .in('status', ['pending', 'deposit_received', 'confirmed'])
      .maybeSingle()

    if (conflict) {
      return NextResponse.json({ error: 'This slot is no longer available' }, { status: 409 })
    }
  }

  // Compute deposit amount
  let deposit_amount: number | null = null
  if (bt.anzahlung_enabled && bt.anzahlung_amount) {
    if (bt.anzahlung_type === 'fixed') {
      deposit_amount = bt.anzahlung_amount
    } else if (bt.anzahlung_type === 'percent') {
      deposit_amount = Math.round((bt.anzahlung_amount / 10000) * bt.price)
    }
  }

  // Generate payment reference via DB function
  const { data: refData } = await serviceSupabase
    .rpc('generate_booking_reference')
  const payment_reference = refData as string | null

  // Determine initial status:
  // If no deposit required → 'confirmed' immediately
  // If deposit required → 'pending'
  const status = bt.anzahlung_enabled && deposit_amount ? 'pending' : 'confirmed'

  const { data: booking, error: bookErr } = await serviceSupabase
    .from('bookings')
    .insert({
      booking_type_id: bt.id,
      photographer_id: photographer.id,
      client_name: client_name.trim(),
      client_email: client_email.trim().toLowerCase(),
      client_phone: client_phone?.trim() || null,
      booked_date,
      booked_time,
      status,
      answers,
      payment_reference,
      deposit_amount,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 500 })

  // ── Google Calendar + Meet link ───────────────────────────────────────────
  let google_meet_link: string | null = null
  if (photographer.google_calendar_access_token || photographer.google_calendar_refresh_token) {
    const isOnline = bt.location_type === 'online'
    const { eventId, meetLink } = await createBookingEvent(
      photographer,
      {
        bookingId: booking.id,
        title: `${bt.title} — ${client_name}`,
        description: `Kunde: ${client_name} (${client_email})${notes ? `\n${notes}` : ''}`,
        date: booked_date,
        startTime: booked_time.slice(0, 5),
        durationMinutes: bt.duration_minutes,
        location: bt.location_type === 'studio' ? 'Studio' : undefined,
        isOnline,
      },
      serviceSupabase,
    )

    if (eventId || meetLink) {
      google_meet_link = meetLink
      await serviceSupabase
        .from('bookings')
        .update({
          google_calendar_event_id: eventId,
          google_meet_link: meetLink,
        })
        .eq('id', booking.id)
    }
  }

  // Fetch photographer details + notification preferences
  const [phResult, notifResult] = await Promise.all([
    serviceSupabase
      .from('photographers')
      .select('notification_email, email, full_name, studio_name')
      .eq('id', photographer.id)
      .single(),
    serviceSupabase
      .from('automation_settings')
      .select('notify_inapp_new_booking, notify_email_new_booking')
      .eq('photographer_id', photographer.id)
      .maybeSingle(),
  ])

  if (phResult.data) {
    const ph = phResult.data
    const notifPrefs = notifResult.data
    const toEmail = ph.notification_email || ph.email
    const studioName = ph.studio_name || ph.full_name || 'Fotonizer'
    const shootDate = new Date(booked_date).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    // In-app notification
    if (notifPrefs?.notify_inapp_new_booking !== false) {
      serviceSupabase.from('notifications').insert({
        photographer_id: photographer.id,
        type: 'new_booking',
        title_de: `Neue Buchung: ${client_name}`,
        title_en: `New booking: ${client_name}`,
        body_de: `${client_name} hat ${bt.title} für ${shootDate} gebucht.`,
        body_en: `${client_name} booked ${bt.title} for ${shootDate}.`,
        client_name,
      }).then(({ error }) => { if (error) console.error('Notification insert error:', error) })
    }

    // Email notification — sent immediately via Resend
    if (notifPrefs?.notify_email_new_booking !== false && toEmail) {
      await resend.emails.send({
        from: 'Fotonizer <noreply@fotonizer.com>',
        to: toEmail,
        subject: `Neue Buchungsanfrage: ${bt.title} — ${client_name}`,
        html: buildNewBookingEmail({ studioName, btTitle: bt.title, clientName: client_name, clientEmail: client_email, shootDate, booked_time: booked_time.slice(0, 5), depositAmount: deposit_amount, payment_reference }),
      }).catch(e => console.error('Booking email error:', e))
    }
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      payment_reference: booking.payment_reference,
      deposit_amount: booking.deposit_amount,
    },
    requiresDeposit: status === 'pending',
    bankDetails: status === 'pending' ? {
      account_holder: photographer.bank_account_holder,
      bank_name: photographer.bank_name,
      iban: photographer.bank_iban,
      bic: photographer.bank_bic,
    } : null,
  }, { status: 201 })
}

function buildNewBookingEmail(data: {
  studioName: string
  btTitle: string
  clientName: string
  clientEmail: string
  shootDate: string
  booked_time: string
  depositAmount: number | null
  payment_reference: string | null
}): string {
  const depositInfo = data.depositAmount
    ? `<p style="margin:8px 0;color:#374151">Angeforderter Sinal: <strong>€${(data.depositAmount / 100).toFixed(2)}</strong> (Referenz: <strong>${data.payment_reference}</strong>)</p>`
    : ''

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111;background:#f9f9f7;margin:0;padding:0">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="height:4px;background:linear-gradient(90deg,#C9A96E,#d4b483)"></div>
    <div style="padding:32px">
      <h2 style="margin:0 0 4px;font-size:20px;letter-spacing:-0.02em">Neue Buchungsanfrage</h2>
      <p style="margin:0 0 20px;color:#6B7280;font-size:14px">${data.studioName}</p>
      <p style="margin:8px 0;color:#374151"><strong>${data.clientName}</strong> (${data.clientEmail}) möchte buchen:</p>
      <p style="margin:8px 0;color:#374151">Leistung: <strong>${data.btTitle}</strong></p>
      <p style="margin:8px 0;color:#374151">Termin: <strong>${data.shootDate} um ${data.booked_time} Uhr</strong></p>
      ${depositInfo}
    </div>
  </div>
</body></html>`
}
