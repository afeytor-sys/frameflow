import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['new_lead', 'not_available', 'offer_sent', 'no_response', 'video_call', 'booking_confirmed']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, status } = await req.json()
  if (!conversationId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Fetch current status_changed_at to merge (not overwrite)
  const { data: existing } = await supabase
    .from('conversations')
    .select('status_changed_at')
    .eq('id', conversationId)
    .eq('photographer_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const history = (existing.status_changed_at as Record<string, string>) || {}
  // Only record first time a status is reached (don't overwrite earlier timestamps)
  if (!history[status]) {
    history[status] = new Date().toISOString()
  }

  const { error } = await supabase
    .from('conversations')
    .update({ lead_status: status, status_changed_at: history })
    .eq('id', conversationId)
    .eq('photographer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, history })
}
