'use client'

import { useState } from 'react'
import { X, Check, Zap } from 'lucide-react'
import { PLAN_DISPLAY, PLAN_UNLOCK_COPY, type PlanKey } from '@/lib/stripe'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentPlan: PlanKey
  reason?: string // e.g. "Du hast dein Kundenlimit erreicht"
}

const UPGRADE_TARGETS: PlanKey[] = ['starter', 'pro', 'studio']

export default function UpgradeModal({ isOpen, onClose, currentPlan, reason }: Props) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  if (!isOpen) return null

  const handleUpgrade = async (plan: PlanKey) => {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(null)
    }
  }

  const annualDiscount = (monthly: number) => Math.round(monthly * 10) // 2 months free = 10 months price

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8E4]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F0F0EC] flex items-center justify-center text-[#6B6B6B] hover:bg-[#E8E8E4] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#C8A882]/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#C8A882]" />
            </div>
            <span className="text-xs font-medium text-[#C8A882] uppercase tracking-wide">Upgrade</span>
          </div>

          <h2 className="font-display text-xl font-semibold text-[#1A1A1A] mb-1">
            Schalte mehr frei
          </h2>
          {reason && (
            <p className="text-sm text-[#6B6B6B]">{reason}</p>
          )}

          {/* Billing toggle */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                billing === 'monthly' ? 'bg-[#1A1A1A] text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
              )}
            >
              Monatlich
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                billing === 'annual' ? 'bg-[#1A1A1A] text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
              )}
            >
              Jährlich
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                billing === 'annual' ? 'bg-[#3DBA6F] text-white' : 'bg-[#3DBA6F]/10 text-[#3DBA6F]'
              )}>
                2 Monate gratis
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 grid sm:grid-cols-3 gap-4">
          {UPGRADE_TARGETS.map((plan) => {
            const display = PLAN_DISPLAY[plan]
            const features = PLAN_UNLOCK_COPY[plan]
            const isCurrentOrLower = plan === currentPlan
            const isPro = plan === 'pro'
            const monthlyPrice = display.price
            const annualPrice = annualDiscount(monthlyPrice)

            return (
              <div
                key={plan}
                className={cn(
                  'rounded-xl border-2 p-4 flex flex-col',
                  isPro ? 'border-[#1A1A1A]' : 'border-[#E8E8E4]'
                )}
              >
                {isPro && (
                  <div className="text-center mb-3">
                    <span className="inline-block bg-[#1A1A1A] text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                      Beliebteste Wahl
                    </span>
                  </div>
                )}

                <div className="mb-3">
                  <p className="font-semibold text-[#1A1A1A] text-sm">{display.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-display text-2xl font-bold text-[#1A1A1A]">
                      €{billing === 'annual' ? Math.round(annualPrice / 12) : monthlyPrice}
                    </span>
                    <span className="text-xs text-[#6B6B6B]">/Monat</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-xs text-[#6B6B6B] mt-0.5">€{annualPrice}/Jahr</p>
                  )}
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#3DBA6F] flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-[#6B6B6B]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrentOrLower || loading === plan}
                  className={cn(
                    'w-full py-2 rounded-lg text-sm font-medium transition-all',
                    isCurrentOrLower
                      ? 'bg-[#F0F0EC] text-[#6B6B6B] cursor-default'
                      : isPro
                      ? 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
                      : 'border border-[#E8E8E4] text-[#1A1A1A] hover:bg-[#F0F0EC]'
                  )}
                >
                  {loading === plan
                    ? 'Weiterleitung...'
                    : isCurrentOrLower
                    ? 'Aktueller Plan'
                    : `Auf ${display.name} upgraden`}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-[#6B6B6B] pb-5">
          Jederzeit kündbar · Sichere Zahlung via Stripe
        </p>
      </div>
    </div>
  )
}
