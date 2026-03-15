'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle, Camera, ArrowRight, Sparkles } from 'lucide-react'

export default function EmailConfirmedPage() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'linear-gradient(135deg, #FAFAF8 0%, #F5F0E8 100%)' }}
    >
      <div
        className="w-full max-w-md text-center"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(42,155,104,0.12)', border: '2px solid rgba(42,155,104,0.25)' }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: '#2A9B68' }} />
        </div>

        {/* Headline */}
        <h1
          className="font-black mb-3"
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            color: '#111110',
          }}
        >
          E-Mail bestätigt! 🎉
        </h1>

        <p className="text-lg mb-8" style={{ color: '#6B7280', lineHeight: 1.6 }}>
          Dein Konto ist jetzt aktiv. Willkommen bei{' '}
          <span className="font-semibold" style={{ color: '#C4A47C' }}>Fotonizer</span>
          {' '}— dein Fotostudio-Organizer.
        </p>

        {/* Feature highlights */}
        <div
          className="rounded-2xl p-5 mb-6 text-left space-y-3"
          style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#C4A47C' }}>
            Was dich erwartet
          </p>
          {[
            { icon: '📸', text: 'Projekte & Shootings verwalten' },
            { icon: '🖼️', text: 'Galerien für deine Kunden erstellen' },
            { icon: '✍️', text: 'Verträge digital unterschreiben lassen' },
            { icon: '📊', text: 'Analytics & Umsatz im Blick behalten' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium" style={{ color: '#374151' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-lg transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, #C4A47C 0%, #B8956A 100%)',
            boxShadow: '0 4px 20px rgba(196,164,124,0.4)',
          }}
        >
          <Sparkles className="w-5 h-5" />
          Jetzt loslegen
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="mt-4 text-sm" style={{ color: '#9CA3AF' }}>
          Oder{' '}
          <Link href="/dashboard" className="underline" style={{ color: '#C4A47C' }}>
            direkt zum Dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
