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
  }

  // Only allow updating notes and google_meet_link
  const updates: Record<string, string | null> = {}
  if ('notes' in body) updates.notes = body.notes ?? null
  if ('google_meet_link' in body) updates.google_meet_link = body.google_meet_link?.trim() || null

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
