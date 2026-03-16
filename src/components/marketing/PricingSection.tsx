'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    description: 'Zum Ausprobieren',
    features: [
      'Bis zu 2 aktive Kunden',
      'Bis zu 2 Verträge',
      'Bis zu 2 Projekte',
      'Bis zu 2 Galerien',
      '5 GB Speicherplatz',
      'Kunden-Portal',
    ],
    cta: 'Kostenlos starten',
    href: '/signup',
    highlight: false,
    comingSoon: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    monthly: 10,
    annual: 108, // 10 × 12 × 0.9 = 108
    description: 'Für wachsende Studios',
    features: [
      'Bis zu 10 aktive Kunden',
      'Bis zu 10 Verträge',
      'Bis zu 10 Projekte & Galerien',
      '15 GB Speicherplatz',
      '"Fotonizer" Badge ausblenden',
      'E-Mail-Vorlagen',
    ],
    cta: 'Starter wählen',
    href: '/signup?plan=starter',
    highlight: false,
    comingSoon: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 16,
    annual: 172, // 16 × 12 × 0.9 ≈ 172
    description: 'Für professionelle Fotografen',
    badge: 'Beliebteste Wahl',
    features: [
      'Unbegrenzte Kunden & Projekte',
      'Alles unbegrenzt',
      '1 TB Speicherplatz',
      '"Fotonizer" Logo ausblenden',
      'Analytics-Dashboard',
      'Prioritäts-Support',
    ],
    cta: 'Pro wählen',
    href: '/signup?plan=pro',
    highlight: true,
    comingSoon: false,
  },
  {
    key: 'studio',
    name: 'Studio',
    monthly: 31,
    annual: 324, // 27 × 12 = 324
    description: 'Für Teams & Agenturen',
    features: [
      'Alles in Pro',
      'Bis zu 2 Fotografen-Accounts',
      'Unbegrenzter Speicherplatz',
      '"Fotonizer" Logo ausblenden',
      'Analytics-Dashboard',
      'Prioritäts-Support',
    ],
    cta: 'Studio wählen',
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
          🎉 <span style={{ color: '#F59E0B' }}>Launch-Angebot:</span> Die ersten <strong>2 Monate 50% günstiger</strong> auf alle bezahlten Pläne — automatisch!
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
            10% Rabatt
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          // For annual billing: show per-month price (annual/12)
          const pricePerMonth = billing === 'annual' && plan.annual > 0
            ? Math.round(plan.annual / 12)
            : plan.monthly
          const annualTotal = plan.annual
          const promoPrice = pricePerMonth > 0 ? Math.round(pricePerMonth * 0.5) : 0

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
              {/* Coming Soon badge */}
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
                    <p className={cn('text-[10px] font-semibold mb-1', 'text-[#F59E0B]')}>
                      🎉 50% off — erste 2 Monate
                    </p>
                    <p className={cn('text-[10px]', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                      danach €{pricePerMonth}/Monat zzgl. MwSt.
                    </p>
                    {billing === 'annual' && annualTotal > 0 && (
                      <p className={cn('text-xs mt-0.5', plan.highlight ? 'text-white/50' : 'text-[#6B6B6B]')}>
                        €{annualTotal}/Jahr
                      </p>
                    )}
                    {billing === 'monthly' && plan.annual > 0 && (
                      <p className={cn('text-[10px] mt-0.5', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                        oder €{Math.round(plan.annual / 12)}/Monat jährlich
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

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', plan.highlight ? 'text-[#C8A882]' : 'text-[#3DBA6F]')} />
                    <span className={cn('text-xs leading-relaxed', plan.highlight ? 'text-white/80' : 'text-[#6B6B6B]')}>
                      {feature}
                    </span>
                  </li>
                ))}
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
