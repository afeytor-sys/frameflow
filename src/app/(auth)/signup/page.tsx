'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen des Kontos.')
        setLoading(false)
        return
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.')
      setLoading(false)
      return
    }

    // If invite code provided, store it to redeem after email confirmation
    if (inviteCode.trim()) {
      localStorage.setItem('pending_invite_code', inviteCode.trim().toUpperCase())
    }

    // Google Ads conversion — signup form submitted successfully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).gtag('event', 'ads_conversion_Contact_1', {})
    }

    setSuccess(true)
    setLoading(false)
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-md border border-[#E4E1DC] bg-white text-[14px] text-[#111110] placeholder:text-[#B0ACA6] focus:outline-none focus:border-[#111110] transition-colors"

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex">

      {/* Left — dark brand panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-[#111110] flex-col justify-between p-12 flex-shrink-0">
        <Link
          href="/"
          className="text-[#F8F7F4] font-semibold"
          style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '18px', letterSpacing: '-0.02em' }}
        >
          Fotonizer
        </Link>

        <div className="space-y-8">
          {[
            { num: '01', text: 'Konto erstellen — in unter einer Minute' },
            { num: '02', text: 'Plan wählen & 14 Tage kostenlos testen' },
            { num: '03', text: 'Kein Risiko — jederzeit kündbar, erste Zahlung nach 14 Tagen' },
          ].map(({ num, text }) => (
            <div key={num} className="flex items-start gap-4">
              <span
                className="text-[#C8A882] font-semibold flex-shrink-0"
                style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '13px' }}
              >
                {num}
              </span>
              <p className="text-[#F8F7F4]/70 text-[15px] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
            style={{ background: 'rgba(196,168,130,0.15)', border: '1px solid rgba(196,168,130,0.25)' }}
          >
            <span className="text-[11px] font-bold text-[#C8A882] uppercase tracking-wide">14 Tage kostenlos</span>
          </div>
          <p className="text-[#7A7670] text-[12px]">
            Über 200 Fotografen in Europa vertrauen Fotonizer.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-[360px] mx-auto">

          <Link
            href="/"
            className="text-[#111110] font-semibold mb-10 block lg:hidden"
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
                Almost there!
              </h2>
              <p className="text-[#7A7670] text-[14px] leading-relaxed">
                We sent a confirmation email to <strong className="text-[#111110]">{email}</strong>.
                Please click the link to activate your account.
              </p>
              {inviteCode.trim() && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-[#2D9E6B]/8 border border-[#2D9E6B]/20">
                  <p className="text-[13px] text-[#2D9E6B] font-medium">
                    🎁 Invite code saved — will be activated after confirmation.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1
                  className="text-[#111110] font-semibold mb-2"
                  style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '28px', letterSpacing: '-0.03em' }}
                >
                  Konto erstellen
                </h1>
                <p className="text-[#7A7670] text-[14px]">14 Tage kostenlos testen · Kreditkarte erforderlich · Jederzeit kündbar</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="max@studio.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>

                {/* Invite code toggle */}
                {!showInvite ? (
                  <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="flex items-center gap-1.5 text-[13px] text-[#C8A882] hover:text-[#B8946E] font-medium transition-colors"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    I was invited and have an invite code
                  </button>
                ) : (
                  <div>
                    <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                      Invite code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="e.g. FOTO-BETA-A1B2"
                        className={inputClass + ' pr-10 font-mono tracking-widest'}
                        autoFocus
                      />
                      <Gift className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8A882]" />
                    </div>
                    <p className="text-[11px] text-[#7A7670] mt-1">
                      🎁 With a valid code you get up to 6 months of Pro for free.
                    </p>
                  </div>
                )}

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
                  {loading ? 'Konto wird erstellt...' : '14 Tage kostenlos starten →'}
                </button>
              </form>

              <p className="text-[14px] text-[#7A7670] text-center mt-8">
                Bereits registriert?{' '}
                <Link href="/login" className="text-[#111110] font-semibold hover:underline">
                  Anmelden
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
