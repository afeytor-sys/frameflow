'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PLAN_DISPLAY, PLAN_LIMITS, type PlanKey } from '@/lib/stripe'
import UpgradeModal from '@/components/dashboard/UpgradeModal'
import {
  Check, X, ExternalLink, CreditCard, Zap, Crown, Users, Image,
  BarChart2, Globe, Headphones, FileText, Palette,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  plan: PlanKey
  hasStripeCustomer: boolean
}

const PLAN_COLORS: Record<PlanKey, { accent: string; bg: string; border: string; badge: string }> = {
  free:    { accent: '#6B7280', bg: 'rgba(107,114,128,0.08)',  border: 'rgba(107,114,128,0.20)', badge: '#6B7280' },
  starter: { accent: '#C8A882', bg: 'rgba(200,168,130,0.10)', border: 'rgba(200,168,130,0.30)', badge: '#C8A882' },
  pro:     { accent: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.30)', badge: '#8B5CF6' },
  studio:  { accent: '#0F0F0F', bg: 'rgba(15,15,15,0.06)',    border: 'rgba(15,15,15,0.20)',   badge: '#1A1A1A' },
}

interface FeatureRow {
  icon: React.ReactNode
  label: string
  getValue: (plan: PlanKey) => string | boolean
}

const FEATURES: FeatureRow[] = [
  {
    icon: <Users className="w-3.5 h-3.5" />,
    label: 'Aktive Kunden',
    getValue: (p) => PLAN_LIMITS[p].maxClients === null ? 'Unbegrenzt' : `Bis zu ${PLAN_LIMITS[p].maxClients}`,
  },
  {
    icon: <FileText className="w-3.5 h-3.5" />,
    label: 'Verträge pro Kunde',
    getValue: (p) => PLAN_LIMITS[p].maxContractsPerClient === null ? 'Unbegrenzt' : `Bis zu ${PLAN_LIMITS[p].maxContractsPerClient}`,
  },
  {
    icon: <Image className="w-3.5 h-3.5" />,
    label: 'Galerien',
    getValue: (p) => PLAN_LIMITS[p].maxGalleries === null ? 'Unbegrenzt' : `Bis zu ${PLAN_LIMITS[p].maxGalleries}`,
  },
  {
    icon: <Palette className="w-3.5 h-3.5" />,
    label: 'Eigenes Branding',
    getValue: (p) => PLAN_LIMITS[p].customBranding,
  },
  {
    icon: <BarChart2 className="w-3.5 h-3.5" />,
    label: 'Analytics-Dashboard',
    getValue: (p) => PLAN_LIMITS[p].analytics,
  },
  {
    icon: <Users className="w-3.5 h-3.5" />,
    label: 'Team-Seats',
    getValue: (p) => PLAN_LIMITS[p].teamSeats === 1 ? '1 Seat' : `${PLAN_LIMITS[p].teamSeats} Seats`,
  },
  {
    icon: <Globe className="w-3.5 h-3.5" />,
    label: 'Custom Domain',
    getValue: (p) => PLAN_LIMITS[p].customDomain,
  },
  {
    icon: <Headphones className="w-3.5 h-3.5" />,
    label: 'Prioritäts-Support',
    getValue: (p) => PLAN_LIMITS[p].prioritySupport,
  },
]

export default function BillingClient({ plan, hasStripeCustomer }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const searchParams = useSearchParams()

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const display = PLAN_DISPLAY[plan]
  const colors = PLAN_COLORS[plan]

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Fehler beim Öffnen des Kundenportals')
      }
    } catch {
      toast.error('Fehler beim Öffnen des Kundenportals')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1
          className="font-black"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
        >
          Abrechnung
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Verwalte dein Abo und deine Zahlungsmethoden.
        </p>
      </div>

      {/* Success / canceled banners */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
          <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
          <p className="text-[13px] font-bold" style={{ color: '#10B981' }}>
            Upgrade erfolgreich! Dein neuer Plan ist jetzt aktiv. 🎉
          </p>
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <p className="text-[13px]" style={{ color: '#F59E0B' }}>Upgrade abgebrochen. Du kannst jederzeit upgraden.</p>
        </div>
      )}

      {/* ── Current plan card ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', border: `1px solid ${colors.border}`, boxShadow: `0 4px 24px ${colors.accent}10` }}
      >
        {/* Top accent bar */}
        <div className="h-[3px] w-full" style={{ background: colors.accent }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
              >
                <Crown className="w-5 h-5" style={{ color: colors.accent }} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Aktueller Plan
                </p>
                <div className="flex items-center gap-2">
                  <h2
                    className="font-black text-[1.4rem]"
                    style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
                  >
                    {display.name}
                  </h2>
                  {plan !== 'free' && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: colors.bg, color: colors.accent, border: `1px solid ${colors.border}` }}
                    >
                      Aktiv
                    </span>
                  )}
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {plan === 'free'
                    ? 'Kostenlos · Keine Kreditkarte erforderlich'
                    : `€${display.price}/Monat`}
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
              {plan !== 'studio' && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Upgraden
                </button>
              )}
              {hasStripeCustomer && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {portalLoading ? 'Weiterleitung...' : 'Abo verwalten'}
                </button>
              )}
            </div>
          </div>

          {/* Features grid */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-muted)' }}>
              Enthaltene Funktionen
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {FEATURES.map((f) => {
                const val = f.getValue(plan)
                const isBoolean = typeof val === 'boolean'
                const enabled = isBoolean ? val : true
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{
                      background: enabled ? colors.bg : 'var(--bg-hover)',
                      border: `1px solid ${enabled ? colors.border : 'var(--border-color)'}`,
                      opacity: enabled ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: enabled ? colors.accent + '20' : 'var(--bg-surface)', color: enabled ? colors.accent : 'var(--text-muted)' }}
                    >
                      {enabled
                        ? <Check className="w-3 h-3" />
                        : <X className="w-3 h-3" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] font-bold"
                        style={{
                          color: enabled ? 'var(--text-primary)' : 'var(--text-muted)',
                          textDecoration: enabled ? 'none' : 'line-through',
                        }}
                      >
                        {f.label}
                      </p>
                      {!isBoolean && (
                        <p className="text-[10.5px]" style={{ color: colors.accent }}>
                          {val as string}
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0" style={{ color: enabled ? colors.accent : 'var(--text-muted)' }}>
                      {f.icon}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment method info */}
      {hasStripeCustomer && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
              <CreditCard className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Zahlungsmethode & Rechnungen
            </h3>
          </div>
          <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
            Verwalte deine Zahlungsmethode, lade Rechnungen herunter und kündige dein Abo im Stripe-Kundenportal.
          </p>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-bold transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {portalLoading ? 'Weiterleitung...' : 'Stripe-Kundenportal öffnen'}
          </button>
        </div>
      )}

      {/* Free plan CTA */}
      {plan === 'free' && (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4" style={{ color: '#C8A882' }} />
            <h3 className="font-black text-[15px] text-white" style={{ letterSpacing: '-0.03em' }}>
              Bereit für mehr?
            </h3>
          </div>
          <p className="text-[13px] mb-4" style={{ color: 'rgba(255,255,255,0.60)' }}>
            Upgrade auf Starter ab €9/Monat und verwalte bis zu 10 Kunden ohne Wasserzeichen.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
            style={{ background: '#C8A882', color: '#1A1A1A' }}
          >
            <Zap className="w-3.5 h-3.5" />
            Jetzt upgraden
          </button>
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={plan}
      />
    </div>
  )
}
