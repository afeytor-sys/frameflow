'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type PlanKey = 'starter' | 'pro' | 'studio'

// Features shown per plan card
const PLAN_FEATURE_ROWS: Record<PlanKey, string[]> = {
  starter: [
    'Bis zu 10 aktive Kunden',
    'Bis zu 10 Projekte & Galerien',
    'Bis zu 10 Verträge',
    '150 GB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
  ],
  pro: [
    'Unbegrenzte Kunden',
    'Unbegrenzte Projekte & Galerien',
    'Unbegrenzte Verträge',
    '1 TB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
    'Priority support',
  ],
  studio: [
    'Unbegrenzte Kunden',
    'Unbegrenzte Projekte & Galerien',
    'Unbegrenzte Verträge',
    '3 TB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
    'Bis zu 3 Fotografen-Accounts',
    'Priority support',
  ],
}

const INCLUDED: Record<PlanKey, Set<string>> = {
  starter: new Set([
    'Bis zu 10 aktive Kunden',
    'Bis zu 10 Projekte & Galerien',
    'Bis zu 10 Verträge',
    '150 GB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
  ]),
  pro: new Set([
    'Unbegrenzte Kunden',
    'Unbegrenzte Projekte & Galerien',
    'Unbegrenzte Verträge',
    '1 TB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
    'Priority support',
  ]),
  studio: new Set([
    'Unbegrenzte Kunden',
    'Unbegrenzte Projekte & Galerien',
    'Unbegrenzte Verträge',
    '3 TB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
    'Bis zu 3 Fotografen-Accounts',
    'Priority support',
  ]),
}

const PLANS = [
  {
    key: 'starter' as PlanKey,
    name: 'Starter',
    monthly: 14,
    annual: 134,
    description: 'Für wachsende Studios',
    badge: null,
    highlight: false,
    comingSoon: false,
  },
  {
    key: 'pro' as PlanKey,
    name: 'Pro',
    monthly: 22,
    annual: 211,
    description: 'Für professionelle Fotografen',
    badge: 'Beliebteste Wahl',
    highlight: true,
    comingSoon: false,
  },
  {
    key: 'studio' as PlanKey,
    name: 'Studio',
    monthly: 69,
    annual: 690,
    description: 'Für Teams & Agenturen',
    badge: null,
    highlight: false,
    comingSoon: true,
  },
]

export default function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  return (
    <div>
      {/* Trial banner */}
      <div
        className="flex items-center justify-center gap-2.5 mb-8 px-4 py-3 rounded-2xl max-w-xl mx-auto"
        style={{ background: 'linear-gradient(135deg, #10B98115 0%, #3B82F615 100%)', border: '1px solid #10B98130' }}
      >
        <span className="text-base">🎁</span>
        <p className="text-sm font-semibold text-center" style={{ color: '#1A1A1A' }}>
          <span style={{ color: '#10B981' }}>2 Monate kostenlos testen</span> — kein Risiko, jederzeit kündbar
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button
          onClick={() => setBilling('monthly')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            billing === 'monthly' ? 'bg-[#1A1A1A] text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
          )}
        >
          Monatlich
        </button>
        <button
          onClick={() => setBilling('annual')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            billing === 'annual' ? 'bg-[#1A1A1A] text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
          )}
        >
          Jährlich
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            billing === 'annual' ? 'bg-[#3DBA6F] text-white' : 'bg-[#3DBA6F]/10 text-[#3DBA6F]'
          )}>
            spare bis zu 20%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const pricePerMonth = billing === 'annual' && plan.annual > 0
            ? Math.round(plan.annual / 12)
            : plan.monthly
          const annualTotal = plan.annual
          const features = PLAN_FEATURE_ROWS[plan.key]
          const included = INCLUDED[plan.key]

          return (
            <div
              key={plan.key}
              className={cn(
                'rounded-2xl border-2 p-6 flex flex-col relative',
                plan.highlight
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                  : 'border-[#E8E8E4] bg-white',
                plan.comingSoon && 'opacity-70'
              )}
            >
              {plan.comingSoon && (
                <div className="absolute top-4 right-4">
                  <span className="inline-block bg-[#6B6B6B]/10 text-[#6B6B6B] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Coming Soon
                  </span>
                </div>
              )}

              {plan.badge && (
                <div className="mb-3">
                  <span className="inline-block bg-[#C8A882] text-[#1A1A1A] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <p className={cn('font-semibold text-sm mb-0.5', plan.highlight ? 'text-white' : 'text-[#1A1A1A]')}>
                  {plan.name}
                </p>
                <p className={cn('text-xs mb-3', plan.highlight ? 'text-white/60' : 'text-[#6B6B6B]')}>
                  {plan.description}
                </p>

                {/* Trial badge */}
                <div className="mb-3">
                  <span
                    className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: plan.highlight ? 'rgba(16,185,129,0.20)' : 'rgba(16,185,129,0.10)',
                      color: '#10B981',
                    }}
                  >
                    2 Monate kostenlos testen
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                  <span className={cn('font-display text-3xl font-bold', plan.highlight ? 'text-white' : 'text-[#1A1A1A]')}>
                    €{pricePerMonth}
                  </span>
                  <span className={cn('text-xs', plan.highlight ? 'text-white/60' : 'text-[#6B6B6B]')}>/Monat</span>
                </div>
                <p className={cn('text-[10px]', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                  Danach €{pricePerMonth}/Monat zzgl. MwSt.
                </p>
                {billing === 'annual' && annualTotal > 0 && (
                  <p className={cn('text-xs mt-0.5 font-medium', plan.highlight ? 'text-white/60' : 'text-[#6B6B6B]')}>
                    €{annualTotal}/Jahr (gesamt)
                  </p>
                )}
              </div>

              {/* Feature list */}
              <ul className="space-y-2 flex-1 mb-6">
                {features.map((feature) => {
                  const isIncluded = included.has(feature)
                  return (
                    <li key={feature} className="flex items-start gap-2">
                      {isIncluded ? (
                        <Check className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', plan.highlight ? 'text-[#C8A882]' : 'text-[#3DBA6F]')} />
                      ) : (
                        <X className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', plan.highlight ? 'text-white/25' : 'text-[#EF4444]/60')} />
                      )}
                      <span className={cn(
                        'text-xs leading-relaxed',
                        isIncluded
                          ? plan.highlight ? 'text-white/80' : 'text-[#6B6B6B]'
                          : plan.highlight ? 'text-white/30' : 'text-[#9CA3AF]'
                      )}>
                        {feature}
                      </span>
                    </li>
                  )
                })}
              </ul>

              {plan.comingSoon ? (
                <button
                  disabled
                  className="block text-center py-2.5 rounded-xl text-sm font-medium border border-[#E8E8E4] text-[#9CA3AF] cursor-not-allowed bg-[#F0F0EC]"
                >
                  Demnächst verfügbar
                </button>
              ) : (
                <Link
                  href={`/signup?plan=${plan.key}`}
                  className={cn(
                    'block text-center py-2.5 rounded-xl text-sm font-semibold transition-all',
                    plan.highlight
                      ? 'bg-[#C8A882] text-[#1A1A1A] hover:bg-[#D4B896]'
                      : 'border border-[#E8E8E4] text-[#1A1A1A] hover:bg-[#F0F0EC]'
                  )}
                >
                  Kostenlos starten
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Trust line */}
      <p className="text-center text-xs mt-6" style={{ color: '#9CA3AF' }}>
        Keine Kreditkarte im Voraus · Jederzeit kündbar · 60 Tage kostenlos
      </p>
    </div>
  )
}
