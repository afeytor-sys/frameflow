import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, booked_date, booked_time, client_name, client_email, notes, duration_minutes, location_type, google_meet_link } = body

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
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
