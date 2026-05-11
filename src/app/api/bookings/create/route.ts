import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createBookingEvent } from '@/lib/googleCalendar'
import { bookingEmailShell } from '@/lib/bookingEmailShell'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookingQuestion {
  id: string
  label: string
  type: 'text' | 'textarea' | 'dropdown' | 'checkbox'
  options?: string[]
  required: boolean
}

// Renders answered custom questions as a table section for email HTML
function buildAnswersBlock(questions: BookingQuestion[], answers: Record<string, string>): string {
  const answered = questions.filter(q => answers[q.id]?.trim())
  if (!answered.length) return ''
  const rows = answered.map(q => {
    const raw = answers[q.id] ?? ''
    const display = q.type === 'checkbox'
      ? raw.split('||').filter(Boolean).join(', ')
      : raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<tr>
      <td style="padding:6px 0;font-size:13px;color:#6B7280;width:120px;vertical-align:top">${q.label}</td>
      <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111">${display}</td>
    </tr>`
  }).join('')
  return `
    <div style="margin-top:16px">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em">Angaben des Kunden</p>
      <div style="background:#F9FAFB;border-radius:8px;padding:16px;border:1px solid #F3F4F6">
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
    </div>`
}

// "HH:MM" or "HH:MM:SS" → minutes since midnight
function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// "YYYY-MM-DD" → "DD.MM.YYYY"
function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

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
    // Fetch ALL active bookings for this photographer on the same date (any booking type)
    const { data: sameDayBookings } = await serviceSupabase
      .from('bookings')
      .select('booked_time, booking_types(duration_minutes)')
      .eq('photographer_id', photographer.id)
      .eq('booked_date', booked_date)
      .in('status', ['pending', 'deposit_received', 'confirmed'])

    if (sameDayBookings && sameDayBookings.length > 0) {
      const newStart = timeToMins(booked_time)
      const newEnd   = newStart + bt.duration_minutes + (bt.buffer_minutes ?? 0)

      const overlaps = sameDayBookings.some(existing => {
        const dur = (existing.booking_types as unknown as { duration_minutes: number } | null)?.duration_minutes ?? bt.duration_minutes
        const existStart = timeToMins(existing.booked_time)
        const existEnd   = existStart + dur + (bt.buffer_minutes ?? 0)
        return newStart < existEnd && newEnd > existStart
      })

      if (overlaps) {
        return NextResponse.json({ error: 'This slot is no longer available' }, { status: 409 })
      }
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
    const shootDate = fmtDate(booked_date)
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${photographerSlug}/${bookingTypeSlug}/confirm/${booking.id}`

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

    // Email to photographer
    if (notifPrefs?.notify_email_new_booking !== false && toEmail) {
      resend.emails.send({
        from: 'Fotonizer <noreply@fotonizer.com>',
        to: toEmail,
        subject: `Neue Buchungsanfrage: ${bt.title} — ${client_name}`,
        html: buildNewBookingEmail({ studioName, btTitle: bt.title, clientName: client_name, clientEmail: client_email, shootDate, booked_time: booked_time.slice(0, 5), depositAmount: deposit_amount, payment_reference, meetLink: google_meet_link, questions: bt.questions ?? [], answers }),
      }).catch(e => console.error('Booking email error:', e))
    }

    // Email to client — always sent
    resend.emails.send({
      from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
      to: client_email.trim().toLowerCase(),
      bcc: toEmail || undefined,
      replyTo: toEmail || undefined,
      subject: `Deine Buchung: ${bt.title} am ${shootDate}`,
      html: buildClientConfirmationEmail({
        clientName: client_name,
        studioName,
        btTitle: bt.title,
        shootDate,
        booked_time: booked_time.slice(0, 5),
        durationMinutes: bt.duration_minutes,
        locationType: bt.location_type,
        depositAmount: deposit_amount,
        payment_reference,
        meetLink: google_meet_link,
        confirmUrl,
        requiresDeposit: status === 'pending',
        questions: bt.questions ?? [],
        answers,
      }),
    }).catch(e => console.error('Client confirmation email error:', e))

    // Schedule 24h reminder to client
    const shootDateTime = new Date(`${booked_date}T${booked_time.slice(0, 5)}:00`)
    const reminderAt = new Date(shootDateTime.getTime() - 24 * 60 * 60 * 1000)
    if (reminderAt > new Date()) {
      serviceSupabase.from('scheduled_emails').insert({
        photographer_id: photographer.id,
        scheduled_at: reminderAt.toISOString(),
        to_email: client_email.trim().toLowerCase(),
        to_name: client_name,
        subject: `Dein Termin: ${bt.title} am ${shootDate}`,
        html_body: buildClientReminderEmail({
          clientName: client_name,
          studioName,
          btTitle: bt.title,
          shootDate,
          booked_time: booked_time.slice(0, 5),
          durationMinutes: bt.duration_minutes,
          locationType: bt.location_type,
          meetLink: google_meet_link,
          confirmUrl,
          portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/b/booking/${booking.id}`,
        }),
        type: 'booking_reminder',
        reference_id: booking.id,
      }).then(({ error }) => { if (error) console.error('Reminder schedule error:', error) })
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
  meetLink: string | null
  questions: BookingQuestion[]
  answers: Record<string, string>
}): string {
  const depositInfo = data.depositAmount
    ? `<p style="margin:8px 0;color:#374151">Angeforderter Anzahlung: <strong>€${(data.depositAmount / 100).toFixed(2)}</strong> (Referenz: <strong>${data.payment_reference}</strong>)</p>`
    : ''

  const meetInfo = data.meetLink
    ? `<div style="margin:16px 0 0;padding:12px 16px;background:#EFF6FF;border-radius:8px;border:1px solid #BFDBFE">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em">Google Meet</p>
        <a href="${data.meetLink}" style="color:#2563EB;font-weight:600;font-size:14px">${data.meetLink}</a>
      </div>`
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
      ${buildAnswersBlock(data.questions, data.answers)}
      ${meetInfo}
    </div>
  </div>
</body></html>`
}


function buildClientConfirmationEmail(data: {
  clientName: string
  studioName: string
  btTitle: string
  shootDate: string
  booked_time: string
  durationMinutes: number
  locationType: string
  depositAmount: number | null
  payment_reference: string | null
  meetLink: string | null
  confirmUrl: string
  requiresDeposit: boolean
  questions: BookingQuestion[]
  answers: Record<string, string>
}): string {
  const locationLabel: Record<string, string> = {
    studio: 'Studio',
    external: 'Outdoor / Extern',
    online: 'Online (Google Meet)',
  }

  const depositBlock = data.requiresDeposit && data.depositAmount
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFF7ED;border-radius:12px;border:1px solid #FED7AA;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#C2410C;">Anzahlung erforderlich</p>
          <p style="margin:0 0 10px;font-size:14px;color:#92400E;line-height:1.5;">Bitte überweise <strong>€${(data.depositAmount / 100).toFixed(2)}</strong> mit dem Verwendungszweck:</p>
          <p style="margin:0 0 8px;font-size:22px;font-weight:900;letter-spacing:0.1em;color:#C2410C;">${data.payment_reference}</p>
          <p style="margin:0;font-size:12px;color:#92400E;">Dein Termin wird nach Zahlungseingang bestätigt.</p>
        </td></tr>
      </table>`
    : ''

  const meetBlock = data.meetLink && data.locationType === 'online'
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#1D4ED8;">Google Meet</p>
          <a href="${data.meetLink}" style="color:#2563EB;font-weight:700;font-size:14px;word-break:break-all;">${data.meetLink}</a>
        </td></tr>
      </table>`
    : ''

  const extraParts = [depositBlock, meetBlock].filter(Boolean).join('<div style="height:12px;"></div>')

  return bookingEmailShell({
    studioName: data.studioName,
    heading: 'Deine Buchung<br>ist eingegangen.',
    subheading: `Hallo ${data.clientName}.`,
    body: data.requiresDeposit
      ? 'Überweise bitte die Anzahlung, um deinen Termin zu sichern.'
      : 'Der Fotograf wird deine Anfrage in Kürze bestätigen.',
    ctaUrl: data.confirmUrl,
    ctaLabel: 'Buchung ansehen',
    infoRows: [
      { label: 'Leistung',  value: data.btTitle },
      { label: 'Datum',     value: data.shootDate },
      { label: 'Uhrzeit',   value: data.booked_time + ' Uhr' },
      { label: 'Dauer',     value: data.durationMinutes + ' Minuten' },
      { label: 'Ort',       value: locationLabel[data.locationType] ?? data.locationType },
    ],
    extraBlock: extraParts || undefined,
    footerLine: `Bereitgestellt von ${data.studioName}`,
  })
}

function buildClientReminderEmail(data: {
  clientName: string
  studioName: string
  btTitle: string
  shootDate: string
  booked_time: string
  durationMinutes: number
  locationType: string
  meetLink: string | null
  confirmUrl: string
  portalUrl: string
}): string {
  const locationLabel: Record<string, string> = {
    studio: 'Studio',
    external: 'Outdoor / Extern',
    online: 'Online (Google Meet)',
  }

  const meetBlock = data.meetLink && data.locationType === 'online'
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#1D4ED8;">Google Meet</p>
          <a href="${data.meetLink}" style="color:#2563EB;font-weight:700;font-size:14px;word-break:break-all;">${data.meetLink}</a>
        </td></tr>
      </table>`
    : ''

  return bookingEmailShell({
    studioName: data.studioName,
    heading: 'Dein Termin<br>steht bevor.',
    subheading: `Hallo ${data.clientName}.`,
    body: 'Alle Details zum Termin findest du unten.',
    ctaUrl: data.portalUrl,
    ctaLabel: 'Alle Details ansehen',
    infoRows: [
      { label: 'Leistung',  value: data.btTitle },
      { label: 'Datum',     value: data.shootDate },
      { label: 'Uhrzeit',   value: data.booked_time + ' Uhr' },
      { label: 'Dauer',     value: data.durationMinutes + ' Minuten' },
      { label: 'Ort',       value: locationLabel[data.locationType] ?? data.locationType },
    ],
    extraBlock: meetBlock || undefined,
    footerLine: `Bereitgestellt von ${data.studioName}`,
  })
}

