import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

// "YYYY-MM-DD" → "DD.MM.YYYY"
function fmtDate(dateStr: string): string {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

// PATCH /api/bookings/[id]/deposit
// Public — client marks deposit as paid (optionally with proof URL)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { deposit_proof_url } = body

  const supabase = createServiceClient()

  // Only allow update if status is 'pending'
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, photographer_id, client_name, client_email, booked_date, booked_time, booking_type_id, payment_reference, deposit_amount')
    .eq('id', id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not in pending state' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'deposit_received',
      deposit_paid_at: new Date().toISOString(),
      deposit_proof_url: deposit_proof_url || null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify photographer
  const { data: ph } = await supabase
    .from('photographers')
    .select('notification_email, email, full_name, studio_name')
    .eq('id', booking.photographer_id)
    .single()

  if (ph) {
    const { data: bt } = await supabase
      .from('booking_types')
      .select('title')
      .eq('id', booking.booking_type_id)
      .single()

    const toEmail = ph.notification_email || ph.email
    const studioName = ph.studio_name || ph.full_name || 'Fotonizer'
    const shootDate = fmtDate(booking.booked_date)

    await supabase.from('scheduled_emails').insert({
      photographer_id: booking.photographer_id,
      to_email: toEmail,
      to_name: studioName,
      subject: `Sinal erhalten: ${bt?.title ?? 'Buchung'} — ${booking.client_name}`,
      html_body: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111;background:#f9f9f7;margin:0;padding:0">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="height:4px;background:linear-gradient(90deg,#10B981,#34D399)"></div>
    <div style="padding:32px">
      <h2 style="margin:0 0 4px;font-size:20px;letter-spacing:-0.02em">Sinal erhalten ✓</h2>
      <p style="margin:0 0 20px;color:#6B7280;font-size:14px">${studioName}</p>
      <p style="margin:8px 0;color:#374151"><strong>${booking.client_name}</strong> hat den Sinal für die Buchung <strong>${bt?.title ?? ''}</strong> am <strong>${shootDate} um ${String(booking.booked_time).slice(0,5)} Uhr</strong> als bezahlt markiert.</p>
      <p style="margin:8px 0;color:#374151">Referenz: <strong>${booking.payment_reference}</strong> — Betrag: <strong>€${((booking.deposit_amount ?? 0) / 100).toFixed(2)}</strong></p>
      <p style="margin:16px 0 8px;color:#6B7280;font-size:13px">Bitte bestätige die Buchung in deinem Dashboard.</p>
    </div>
  </div>
</body></html>`,
      type: 'custom',
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ ok: true })
}
