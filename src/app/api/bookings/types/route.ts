import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateSlug } from '@/lib/bookingSlots'

// GET  /api/bookings/types  — list photographer's booking types
// POST /api/bookings/types  — create new booking type

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('booking_types')
    .select(`
      *,
      booking_recurring_availability(*)
    `)
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookingTypes: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, description, duration_minutes = 60, location_type = 'external',
    price = 0, currency = 'EUR', availability_type = 'recurring',
    buffer_minutes = 0, max_advance_days = 60, min_notice_hours = 24,
    questions = [], anzahlung_enabled = false, anzahlung_type, anzahlung_amount,
    anzahlung_days_due, active = true,
    recurring_availability = [],
    specific_slots = [],
    slug: customSlug,
  } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Generate slug, ensure uniqueness by appending counter if needed
  let slug = customSlug?.trim() ? generateSlug(customSlug) : generateSlug(title)
  if (!slug) slug = 'booking'

  // Check if slug already exists for this photographer
  const { data: existing } = await supabase
    .from('booking_types')
    .select('id')
    .eq('photographer_id', user.id)
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const { data: bt, error: btErr } = await supabase
    .from('booking_types')
    .insert({
      photographer_id: user.id,
      slug, title: title.trim(), description, duration_minutes, location_type,
      price, currency, availability_type, buffer_minutes, max_advance_days,
      min_notice_hours, questions, specific_slots,
      anzahlung_enabled,
      anzahlung_type: anzahlung_enabled ? anzahlung_type : null,
      anzahlung_amount: anzahlung_enabled ? anzahlung_amount : null,
      anzahlung_days_due: anzahlung_enabled ? anzahlung_days_due : null,
      active,
    })
    .select()
    .single()

  if (btErr) return NextResponse.json({ error: btErr.message }, { status: 500 })

  // Insert recurring availability windows if provided
  if (recurring_availability.length > 0 && availability_type === 'recurring') {
    const rows = recurring_availability.map((w: { day_of_week: number; start_time: string; end_time: string }) => ({
      booking_type_id: bt.id,
      day_of_week: w.day_of_week,
      start_time: w.start_time,
      end_time: w.end_time,
    }))
    await supabase.from('booking_recurring_availability').insert(rows)
  }

  return NextResponse.json({ bookingType: bt }, { status: 201 })
}
