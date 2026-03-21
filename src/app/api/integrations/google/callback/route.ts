import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
const REDIRECT_URI = `${APP_URL}/api/integrations/google/callback`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // photographer ID
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?tab=integrations&error=google_auth_failed`
    )
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
      console.error('Google token exchange failed:', tokens)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?tab=integrations&error=google_token_failed`
      )
    }

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Save tokens to DB
    const supabase = createServiceClient()
    const { error: dbError } = await supabase
      .from('photographers')
      .update({
        google_calendar_access_token: tokens.access_token,
        google_calendar_refresh_token: tokens.refresh_token || null,
        google_calendar_token_expiry: expiry,
      })
      .eq('id', state)

    if (dbError) {
      console.error('DB update error:', dbError)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?tab=integrations&error=db_error`
      )
    }

    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?tab=integrations&success=google_connected`
    )
  } catch (err) {
    console.error('Google callback error:', err)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?tab=integrations&error=unknown`
    )
  }
}
