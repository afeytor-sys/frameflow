import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find the invite code
  const { data: invite } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid code' }, { status: 404 })

  // Check if expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Dieser Code ist abgelaufen' }, { status: 400 })
  }

  // Check if max uses reached
  if (invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: 'Dieser Code wurde bereits verwendet' }, { status: 400 })
  }

  // Check if this photographer already used this code
  const { data: existingUse } = await supabase
    .from('invite_code_uses')
    .select('id')
    .eq('code_id', invite.id)
    .eq('photographer_id', user.id)
    .single()

  if (existingUse) {
    return NextResponse.json({ error: 'Du hast diesen Code bereits verwendet' }, { status: 400 })
  }

  // Calculate trial end date
  const trialEndsAt = new Date()
  trialEndsAt.setMonth(trialEndsAt.getMonth() + invite.months_free)

  // Apply trial to photographer
  const { error: updateError } = await supabase
    .from('photographers')
    .update({
      plan: invite.plan,
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Fehler beim Aktivieren' }, { status: 500 })
  }

  // Record the use
  await supabase.from('invite_code_uses').insert({
    code_id: invite.id,
    photographer_id: user.id,
  })

  // Increment use count
  await supabase
    .from('invite_codes')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id)

  return NextResponse.json({
    success: true,
    plan: invite.plan,
    months: invite.months_free,
    trial_ends_at: trialEndsAt.toISOString(),
  })
}
