'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Check for token_hash in URL (new Supabase PKCE / email link flow)
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
      const searchParams = new URLSearchParams(window.location.search)

      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash')
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = searchParams.get('type') || hashParams.get('type')

      // Case 1: token_hash in URL (email link with PKCE)
      if (tokenHash && (type === 'recovery' || type === 'email')) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (!error) {
          setReady(true)
          // Clean up URL
          window.history.replaceState({}, '', '/update-password')
          return
        }
      }

      // Case 2: access_token in hash (old implicit flow)
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!error) {
          setReady(true)
          window.history.replaceState({}, '', '/update-password')
          return
        }
      }

      // Case 3: already have a valid session (e.g. came from auth/callback)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        return
      }

      // Case 4: listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setReady(true)
        }
      })

      return () => subscription.unsubscribe()
    }

    init()
  }, [supabase])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => { window.location.href = '/dashboard' }, 2500)
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-md border border-[#E4E1DC] bg-white text-[14px] text-[#111110] placeholder:text-[#B0ACA6] focus:outline-none focus:border-[#111110] transition-colors"

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[360px]">

        <Link
          href="/"
          className="text-[#111110] font-semibold mb-10 block"
          style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '18px', letterSpacing: '-0.02em' }}
        >
          Fotonizer
        </Link>

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#2D9E6B]/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-[#2D9E6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2
              className="text-[#111110] font-semibold mb-2"
              style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '24px', letterSpacing: '-0.03em' }}
            >
              Password updated!
            </h2>
            <p className="text-[#7A7670] text-[14px] leading-relaxed">
              Your password has been changed successfully. You will be redirected shortly…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1
                className="text-[#111110] font-semibold mb-2"
                style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '28px', letterSpacing: '-0.03em' }}
              >
                New password
              </h1>
              <p className="text-[#7A7670] text-[14px]">
                Enter your new password.
              </p>
            </div>

            {!ready ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <svg className="animate-spin h-6 w-6 text-[#C8A882]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-[13px] text-[#7A7670]">Verifying your reset link…</p>
              </div>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Repeat password"
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-[#C94030]/8 border border-[#C94030]/20 px-3.5 py-2.5">
                    <p className="text-[13px] text-[#C94030]">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#111110] text-[#F8F7F4] text-[13px] font-semibold rounded-md hover:bg-[#1E1E1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                  style={{ letterSpacing: '0.01em' }}
                >
                  {loading ? 'Saving…' : 'Update password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
