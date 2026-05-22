'use client'

import { useState } from 'react'
import { X, Check, Zap, Sparkles, Gift, ArrowRight, HardDrive } from 'lucide-react'
import { PLAN_DISPLAY, PLAN_STORAGE_LABEL, TRIAL_DAYS, type PlanKey } from '@/lib/stripe'
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
      <div className="modal-glass relative rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            Mehr Galerie-Speicher
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            {reason || 'Alle Pläne enthalten denselben vollen Funktionsumfang — nur der Speicher unterscheidet sich.'}
          </p>

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

        {/* Trial banner */}
        <div className="mx-6 mt-5 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: '#10B98112', border: '1px solid #10B98130' }}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10B981' }} />
          <p className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>
            🎁 <span style={{ color: '#10B981' }}>{TRIAL_DAYS} Tage kostenlos testen</span> — kein Risiko, jederzeit kündbar
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
            const storage = PLAN_STORAGE_LABEL[plan]
            const isCurrentOrLower = plan === currentPlan
            const isPro = plan === 'pro'
            const isStudio = plan === 'studio'
            const isComingSoon = COMING_SOON.includes(plan)
            const annualPrice = getAnnualTotal(plan)
            const displayPrice = billing === 'annual' ? Math.round(annualPrice / 12) : display.price

            return (
              <div
                key={plan}
                className={cn(
                  'rounded-xl border-2 p-4 flex flex-col relative overflow-hidden',
                  isPro ? 'border-[#1A1A1A] bg-[#111110]' : 'border-[#E8E8E4] bg-white',
                  isComingSoon && 'opacity-60'
                )}
              >
                {isPro && (
                  <div className="h-[2px] absolute top-0 left-0 right-0" style={{ background: 'linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C)' }} />
                )}

                {isPro && (
                  <div className="text-center mb-3 mt-1">
                    <span className="inline-block bg-[#C8A882] text-[#1A1A1A] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Beliebteste Wahl
                    </span>
                  </div>
                )}

                {/* Plan name + price */}
                <p className={cn('font-bold text-sm mb-0.5', isPro ? 'text-white' : 'text-[#1A1A1A]')}>
                  {display.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={cn('font-black text-2xl', isPro ? 'text-white' : 'text-[#1A1A1A]')}
                    style={{ letterSpacing: '-0.04em' }}>
                    €{Number.isInteger(displayPrice) ? displayPrice : displayPrice.toFixed(2)}
                  </span>
                  <span className={cn('text-xs', isPro ? 'text-white/50' : 'text-[#9CA3AF]')}>/Mo</span>
                </div>
                {billing === 'annual' && (
                  <p className={cn('text-[9.5px] mb-3', isPro ? 'text-white/35' : 'text-[#ABABAB]')}>
                    €{annualPrice}/Jahr · –20%
                  </p>
                )}
                {billing === 'monthly' && <div className="mb-3" />}

                {/* Storage hero */}
                <div
                  className="rounded-lg px-3 py-3 mb-3 flex items-center gap-2.5"
                  style={isPro
                    ? { background: 'rgba(196,164,124,0.12)', border: '1px solid rgba(196,164,124,0.25)' }
                    : { background: '#F5F4F2', border: '1px solid #ECEAE5' }
                  }
                >
                  <HardDrive className="w-4 h-4 flex-shrink-0" style={{ color: isPro ? '#C8A882' : '#6B6B6B' }} />
                  <div>
                    <p
                      className="font-black leading-none"
                      style={{ fontSize: '1.4rem', letterSpacing: '-0.03em', color: isPro ? '#C8A882' : '#111110' }}
                    >
                      {storage}
                    </p>
                    <p className={cn('text-[9.5px] mt-0.5', isPro ? 'text-white/40' : 'text-[#9CA3AF]')}>
                      Galerie-Speicher
                    </p>
                  </div>
                </div>

                {/* "Alle Funktionen inklusive" */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: isPro ? '#C8A882' : '#10B981' }} />
                  <span className={cn('text-[11.5px] font-semibold', isPro ? 'text-white/80' : 'text-[#1A1A1A]')}>
                    Alle Funktionen inklusive
                  </span>
                </div>

                {/* Studio extra */}
                {isStudio && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-[#C8A882]">+</span>
                    <span className="text-[11px] text-[#6B6B6B]">3 Fotografen-Accounts</span>
                  </div>
                )}

                <div className="flex-1" />

                {isComingSoon ? (
                  <button disabled className="mt-3 w-full py-2 rounded-lg text-xs font-medium border border-[#E8E8E4] text-[#9CA3AF] cursor-not-allowed bg-[#F0F0EC]">
                    Coming soon
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isCurrentOrLower || loading === plan}
                    className={cn(
                      'mt-3 w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                      isCurrentOrLower
                        ? 'bg-[#F0F0EC] text-[#6B6B6B] cursor-default'
                        : isPro
                        ? 'bg-[#C8A882] text-[#1A1A1A] hover:bg-[#D4B896]'
                        : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
                    )}
                  >
                    {loading === plan ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : isCurrentOrLower ? (
                      'Aktueller Plan'
                    ) : (
                      <>{TRIAL_DAYS} Tage testen <ArrowRight className="w-3 h-3" /></>
                    )}
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
          Jederzeit kündbar · Sichere Zahlung via Stripe · Keine Zahlung während der Testphase
        </p>
      </div>
    </div>
  )
}
