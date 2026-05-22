'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, HardDrive, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRIAL_DAYS } from '@/lib/stripe'

type PlanKey = 'starter' | 'pro' | 'studio'
type Billing = 'monthly' | 'annual'

const PLANS = [
  {
    key: 'starter' as PlanKey,
    name: 'Starter',
    storage: '20 GB',
    description: 'Für wachsende Studios',
    monthly: 17,
    annual: 163,
    highlight: false,
    badge: null as string | null,
    studioExtras: null as string[] | null,
  },
  {
    key: 'pro' as PlanKey,
    name: 'Pro',
    storage: '1 TB',
    description: 'Für professionelle Fotografen',
    monthly: 29.99,
    annual: 288,
    highlight: true,
    badge: 'Beliebteste Wahl',
    studioExtras: null,
  },
  {
    key: 'studio' as PlanKey,
    name: 'Studio',
    storage: '2 TB',
    description: 'Für Teams & Agenturen',
    monthly: 69,
    annual: 690,
    highlight: false,
    badge: null,
    studioExtras: ['3 Fotografen-Accounts', 'Team-Verwaltung'],
  },
]

const ALL_INCLUDED = [
  'CRM & Pipeline', 'Buchungs-Links', 'Galerien', 'Kundenportal',
  'Verträge & E-Signatur', 'Rechnungen & Angebote', 'Formulare',
  'E-Mail Automationen', 'Analytics',
]

export default function SelectPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')

  const [billing, setBilling] = useState<Billing>('annual')
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/signup'); return }
      supabase
        .from('photographers')
        .select('stripe_sub_status')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const active = data?.stripe_sub_status === 'active' || data?.stripe_sub_status === 'trialing'
          if (active) { router.replace('/dashboard'); return }
          setCheckingAuth(false)
        })
    })
  }, [router])

  const handleSelectPlan = async (plan: PlanKey) => {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing, successUrl: '/dashboard?welcome=1' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setLoading(null)
    } catch {
      setLoading(null)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="w-5 h-5 rounded-full border-2 border-[#C4A47C] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-black text-[18px] tracking-tight" style={{ letterSpacing: '-0.04em', color: '#111110' }}>
          Fotonizer
        </span>
        <Link href="/login" className="text-[13px]" style={{ color: '#6B6B6B' }}>
          Bereits Kunde?{' '}
          <span style={{ color: '#111110', fontWeight: 700 }}>Anmelden</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-5 pb-16 pt-2">
        {/* Canceled notice */}
        {canceled && (
          <div className="flex items-center gap-2.5 mb-6 p-3.5 rounded-xl max-w-md mx-auto"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
            <X className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <p className="text-[12.5px]" style={{ color: '#92400E' }}>
              Kein Problem — du kannst jederzeit zurückkehren und einen Plan wählen.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-[12px] font-semibold"
            style={{ background: 'rgba(16,185,129,0.10)', color: '#059669', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />
            Account erstellt ✓
          </div>

          <h1
            className="font-black mb-3"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', letterSpacing: '-0.04em', lineHeight: 1.1, color: '#111110' }}
          >
            Wähle deinen Plan
          </h1>
          <p className="text-[14px] mb-2 max-w-sm mx-auto" style={{ color: '#6B6B6B', lineHeight: 1.6 }}>
            Alle Pläne enthalten denselben vollen Funktionsumfang.
          </p>
          <p className="text-[13px] mb-7" style={{ color: '#9CA3AF' }}>
            Du unterscheidest dich nur durch Speicherplatz und Team-Größe.
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-7">
            {[
              { icon: '🔒', text: 'Keine Zahlung heute' },
              { icon: '✅', text: `${TRIAL_DAYS} Tage kostenlos` },
              { icon: '↩️', text: 'Jederzeit kündbar' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5">
                <span className="text-sm">{item.icon}</span>
                <span className="text-[12px] font-medium" style={{ color: '#4B5563' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Billing toggle */}
          <div
            className="inline-flex p-1 rounded-xl gap-1"
            style={{ background: '#EBEBEA', border: '1px solid #E2E2DE' }}
          >
            {(['monthly', 'annual'] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all flex items-center gap-1.5',
                  billing === b ? 'bg-white text-[#111110] shadow-sm' : 'text-[#6B6B6B] hover:text-[#111110]'
                )}
              >
                {b === 'monthly' ? 'Monatlich' : 'Jährlich'}
                {b === 'annual' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#3DBA6F] text-white">–20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => {
            const price = billing === 'annual' ? Math.round(plan.annual / 12) : plan.monthly
            const isLoading = loading === plan.key
            const anyLoading = loading !== null

            return (
              <div
                key={plan.key}
                className={cn(
                  'rounded-2xl flex flex-col relative overflow-hidden transition-all',
                  plan.highlight
                    ? 'bg-[#111110] text-white ring-2 ring-[#111110]'
                    : 'bg-white border border-[#E8E8E4]'
                )}
                style={plan.highlight
                  ? { boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }
                  : { boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }
                }
              >
                {plan.highlight && (
                  <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C)' }} />
                )}

                <div className="p-6 flex flex-col flex-1">
                  {plan.badge && (
                    <div className="mb-3">
                      <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: '#C4A47C', color: '#1A1A1A' }}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <p className={cn('font-bold text-[15px]', plan.highlight ? 'text-white' : 'text-[#111110]')}>
                    {plan.name}
                  </p>
                  <p className={cn('text-[11.5px] mb-5', plan.highlight ? 'text-white/50' : 'text-[#9CA3AF]')}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className="font-black"
                      style={{ fontSize: '2rem', letterSpacing: '-0.04em', color: plan.highlight ? 'white' : '#111110' }}
                    >
                      €{Number.isInteger(price) ? price : price.toFixed(2)}
                    </span>
                    <span className={cn('text-[12px]', plan.highlight ? 'text-white/50' : 'text-[#9CA3AF]')}>/Monat</span>
                  </div>
                  {billing === 'annual' ? (
                    <p className={cn('text-[10.5px] mb-5', plan.highlight ? 'text-white/35' : 'text-[#ABABAB]')}>
                      €{plan.annual}/Jahr · –20%
                    </p>
                  ) : <div className="mb-5" />}

                  {/* Storage hero */}
                  <div
                    className="rounded-xl px-4 py-4 mb-5 flex items-center gap-3"
                    style={plan.highlight
                      ? { background: 'rgba(196,164,124,0.12)', border: '1px solid rgba(196,164,124,0.25)' }
                      : { background: '#F5F4F2', border: '1px solid #ECEAE5' }
                    }
                  >
                    <HardDrive className="w-5 h-5 flex-shrink-0" style={{ color: plan.highlight ? '#C4A47C' : '#6B6B6B' }} />
                    <div>
                      <p
                        className="font-black leading-none"
                        style={{ fontSize: '1.8rem', letterSpacing: '-0.03em', color: plan.highlight ? '#C4A47C' : '#111110' }}
                      >
                        {plan.storage}
                      </p>
                      <p className={cn('text-[11px] mt-0.5', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                        Galerie-Speicher
                      </p>
                    </div>
                  </div>

                  {/* Alle Funktionen inklusive */}
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.highlight ? '#C4A47C' : '#10B981' }} />
                    <span className={cn('text-[13px] font-semibold', plan.highlight ? 'text-white/80' : 'text-[#1A1A1A]')}>
                      Alle Funktionen inklusive
                    </span>
                  </div>

                  {/* Studio extras */}
                  {plan.studioExtras && (
                    <div className="space-y-1 mt-3 mb-1">
                      {plan.studioExtras.map((e) => (
                        <div key={e} className="flex items-center gap-2">
                          <span className="text-[11px] font-black" style={{ color: '#C8A882' }}>+</span>
                          <span className="text-[12px]" style={{ color: '#6B6B6B' }}>{e}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* CTA */}
                  <button
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={anyLoading}
                    className={cn(
                      'mt-5 w-full py-3 rounded-xl text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all',
                      plan.highlight
                        ? 'bg-[#C4A47C] text-[#111110] hover:bg-[#D4B896] disabled:opacity-60'
                        : 'bg-[#111110] text-white hover:bg-[#1E1E1C] disabled:opacity-60'
                    )}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <>{TRIAL_DAYS} Tage kostenlos starten <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                  <p className={cn('text-center text-[10px] mt-2', plan.highlight ? 'text-white/30' : 'text-[#C0C0BC]')}>
                    Erste Zahlung nach {TRIAL_DAYS} Tagen · Jederzeit kündbar
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* "All plans include" chips */}
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.10em] mb-3" style={{ color: '#9CA3AF' }}>
            In allen Plänen enthalten
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {ALL_INCLUDED.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
                style={{ background: 'white', color: '#4B5563', border: '1px solid #E8E8E4' }}
              >
                <Check className="w-3 h-3 text-[#10B981]" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-4 px-5 rounded-2xl"
          style={{ background: 'white', border: '1px solid #E8E8E4' }}
        >
          {[
            { icon: '🔒', label: 'Sichere Zahlung via Stripe' },
            { icon: '🇩🇪', label: 'DSGVO-konform · EU-Server' },
            { icon: '⭐', label: '200+ Fotografen vertrauen Fotonizer' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-sm">{item.icon}</span>
              <span className="text-[12px] font-medium" style={{ color: '#6B6B6B' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
