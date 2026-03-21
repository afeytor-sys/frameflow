import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('photographers')
    .update({
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_token_expiry: null,
      google_calendar_id: null,
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
