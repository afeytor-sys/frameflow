import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { bookingEmailShell } from '@/lib/bookingEmailShell'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, booked_date, booked_time, client_name, client_email, notes, duration_minutes, location_type, google_meet_link, shooting_type } = body

  if (!title?.trim() || !booked_date || !booked_time) {
    return NextResponse.json({ error: 'title, booked_date, booked_time are required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: booking, error } = await service
    .from('bookings')
    .insert({
      photographer_id: user.id,
      booking_type_id: null,
      manual_title: title.trim(),
      booked_date,
      booked_time,
      client_name: client_name?.trim() || 'Manuell',
      client_email: client_email?.trim().toLowerCase() || '',
      status: 'confirmed',
      notes: notes?.trim() || null,
      google_meet_link: google_meet_link?.trim() || null,
      shooting_type: shooting_type?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Schedule 24h reminder if client email provided and appointment is in the future
  const clientEmailClean = client_email?.trim().toLowerCase()
  if (clientEmailClean) {
    const { data: photographer } = await service
      .from('photographers')
      .select('studio_name, full_name')
      .eq('id', user.id)
      .single()

    const studioName = photographer?.studio_name || photographer?.full_name || 'Dein Fotograf'
    const shootDateTime = new Date(`${booked_date}T${booked_time.slice(0, 5)}:00`)
    const reminderAt = new Date(shootDateTime.getTime() - 24 * 60 * 60 * 1000)
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/booking/${booking.id}`

    const shootDate = shootDateTime.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

    const html = bookingEmailShell({
      studioName,
      heading: 'Dein Termin<br>steht bevor.',
      subheading: `Hallo ${client_name?.trim() || ''}.`,
      body: 'Alle Details zum Termin findest du unten.',
      ctaUrl: portalUrl,
      ctaLabel: 'Alle Details ansehen',
      infoRows: [
        { label: 'Leistung', value: title.trim() },
        { label: 'Datum',    value: shootDate },
        { label: 'Uhrzeit',  value: booked_time.slice(0, 5) + ' Uhr' },
        ...(notes ? [{ label: 'Ort / Hinweis', value: notes.trim() }] : []),
      ],
      footerLine: `Bereitgestellt von ${studioName}`,
    })

    if (reminderAt > new Date()) {
      service.from('scheduled_emails').insert({
        photographer_id: user.id,
        scheduled_at: reminderAt.toISOString(),
        to_email: clientEmailClean,
        to_name: client_name?.trim() || '',
        subject: `Dein Termin: ${title.trim()} am ${shootDate}`,
        html_body: html,
        type: 'booking_reminder',
        reference_id: booking.id,
      }).then(({ error: e }) => { if (e) console.error('Manual booking reminder schedule error:', e) })
    }
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
