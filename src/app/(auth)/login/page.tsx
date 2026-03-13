'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-Mail oder Passwort ist falsch.'); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex">

      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-[#0D0D0C] flex-col justify-between p-10 xl:p-14 flex-shrink-0 relative overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="#C4A47C" fillOpacity="0.2"/>
            <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-display text-[#F7F6F3] font-semibold text-[18px] tracking-tight">
            Studioflow
          </span>
        </Link>

        {/* Quote */}
        <div className="relative z-10">
          <div className="w-8 h-0.5 bg-[#C4A47C] mb-6" />
          <blockquote className="text-[#F7F6F3]/70 text-[16px] leading-relaxed font-light mb-6" style={{ fontFamily: 'var(--font-display), Georgia, serif', fontStyle: 'italic' }}>
            "Meine Kunden kommentieren immer, wie professionell das Portal aussieht. Studioflow hat mein Business verändert."
          </blockquote>
          <div>
            <p className="text-[#F7F6F3] text-[13px] font-semibold">Marco R.</p>
            <p className="text-white/35 text-[12px] mt-0.5">Event-Fotograf · München</p>
          </div>
        </div>

        {/* Bottom features */}
        <div className="flex items-center gap-5 relative z-10">
          {['Verträge', 'Galerien', 'Zeitpläne'].map((item, i) => (
            <div key={item} className="flex items-center gap-5">
              <span className="text-white/30 text-[11px] font-medium tracking-wide">{item}</span>
              {i < 2 && <span className="w-px h-3 bg-white/10" />}
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="5" fill="#C4A47C" fillOpacity="0.15"/>
              <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-display text-[#0D0D0C] font-semibold text-[17px]">Studioflow</span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-[#0D0D0C] font-semibold mb-2" style={{ fontSize: '30px', letterSpacing: '-0.02em' }}>
              Willkommen zurück
            </h1>
            <p className="text-[#6E6A63] text-[14px]">Melde dich in deinem Studio-Account an.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#0D0D0C] mb-1.5 uppercase tracking-[0.07em]">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="max@studio.de"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2DED8] bg-white text-[14px] text-[#0D0D0C] placeholder:text-[#A8A49E] focus:outline-none focus:border-[#0D0D0C] focus:ring-2 focus:ring-[#0D0D0C]/5 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11.5px] font-semibold text-[#0D0D0C] uppercase tracking-[0.07em]">
                  Passwort
                </label>
                <Link href="/reset-password" className="text-[12px] text-[#A8A49E] hover:text-[#0D0D0C] transition-colors">
                  Vergessen?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#E2DED8] bg-white text-[14px] text-[#0D0D0C] placeholder:text-[#A8A49E] focus:outline-none focus:border-[#0D0D0C] focus:ring-2 focus:ring-[#0D0D0C]/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A49E] hover:text-[#6E6A63] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-[#C43B2C]/6 border border-[#C43B2C]/15 px-3.5 py-2.5">
                <p className="text-[13px] text-[#C43B2C]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0D0D0C] text-[#F7F6F3] text-[13.5px] font-semibold rounded-lg hover:bg-[#1A1A18] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Anmelden...
                </span>
              ) : (
                <>
                  Anmelden
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E2DED8]">
            <p className="text-[13.5px] text-[#6E6A63] text-center">
              Noch kein Konto?{' '}
              <Link href="/signup" className="text-[#0D0D0C] font-semibold hover:text-[#C4A47C] transition-colors">
                Kostenlos registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
