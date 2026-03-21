import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
const REDIRECT_URI = `${APP_URL}/api/integrations/google/callback`

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`)
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state: user.id, // pass photographer ID as state
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
