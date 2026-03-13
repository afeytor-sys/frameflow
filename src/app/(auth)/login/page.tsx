'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Star } from 'lucide-react'

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
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* Left — brand panel (always dark) */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10 xl:p-14 flex-shrink-0 relative overflow-hidden"
        style={{ background: '#0A0A09' }}>
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        {/* Gold glow */}
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(196,164,124,0.12) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(196,164,124,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-[18px] text-white" style={{ letterSpacing: '-0.025em' }}>
            Studioflow
          </span>
        </Link>

        {/* Quote */}
        <div className="relative z-10">
          <div className="flex gap-0.5 mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#C4A47C' }} />
            ))}
          </div>
          <blockquote className="text-white/75 text-[16px] leading-relaxed font-light mb-6">
            &ldquo;Meine Kunden kommentieren immer, wie professionell das Portal aussieht. Studioflow hat mein Business verändert.&rdquo;
          </blockquote>
          <div>
            <p className="text-white text-[13px] font-bold">Marco R.</p>
            <p className="text-white/35 text-[12px] mt-0.5">Event-Fotograf · München</p>
          </div>
        </div>

        {/* Bottom features */}
        <div className="flex items-center gap-5 relative z-10">
          {['Verträge', 'Galerien', 'Zeitpläne'].map((item, i) => (
            <div key={item} className="flex items-center gap-5">
              <span className="text-white/30 text-[11px] font-semibold tracking-wide">{item}</span>
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
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V7.5L10 4L16 7.5V14" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 14V10.5H12.5V14" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Studioflow</span>
          </Link>

          <div className="mb-8 animate-in">
            <h1 className="font-black mb-2" style={{ fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Willkommen zurück
            </h1>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Melde dich in deinem Studio-Account an.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 animate-in-delay-1">
            <div>
              <label className="block text-[11.5px] font-bold mb-1.5 uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-primary)' }}>
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="max@studio.de"
                className="input-base"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--text-primary)' }}>
                  Passwort
                </label>
                <Link href="/reset-password" className="text-[12px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
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
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-3.5 py-2.5" style={{
                background: 'rgba(196,59,44,0.06)',
                border: '1px solid rgba(196,59,44,0.15)',
              }}>
                <p className="text-[13px]" style={{ color: '#C43B2C' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-shimmer w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all group mt-1"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(196,164,124,0.30)' }}
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

          <div className="mt-8 pt-6 animate-in-delay-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-[13.5px] text-center" style={{ color: 'var(--text-secondary)' }}>
              Noch kein Konto?{' '}
              <Link href="/signup" className="font-bold transition-colors" style={{ color: 'var(--accent)' }}>
                Kostenlos registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
