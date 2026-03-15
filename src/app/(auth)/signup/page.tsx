'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signupError, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Supabase returns success even for existing emails, but identities will be empty
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder setze dein Passwort zurück.')
      setLoading(false)
      return
    }

    // If invite code provided, try to redeem it after signup
    // (will be redeemed after email confirmation via onboarding)
    if (inviteCode.trim()) {
      // Store invite code in localStorage to redeem after email confirmation
      localStorage.setItem('pending_invite_code', inviteCode.trim().toUpperCase())
    }

    setSuccess(true)
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
            { num: '01', text: 'Konto erstellen — kostenlos, keine Kreditkarte' },
            { num: '02', text: 'Ersten Kunden anlegen und Projekt starten' },
            { num: '03', text: 'Link senden — Kunde erhält sofort sein Portal' },
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

        <p className="text-[#7A7670] text-[12px]">
          Bereits über 200 Fotografen in Europa vertrauen Fotonizer.
        </p>
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
                Fast geschafft!
              </h2>
              <p className="text-[#7A7670] text-[14px] leading-relaxed">
                Wir haben dir eine Bestätigungs-E-Mail an <strong className="text-[#111110]">{email}</strong> gesendet.
                Bitte klicke auf den Link, um dein Konto zu aktivieren.
              </p>
              {inviteCode.trim() && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-[#2D9E6B]/8 border border-[#2D9E6B]/20">
                  <p className="text-[13px] text-[#2D9E6B] font-medium">
                    🎁 Einladungscode gespeichert — wird nach der Bestätigung aktiviert.
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
                <p className="text-[#7A7670] text-[14px]">Kostenlos starten — keine Kreditkarte nötig.</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
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
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                    Passwort
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Mindestens 8 Zeichen"
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
                    Ich wurde eingeladen und habe einen Einladungscode
                  </button>
                ) : (
                  <div>
                    <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
                      Einladungscode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="z.B. FOTO-BETA-A1B2"
                        className={inputClass + ' pr-10 font-mono tracking-widest'}
                        autoFocus
                      />
                      <Gift className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8A882]" />
                    </div>
                    <p className="text-[11px] text-[#7A7670] mt-1">
                      🎁 Mit einem gültigen Code erhältst du bis zu 6 Monate gratis Pro.
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
                  {loading ? 'Konto wird erstellt...' : 'Kostenlos registrieren'}
                </button>
              </form>

              <p className="text-[14px] text-[#7A7670] text-center mt-8">
                Bereits ein Konto?{' '}
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
