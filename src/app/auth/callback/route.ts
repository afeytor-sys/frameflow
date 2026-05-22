import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // token_hash flow — recovery goes to update-password; signup confirms inline
  if (tokenHash && type === 'recovery') {
    return NextResponse.redirect(
      `${origin}/update-password?token_hash=${tokenHash}&type=recovery`
    )
  }

  if (tokenHash && type === 'signup') {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' })
    if (!error) {
      return NextResponse.redirect(`${origin}/select-plan`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Password recovery flow → redirect to update-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`)
      }
      // Email confirmation (signup) → plan selection with trial checkout
      if (type === 'signup' || next === '/dashboard') {
        return NextResponse.redirect(`${origin}/select-plan`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
