import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Auth check — only logged-in photographers can preview
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('booking')
  const type = searchParams.get('type') ?? 'reminder'

  if (!bookingId) return new NextResponse('Missing ?booking=<id>', { status: 400 })

  const service = createServiceClient()

  const { data: booking } = await service
    .from('bookings')
    .select(`
      id, client_name, client_email, booked_date, booked_time,
      notes, google_meet_link, answers,
      booking_types(title, duration_minutes, location_type, questions),
      photographers(id, studio_name, full_name, locale)
    `)
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) return new NextResponse('Booking not found', { status: 404 })

  // Verify the logged-in user owns this booking
  const photographer = Array.isArray(booking.photographers) ? booking.photographers[0] : booking.photographers as { id: string; studio_name: string | null; full_name: string | null; locale: string | null } | null
  if (photographer?.id !== user.id) return new NextResponse('Forbidden', { status: 403 })

  const bt = Array.isArray(booking.booking_types) ? booking.booking_types[0] : booking.booking_types as {
    title: string; duration_minutes: number; location_type: string; questions: Array<{ id: string; label: string; type: string; required: boolean; options?: string[] }>
  } | null

  const studioName = photographer?.studio_name || photographer?.full_name || 'Studio'
  const locale = photographer?.locale ?? 'de'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fotonizer.com'
  const portalUrl = `${appUrl}/b/booking/${booking.id}`

  const shootDate = new Date(booking.booked_date + 'T00:00:00').toLocaleDateString(
    locale === 'en' ? 'en-GB' : 'de-DE',
    { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' },
  )

  const locationLabel: Record<string, string> = {
    studio: 'Studio',
    external: 'Outdoor / Extern',
    online: 'Online (Google Meet)',
  }

  const meetLink = booking.google_meet_link ?? null
  const meetBlock = meetLink
    ? `<div style="margin:16px 0;padding:14px 16px;background:#EFF6FF;border-radius:8px;border:1px solid #BFDBFE">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em">Google Meet Link</p>
        <a href="${meetLink}" style="color:#2563EB;font-weight:700;font-size:14px">${meetLink}</a>
      </div>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Email Preview — ${booking.client_name}</title>
<style>body{background:#e8e5e0;}</style>
</head>
<body style="font-family:sans-serif;color:#111;background:#e8e5e0;margin:0;padding:40px 20px">

  <div style="max-width:540px;margin:0 auto 16px;background:#FEF3C7;border-radius:8px;padding:10px 16px;font-size:12px;color:#92400E;border:1px solid #FDE68A">
    ⚠️ <strong>Preview only</strong> — kein echtes Email wird versendet. Empfänger: <strong>${booking.client_email}</strong>
  </div>

  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="height:4px;background:linear-gradient(90deg,#C9A96E,#d4b483)"></div>
    <div style="padding:32px">
      <h2 style="margin:0 0 4px;font-size:20px;letter-spacing:-0.02em">Erinnerung: Morgen ist dein Termin</h2>
      <p style="margin:0 0 24px;color:#6B7280;font-size:14px">${studioName}</p>
      <p style="margin:0 0 16px;color:#374151;font-size:15px">Hallo <strong>${booking.client_name}</strong>,</p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px">nur zur Erinnerung — morgen findet dein Shooting statt:</p>
      <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin:0 0 16px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280;width:110px">Leistung</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111">${bt?.title ?? ''}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280">Datum</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111">${shootDate}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280">Uhrzeit</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111">${String(booking.booked_time).slice(0, 5)} Uhr</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280">Dauer</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111">${bt?.duration_minutes ?? 60} Minuten</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280">Ort</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111">${locationLabel[bt?.location_type ?? ''] ?? bt?.location_type ?? ''}</td>
          </tr>
        </table>
      </div>
      ${meetBlock}
      <div style="margin:24px 0 0;text-align:center">
        <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;background:#C4A47C;color:#fff;border-radius:100px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em">
          Alle Details ansehen &nbsp;→
        </a>
        <p style="margin:12px 0 0;font-size:11px;color:#9CA3AF">Hier findest du Termin, Treffpunkt, Google Meet Link und alle deine Angaben.</p>
      </div>
    </div>
  </div>

  <div style="max-width:540px;margin:16px auto 0;font-size:11px;color:#9CA3AF;text-align:center">
    Portal-Link: <a href="${portalUrl}" style="color:#C4A47C">${portalUrl}</a>
  </div>

</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
