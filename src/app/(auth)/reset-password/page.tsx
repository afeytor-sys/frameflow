'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else setSuccess(true)
  }

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2
              className="text-[#111110] font-semibold mb-2"
              style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '24px', letterSpacing: '-0.03em' }}
            >
              E-Mail gesendet
            </h2>
            <p className="text-[#7A7670] text-[14px] leading-relaxed mb-6">
              Wir haben dir einen Link zum Zurücksetzen deines Passworts an{' '}
              <strong className="text-[#111110]">{email}</strong> gesendet.
            </p>
            <Link
              href="/login"
              className="text-[13px] font-semibold text-[#111110] hover:underline"
            >
              ← Zurück zur Anmeldung
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1
                className="text-[#111110] font-semibold mb-2"
                style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '28px', letterSpacing: '-0.03em' }}
              >
                Passwort zurücksetzen
              </h1>
              <p className="text-[#7A7670] text-[14px]">
                Gib deine E-Mail-Adresse ein und wir senden dir einen Reset-Link.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="max@studio.de"
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#E4E1DC] bg-white text-[14px] text-[#111110] placeholder:text-[#B0ACA6] focus:outline-none focus:border-[#111110] transition-colors"
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
                {loading ? 'Senden...' : 'Reset-Link senden'}
              </button>
            </form>

            <p className="text-[14px] text-[#7A7670] text-center mt-8">
              <Link href="/login" className="text-[#111110] font-semibold hover:underline">
                ← Zurück zur Anmeldung
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
