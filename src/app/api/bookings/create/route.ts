import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

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
  } = body

  if (!photographerSlug || !bookingTypeSlug || !client_name || !client_email || !booked_date || !booked_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use service client for public inserts (bypasses RLS for bookings table)
  const serviceSupabase = createServiceClient()

  // Resolve photographer
  const { data: photographer } = await serviceSupabase
    .from('photographers')
    .select('id, bank_account_holder, bank_name, bank_iban, bank_bic')
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

  // Anti-double-booking: check that the slot isn't already taken
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
    })
    .select()
    .single()

  if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 500 })

  // Schedule notification email to photographer (via existing emails system)
  const photographerEmailData = await serviceSupabase
    .from('photographers')
    .select('notification_email, email, full_name, studio_name')
    .eq('id', photographer.id)
    .single()

  if (photographerEmailData.data) {
    const ph = photographerEmailData.data
    const toEmail = ph.notification_email || ph.email
    const studioName = ph.studio_name || ph.full_name || 'Fotonizer'
    const shootDate = new Date(booked_date).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    await serviceSupabase.from('scheduled_emails').insert({
      photographer_id: photographer.id,
      to_email: toEmail,
      to_name: studioName,
      subject: `Neue Buchungsanfrage: ${bt.title} — ${client_name}`,
      html_body: buildNewBookingEmail({ studioName, btTitle: bt.title, clientName: client_name, clientEmail: client_email, shootDate, booked_time: booked_time.slice(0, 5), depositAmount: deposit_amount, payment_reference }),
      type: 'custom',
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    })
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
