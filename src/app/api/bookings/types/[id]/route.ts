import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateSlug } from '@/lib/bookingSlots'

// PATCH  /api/bookings/types/[id] — update booking type
// DELETE /api/bookings/types/[id] — delete booking type

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { recurring_availability, slug: customSlug, ...fields } = body

  // Verify ownership
  const { data: existing } = await supabase
    .from('booking_types')
    .select('id, slug')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Handle slug update
  if (customSlug !== undefined) {
    const newSlug = generateSlug(customSlug) || existing.slug
    fields.slug = newSlug
  }

  const { data: updated, error } = await supabase
    .from('booking_types')
    .update(fields)
    .eq('id', id)
    .eq('photographer_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Replace recurring availability if provided
  if (recurring_availability !== undefined) {
    await supabase.from('booking_recurring_availability').delete().eq('booking_type_id', id)
    if (recurring_availability.length > 0) {
      const rows = recurring_availability.map((w: { day_of_week: number; start_time: string; end_time: string }) => ({
        booking_type_id: id,
        day_of_week: w.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
      }))
      await supabase.from('booking_recurring_availability').insert(rows)
    }
  }

  return NextResponse.json({ bookingType: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('booking_types')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
