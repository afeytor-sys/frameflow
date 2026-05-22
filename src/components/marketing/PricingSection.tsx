'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HardDrive, Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Billing = 'monthly' | 'annual'

const PLANS = [
  {
    key: 'starter',
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
    key: 'pro',
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
    key: 'studio',
    name: 'Studio',
    storage: '2 TB',
    description: 'Für Teams & Agenturen',
    monthly: 69,
    annual: 690,
    highlight: false,
    badge: null,
    studioExtras: ['Bis zu 3 Fotografen-Accounts', 'Team-Verwaltung & geteilte Projekte'],
  },
]

// All features included in every paid plan — shown once below cards
const ALL_INCLUDED = [
  'CRM & Pipeline',
  'Buchungs-Links',
  'Galerien',
  'Kundenportal',
  'Verträge & E-Signatur',
  'Rechnungen & Angebote',
  'Formulare',
  'E-Mail Automationen',
  'Analytics',
]

export default function PricingSection() {
  const [billing, setBilling] = useState<Billing>('annual')

  return (
    <div>
      {/* Trial banner */}
      <div
        className="flex items-center justify-center gap-2.5 mb-8 px-4 py-3 rounded-2xl max-w-lg mx-auto"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}
      >
        <span className="text-base">🎁</span>
        <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
          <span style={{ color: '#10B981' }}>14 Tage kostenlos testen</span>
          {' '}— kein Risiko, jederzeit kündbar
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-1 mb-10">
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
                billing === b ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
              )}
            >
              {b === 'monthly' ? 'Monatlich' : 'Jährlich'}
              {b === 'annual' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#3DBA6F] text-white">
                  –20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto mb-8">
        {PLANS.map((plan) => {
          const pricePerMonth = billing === 'annual'
            ? Math.round(plan.annual / 12)
            : plan.monthly

          return (
            <div
              key={plan.key}
              className={cn(
                'rounded-2xl flex flex-col relative overflow-hidden',
                plan.highlight
                  ? 'bg-[#111110] text-white ring-2 ring-[#111110]'
                  : 'bg-white border border-[#E8E8E4]'
              )}
              style={!plan.highlight ? { boxShadow: '0 2px 12px rgba(0,0,0,0.05)' } : { boxShadow: '0 8px 32px rgba(0,0,0,0.20)' }}
            >
              {/* Accent line on Pro */}
              {plan.highlight && (
                <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C)' }} />
              )}

              <div className="p-6 flex flex-col flex-1">
                {plan.badge && (
                  <div className="mb-3">
                    <span
                      className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: '#C8A882', color: '#1A1A1A' }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p className={cn('font-bold text-[15px]', plan.highlight ? 'text-white' : 'text-[#1A1A1A]')}>
                  {plan.name}
                </p>
                <p className={cn('text-[11.5px] mb-5', plan.highlight ? 'text-white/50' : 'text-[#9CA3AF]')}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span
                    className="font-black"
                    style={{
                      fontSize: '2rem',
                      letterSpacing: '-0.04em',
                      color: plan.highlight ? 'white' : '#111110',
                    }}
                  >
                    €{Number.isInteger(pricePerMonth) ? pricePerMonth : pricePerMonth.toFixed(2)}
                  </span>
                  <span className={cn('text-[12px]', plan.highlight ? 'text-white/50' : 'text-[#9CA3AF]')}>
                    /Monat
                  </span>
                </div>
                {billing === 'annual' ? (
                  <p className={cn('text-[10.5px] mb-6', plan.highlight ? 'text-white/35' : 'text-[#ABABAB]')}>
                    €{plan.annual}/Jahr gesamt · 20% Rabatt
                  </p>
                ) : (
                  <div className="mb-6" />
                )}

                {/* Storage — the hero element */}
                <div
                  className="rounded-xl px-4 py-4 mb-5 flex items-center gap-3"
                  style={plan.highlight
                    ? { background: 'rgba(196,164,124,0.12)', border: '1px solid rgba(196,164,124,0.25)' }
                    : { background: '#F5F4F2', border: '1px solid #ECEAE5' }
                  }
                >
                  <HardDrive
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: plan.highlight ? '#C8A882' : '#6B6B6B' }}
                  />
                  <div>
                    <p
                      className="font-black leading-none"
                      style={{
                        fontSize: '1.75rem',
                        letterSpacing: '-0.03em',
                        color: plan.highlight ? '#C8A882' : '#111110',
                      }}
                    >
                      {plan.storage}
                    </p>
                    <p className={cn('text-[11px] mt-0.5', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                      Galerie-Speicher
                    </p>
                  </div>
                </div>

                {/* "Alle Funktionen inklusive" */}
                <div className="flex items-center gap-2 mb-2">
                  <Check
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: plan.highlight ? '#C8A882' : '#10B981' }}
                  />
                  <span
                    className={cn('text-[13px] font-semibold', plan.highlight ? 'text-white/80' : 'text-[#1A1A1A]')}
                  >
                    Alle Funktionen inklusive
                  </span>
                </div>

                {/* Studio extras */}
                {plan.studioExtras && (
                  <div className="space-y-1.5 mb-4 mt-3">
                    {plan.studioExtras.map((extra) => (
                      <div key={extra} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{ color: '#C8A882' }}>+</span>
                        <span className="text-[12px]" style={{ color: '#6B6B6B' }}>{extra}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1" />

                {/* CTA */}
                <Link
                  href={`/signup?plan=${plan.key}`}
                  className={cn(
                    'mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all',
                    plan.highlight
                      ? 'bg-[#C8A882] text-[#1A1A1A] hover:bg-[#D4B896]'
                      : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
                  )}
                >
                  14 Tage kostenlos starten
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <p className={cn('text-center text-[10px] mt-2', plan.highlight ? 'text-white/30' : 'text-[#C0C0BC]')}>
                  Erste Zahlung nach 14 Tagen
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* "All plans include" feature chips */}
      <div className="max-w-4xl mx-auto">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.10em] mb-3" style={{ color: '#9CA3AF' }}>
          In allen Plänen enthalten
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {ALL_INCLUDED.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
              style={{ background: '#F0F0EC', color: '#4B5563', border: '1px solid #E8E8E4' }}
            >
              <Check className="w-3 h-3 text-[#10B981]" />
              {f}
            </span>
          ))}
        </div>
        <p className="text-center text-[11.5px] mt-5" style={{ color: '#9CA3AF' }}>
          Kreditkarte erforderlich · Keine Zahlung während der Testphase · Jederzeit kündbar
        </p>
      </div>
    </div>
  )
}
