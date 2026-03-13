'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex">

      {/* Left — dark brand panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-[#111110] flex-col justify-between p-12 flex-shrink-0">
        <Link
          href="/"
          className="text-[#F8F7F4] font-semibold"
          style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '18px', letterSpacing: '-0.02em' }}
        >
          FrameFlow
        </Link>

        <div>
          <p className="text-[#F8F7F4]/70 text-[17px] leading-relaxed mb-6" style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            "Meine Kunden kommentieren immer, wie professionell das Portal aussieht."
          </p>
          <div>
            <p className="text-[#F8F7F4] text-[14px] font-semibold">Marco R.</p>
            <p className="text-[#7A7670] text-[13px] mt-0.5">Event-Fotograf, München</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {['Verträge', 'Galerien', 'Zeitpläne'].map((item, i) => (
            <span key={item} className="flex items-center gap-6">
              <span className="text-[#7A7670] text-[12px]">{item}</span>
              {i < 2 && <span className="w-1 h-1 rounded-full bg-[#2A2A28]" />}
            </span>
          ))}
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
            FrameFlow
          </Link>

          <div className="mb-8">
            <h1
              className="text-[#111110] font-semibold mb-2"
              style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '28px', letterSpacing: '-0.03em' }}
            >
              Willkommen zurück
            </h1>
            <p className="text-[#7A7670] text-[14px]">Melde dich in deinem Studio-Account an.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-semibold text-[#111110] uppercase tracking-wide">
                  Passwort
                </label>
                <Link href="/reset-password" className="text-[12px] text-[#7A7670] hover:text-[#111110] transition-colors">
                  Vergessen?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-md border border-[#E4E1DC] bg-white text-[14px] text-[#111110] placeholder:text-[#B0ACA6] focus:outline-none focus:border-[#111110] transition-colors"
                style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}
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
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>

          <p className="text-[14px] text-[#7A7670] text-center mt-8">
            Noch kein Konto?{' '}
            <Link href="/signup" className="text-[#111110] font-semibold hover:underline">
              Kostenlos registrieren
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
