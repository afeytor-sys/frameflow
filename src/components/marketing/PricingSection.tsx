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
      'Bis zu 3 aktive Kunden',
      'Bis zu 3 Verträge',
      'Bis zu 3 Projekte',
      'Bis zu 3 Galerien',
      'Kunden-Portal',
    ],
    cta: 'Kostenlos starten',
    href: '/signup',
    highlight: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    monthly: 11,
    annual: 119, // 11 × 12 × 0.9 = 118.8 → 119
    description: 'Für wachsende Studios',
    features: [
      'Bis zu 10 aktive Kunden',
      'Bis zu 10 Verträge',
      'Bis zu 10 Galerien',
      '"Fotonizer" Badge ausblenden',
      'E-Mail-Vorlagen',
    ],
    cta: 'Starter wählen',
    href: '/signup?plan=starter',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 18,
    annual: 194, // 18 × 12 × 0.9 = 194.4 → 194
    description: 'Für professionelle Fotografen',
    badge: 'Beliebteste Wahl',
    features: [
      'Unbegrenzte Kunden',
      'Alles unbegrenzt',
      '"Powered by Fotonizer" ausblenden',
      'Analytics-Dashboard',
      'Prioritäts-Support',
    ],
    cta: 'Pro wählen',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    key: 'studio',
    name: 'Studio',
    monthly: 39,
    annual: 421, // 39 × 12 × 0.9 = 421.2 → 421
    description: 'Für Teams & Agenturen',
    comingSoon: true,
    features: [
      'Alles in Pro',
      'Bis zu 5 Fotografen-Accounts',
      'Custom Domain',
      'Custom E-Mail-Domain',
      'Full White Label',
    ],
    cta: 'Studio wählen',
    href: '/signup?plan=studio',
    highlight: false,
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
          🎉 <span style={{ color: '#F59E0B' }}>Lançamento:</span> Primeiros <strong>2 meses com 50% de desconto</strong> em todos os planos pagos — automaticamente!
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
          const price = billing === 'annual' ? Math.round(plan.annual / 12) : plan.monthly
          const annualTotal = plan.annual
          const promoPrice = price > 0 ? Math.round(price * 0.5) : 0

          return (
            <div
              key={plan.key}
              className={cn(
                'rounded-2xl border-2 p-6 flex flex-col relative',
                plan.highlight
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                  : (plan as {comingSoon?: boolean}).comingSoon
                  ? 'border-[#E8E8E4] bg-[#F8F8F6] opacity-75'
                  : 'border-[#E8E8E4] bg-white'
              )}
            >
              {(plan as {comingSoon?: boolean}).comingSoon && (
                <div className="absolute top-3 right-3">
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

                {price > 0 ? (
                  <>
                    {/* Promo: show original crossed out + promo price for first 2 months */}
                    <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                      <span className={cn('font-display text-3xl font-bold', plan.highlight ? 'text-white' : 'text-[#1A1A1A]')}>
                        €{promoPrice}
                      </span>
                      <span className={cn('text-xs', plan.highlight ? 'text-white/60' : 'text-[#6B6B6B]')}>/Monat</span>
                      <span className={cn('text-sm line-through', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>€{price}</span>
                    </div>
                    <p className={cn('text-[10px] font-semibold mb-1', plan.highlight ? 'text-[#F59E0B]' : 'text-[#F59E0B]')}>
                      🎉 50% off — erste 2 Monate
                    </p>
                    <p className={cn('text-[10px]', plan.highlight ? 'text-white/40' : 'text-[#9CA3AF]')}>
                      danach €{price}/Monat zzgl. MwSt.
                    </p>
                    {billing === 'annual' && annualTotal > 0 && (
                      <p className={cn('text-xs mt-0.5', plan.highlight ? 'text-white/50' : 'text-[#6B6B6B]')}>
                        €{annualTotal}/Jahr
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

              {(plan as {comingSoon?: boolean}).comingSoon ? (
                <button
                  disabled
                  className="block w-full text-center py-2.5 rounded-xl text-sm font-medium border border-[#E8E8E4] text-[#9CA3AF] cursor-not-allowed bg-[#F0F0EC]"
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
