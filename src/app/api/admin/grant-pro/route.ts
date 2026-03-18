import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const ADMIN_ID = '3f3a14b9-3bb2-40fa-b0eb-5fea92f67429'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { photographer_id, months, action } = await req.json()
  if (!photographer_id) return NextResponse.json({ error: 'photographer_id required' }, { status: 400 })

  const service = createServiceClient()

  if (action === 'revoke') {
    const { error } = await service
      .from('photographers')
      .update({ plan: 'free', trial_ends_at: null })
      .eq('id', photographer_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'revoked' })
  }

  // Grant PRO
  const m = parseInt(months) || 6
  const trialEndsAt = new Date()
  trialEndsAt.setMonth(trialEndsAt.getMonth() + m)

  const { error } = await service
    .from('photographers')
    .update({ plan: 'pro', trial_ends_at: trialEndsAt.toISOString() })
    .eq('id', photographer_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    action: 'granted',
    months: m,
    trial_ends_at: trialEndsAt.toISOString(),
  })
}
