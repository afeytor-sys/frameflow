'use client'

import { useState } from 'react'
import { X, Check, Zap, Sparkles, Gift, ArrowRight } from 'lucide-react'
import { PLAN_DISPLAY, PLAN_UNLOCK_COPY, type PlanKey } from '@/lib/stripe'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentPlan: PlanKey
  reason?: string // e.g. "Du hast dein Kundenlimit erreicht"
}

const UPGRADE_TARGETS: PlanKey[] = ['starter', 'pro', 'studio']
const COMING_SOON: PlanKey[] = ['studio']

export default function UpgradeModal({ isOpen, onClose, currentPlan, reason }: Props) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  if (!isOpen) return null

  const handleRedeemInvite = async () => {
    if (!inviteCode.trim()) return
    setInviteLoading(true)
    setInviteStatus(null)
    try {
      const res = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteStatus({ ok: true, msg: data.message || '🎉 Code redeemed! Your plan has been updated.' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setInviteStatus({ ok: false, msg: data.error || 'Invalid or already used code.' })
      }
    } catch {
      setInviteStatus({ ok: false, msg: 'Verbindungsfehler. Bitte versuche es erneut.' })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleUpgrade = async (plan: PlanKey) => {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Fehler beim Weiterleiten zu Stripe. Bitte versuche es erneut.')
        setLoading(null)
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.')
      setLoading(null)
    }
  }

  // Annual price comes directly from PLAN_DISPLAY.annualPrice
  const getAnnualTotal = (plan: PlanKey) => PLAN_DISPLAY[plan].annualPrice

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
              Annual
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                billing === 'annual' ? 'bg-[#3DBA6F] text-white' : 'bg-[#3DBA6F]/10 text-[#3DBA6F]'
              )}>
                10% Rabatt
              </span>
            </button>
          </div>
        </div>

        {/* Promo banner */}
        <div className="mx-6 mt-5 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #F59E0B15 0%, #EC489915 100%)', border: '1px solid #F59E0B30' }}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <p className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>
            🎉 <span style={{ color: '#F59E0B' }}>Launch offer:</span> First <strong>3 months 50% off</strong> — automatisch!
          </p>
        </div>

        {/* Einladungscode banner */}
        <div className="mx-6 mt-4 rounded-xl overflow-hidden" style={{ border: '2px solid #C8A882' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #C8A88220 0%, #F0E8D820 100%)' }}>
            <Gift className="w-4 h-4 flex-shrink-0" style={{ color: '#C8A882' }} />
            <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Redeem invite code</span>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#C8A88225', color: '#A8845C' }}>Beta-Zugang</span>
          </div>
          <div className="px-4 py-3" style={{ background: '#FDFCFA' }}>
            <p className="text-xs text-[#6B6B6B] mb-3">Have you received an invite code? Redeem it here and get free access.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeemInvite()}
                placeholder="FOTO-BETA-XXXX"
                maxLength={20}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono font-semibold tracking-widest border-2 outline-none transition-all"
                style={{
                  border: inviteStatus?.ok ? '2px solid #3DBA6F' : inviteStatus?.ok === false ? '2px solid #EF4444' : '2px solid #E8E8E4',
                  background: '#FFFFFF',
                  color: '#1A1A1A',
                  letterSpacing: '0.1em',
                }}
              />
              <button
                onClick={handleRedeemInvite}
                disabled={inviteLoading || !inviteCode.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#C8A882', color: '#FFFFFF' }}
              >
                {inviteLoading ? '...' : <><span>Redeem</span><ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
            {inviteStatus && (
              <p className={`text-xs mt-2 font-medium ${inviteStatus.ok ? 'text-[#3DBA6F]' : 'text-red-500'}`}>
                {inviteStatus.msg}
              </p>
            )}
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 grid sm:grid-cols-3 gap-4">
          {UPGRADE_TARGETS.map((plan) => {
            const display = PLAN_DISPLAY[plan]
            const features = PLAN_UNLOCK_COPY[plan]
            const isCurrentOrLower = plan === currentPlan
            const isPro = plan === 'pro'
            const isComingSoon = COMING_SOON.includes(plan)
            const monthlyPrice = display.price
            const annualPrice = getAnnualTotal(plan)
            const displayPrice = billing === 'annual' ? Math.round(annualPrice / 12) : monthlyPrice
            const promoPrice = Math.round(displayPrice * 0.5)

            return (
              <div
                key={plan}
                className={cn(
                  'rounded-xl border-2 p-4 flex flex-col relative',
                  isPro ? 'border-[#1A1A1A]' : 'border-[#E8E8E4]',
                  isComingSoon && 'opacity-60'
                )}
              >
                {isComingSoon && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-block bg-[#6B6B6B]/10 text-[#6B6B6B] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Coming Soon
                    </span>
                  </div>
                )}
                {isPro && (
                  <div className="text-center mb-3">
                    <span className="inline-block bg-[#1A1A1A] text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                      Beliebteste Wahl
                    </span>
                  </div>
                )}

                <div className="mb-3">
                  <p className="font-semibold text-[#1A1A1A] text-sm">{display.name}</p>
                  <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                    <span className="font-display text-2xl font-bold text-[#1A1A1A]">
                      €{promoPrice}
                    </span>
                    <span className="text-xs text-[#6B6B6B]">/Monat</span>
                    <span className="text-sm line-through text-[#9CA3AF]">€{displayPrice}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-[#F59E0B] mt-0.5">🎉 50% off — erste 3 Monate</p>
                  <p className="text-[10px] text-[#9CA3AF]">danach €{displayPrice}/Monat zzgl. MwSt.</p>
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

                {isComingSoon ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-lg text-sm font-medium border border-[#E8E8E4] text-[#9CA3AF] cursor-not-allowed bg-[#F0F0EC]"
                  >
                    Coming soon
                  </button>
                ) : (
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
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <p className="text-center text-xs text-red-500 px-6 pb-3">
            ⚠️ {error}
          </p>
        )}
        <p className="text-center text-xs text-[#6B6B6B] pb-5">
          Cancel anytime · Secure payment via Stripe
        </p>
      </div>
    </div>
  )
}
