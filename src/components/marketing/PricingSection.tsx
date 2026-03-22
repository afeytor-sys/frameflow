'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Feature rows shown on every plan card ────────────────────────────────────
// Each entry: { label, included: Set of plan keys that have it }
const ALL_FEATURES: { label: string; plans: ('free' | 'starter' | 'pro' | 'studio')[] }[] = [
  { label: 'Bis zu 2 aktive Kunden',                plans: ['free'] },
  { label: 'Bis zu 10 aktive Kunden',               plans: ['starter'] },
  { label: 'Unbegrenzte Kunden',                    plans: ['pro', 'studio'] },
  { label: 'Bis zu 2 Projekte & Galerien',          plans: ['free'] },
  { label: 'Bis zu 10 Projekte & Galerien',         plans: ['starter'] },
  { label: 'Unbegrenzte Projekte & Galerien',       plans: ['pro', 'studio'] },
  { label: 'Bis zu 2 Verträge',                     plans: ['free'] },
  { label: 'Bis zu 10 Verträge',                    plans: ['starter'] },
  { label: 'Unbegrenzte Verträge',                  plans: ['pro', 'studio'] },
  { label: '5 GB Speicherplatz',                    plans: ['free'] },
  { label: '150 GB Speicherplatz',                  plans: ['starter'] },
  { label: '1 TB Speicherplatz',                    plans: ['pro'] },
  { label: '3 TB Speicherplatz',                    plans: ['studio'] },
  { label: 'Kunden-Portal',                         plans: ['starter', 'pro', 'studio'] },
  { label: 'Vertrags-Vorlagen mit E-Signatur',      plans: ['starter', 'pro', 'studio'] },
  { label: 'Rechnungen',                            plans: ['starter', 'pro', 'studio'] },
  { label: '"Fotonizer" Badge ausblenden',          plans: ['starter', 'pro', 'studio'] },
  { label: 'Analytics-Dashboard',                   plans: ['pro', 'studio'] },
  { label: 'E-Mail Automationen',                   plans: ['pro', 'studio'] },
  { label: 'Fragebögen',                            plans: ['pro', 'studio'] },
  { label: 'Pipeline (CRM)',                        plans: ['pro', 'studio'] },
  { label: 'Bis zu 3 Fotografen-Accounts',          plans: ['studio'] },
  { label: 'Priority support',                      plans: ['pro', 'studio'] },
]

type PlanKey = 'free' | 'starter' | 'pro' | 'studio'

// Features shown per plan card (subset relevant to that plan)
const PLAN_FEATURE_ROWS: Record<PlanKey, string[]> = {
  free: [
    'Bis zu 2 aktive Kunden',
    'Bis zu 2 Projekte & Galerien',
    'Bis zu 2 Verträge',
    '5 GB Speicherplatz',
    'Kunden-Portal',
    'Vertrags-Vorlagen mit E-Signatur',
    'Rechnungen',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
  ],
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

// Which features are INCLUDED (✓) for each plan
const INCLUDED: Record<PlanKey, Set<string>> = {
  free: new Set([
    'Bis zu 2 aktive Kunden',
    'Bis zu 2 Projekte & Galerien',
    'Bis zu 2 Verträge',
    '5 GB Speicherplatz',
  ]),
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
    key: 'free' as PlanKey,
    name: 'Free',
    monthly: 0,
    annual: 0,
    description: 'Zum Ausprobieren',
    badge: null,
    cta: 'Kostenlos starten',
    href: '/signup',
    highlight: false,
    comingSoon: false,
  },
  {
    key: 'starter' as PlanKey,
    name: 'Starter',
    monthly: 17,
    annual: 160,
    description: 'Für wachsende Studios',
    badge: null,
    cta: 'Starter wählen',
    href: '/signup?plan=starter',
    highlight: false,
    comingSoon: false,
  },
  {
    key: 'pro' as PlanKey,
    name: 'Pro',
    monthly: 24,
    annual: 230,
    description: 'Für professionelle Fotografen',
    badge: 'Beliebteste Wahl',
    cta: 'Pro wählen',
    href: '/signup?plan=pro',
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
    cta: 'Demnächst verfügbar',
    href: '/signup?plan=studio',
    highlight: false,
    comingSoon: true,
  },
]

export default function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  return (
    <div>
      {/* Promo banner */}
      <div className="flex items-center justify-center gap-2.5 mb-8 px-4 py-3 rounded-2xl max-w-xl mx-auto"
        style={{ background: 'linear-gradient(135deg, #F59E0B15 0%, #EC489915 100%)', border: '1px solid #F59E0B30' }}>
        <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
        <p className="text-sm font-semibold text-center" style={{ color: '#1A1A1A' }}>
          🎉 <span style={{ color: '#F59E0B' }}>Launch offer:</span> First <strong>3 months 50% off</strong> on all paid plans — automatically!
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const pricePerMonth = billing === 'annual' && plan.annual > 0
            ? Math.round(plan.annual / 12)
            : plan.monthly
          const annualTotal = plan.annual
          const promoPrice = pricePerMonth > 0 ? Math.round(pricePerMonth * 0.5) : 0
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

                {pricePerMonth > 0 ? (
                  <>
                    <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                      <span className={cn('font-display text-3xl font-bold', plan.highlight ? 'text-white' : 'text-[#1A1A1A]')}>
                        €{promoPrice}
                      </span>
                      <span className={cn('text-xs', plan.highlight ? 'text-white/60' : 'text-[#6B6B6B]')}>/Monat</span>
                      <span className={cn('text-sm line-through', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>€{pricePerMonth}</span>
                    </div>
                    <p className="text-[10px] font-semibold mb-1 text-[#F59E0B]">
                      🎉 50% off — erste 3 Monate
                    </p>
                    <p className={cn('text-[10px]', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                      danach €{pricePerMonth}/Monat zzgl. MwSt.
                    </p>
                    {billing === 'annual' && annualTotal > 0 && (
                      <p className={cn('text-xs mt-0.5 font-medium', plan.highlight ? 'text-white/60' : 'text-[#6B6B6B]')}>
                        €{annualTotal}/Jahr (gesamt)
                      </p>
                    )}
                    {billing === 'monthly' && plan.annual > 0 && (
                      <p className={cn('text-[10px] mt-0.5', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                        oder €{Math.round(plan.annual / 12)}/Monat bei jährlicher Zahlung
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={cn('font-display text-3xl font-bold', plan.highlight ? 'text-white' : 'text-[#1A1A1A]')}>
                      Gratis
                    </span>
                  </div>
                )}
              </div>

              {/* Feature list with ✓ included and ✗ locked */}
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
                  href={plan.href}
                  className={cn(
                    'block text-center py-2.5 rounded-xl text-sm font-medium transition-all',
                    plan.highlight
                      ? 'bg-[#C8A882] text-[#1A1A1A] hover:bg-[#D4B896]'
                      : 'border border-[#E8E8E4] text-[#1A1A1A] hover:bg-[#F0F0EC]'
                  )}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
