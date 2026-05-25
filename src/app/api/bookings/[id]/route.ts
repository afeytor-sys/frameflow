import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    notes?: string | null
    google_meet_link?: string | null
    manual_title?: string | null
    client_name?: string
    client_email?: string
    booked_date?: string
    booked_time?: string
  }

  const updates: Record<string, string | null> = {}
  if ('notes' in body) updates.notes = body.notes ?? null
  if ('google_meet_link' in body) updates.google_meet_link = body.google_meet_link?.trim() || null
  if ('manual_title' in body) updates.manual_title = body.manual_title?.trim() || null
  if ('client_name' in body && body.client_name?.trim()) updates.client_name = body.client_name.trim()
  if ('client_email' in body && body.client_email?.trim()) updates.client_email = body.client_email.trim()
  if ('booked_date' in body && body.booked_date) updates.booked_date = body.booked_date
  if ('booked_time' in body && body.booked_time) updates.booked_time = body.booked_time

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
