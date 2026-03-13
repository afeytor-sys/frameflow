'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PLAN_DISPLAY, PLAN_LIMITS, PLAN_UNLOCK_COPY, type PlanKey } from '@/lib/stripe'
import UpgradeModal from '@/components/dashboard/UpgradeModal'
import { Check, ExternalLink, CreditCard, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  plan: PlanKey
  hasStripeCustomer: boolean
}

export default function BillingClient({ plan, hasStripeCustomer }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const searchParams = useSearchParams()

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const display = PLAN_DISPLAY[plan]
  const limits = PLAN_LIMITS[plan]

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
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Abrechnung</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">Verwalte dein Abo und deine Zahlungsmethoden.</p>
      </div>

      {/* Success / canceled banners */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-[#3DBA6F]/10 rounded-xl border border-[#3DBA6F]/20">
          <Check className="w-5 h-5 text-[#3DBA6F] flex-shrink-0" />
          <p className="text-sm text-[#3DBA6F] font-medium">
            Upgrade erfolgreich! Dein neuer Plan ist jetzt aktiv. 🎉
          </p>
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-3 p-4 bg-[#E8A21A]/10 rounded-xl border border-[#E8A21A]/20">
          <p className="text-sm text-[#E8A21A]">Upgrade abgebrochen. Du kannst jederzeit upgraden.</p>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide mb-1">Aktueller Plan</p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">{display.name}</h2>
              {plan !== 'free' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#3DBA6F]/10 text-[#3DBA6F]">
                  Aktiv
                </span>
              )}
            </div>
            <p className="text-sm text-[#6B6B6B] mt-1">
              {plan === 'free'
                ? 'Kostenlos · Keine Kreditkarte erforderlich'
                : `€${display.price}/Monat`}
            </p>
          </div>

          <div className="flex gap-2">
            {plan !== 'studio' && (
              <button
                onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Upgraden
              </button>
            )}
            {hasStripeCustomer && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#E8E8E4] text-sm font-medium text-[#1A1A1A] rounded-lg hover:bg-[#F0F0EC] transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {portalLoading ? 'Weiterleitung...' : 'Abo verwalten'}
              </button>
            )}
          </div>
        </div>

        {/* Plan features */}
        <div className="mt-5 pt-5 border-t border-[#E8E8E4]">
          <p className="text-xs font-medium text-[#6B6B6B] mb-3">Enthaltene Funktionen</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#3DBA6F] flex-shrink-0" />
              <span className="text-xs text-[#6B6B6B]">
                {limits.maxClients === null ? 'Unbegrenzte Kunden' : `Bis zu ${limits.maxClients} Kunden`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#3DBA6F] flex-shrink-0" />
              <span className="text-xs text-[#6B6B6B]">
                {limits.maxContractsPerClient === null ? 'Unbegrenzte Verträge' : `${limits.maxContractsPerClient} Vertrag pro Kunde`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn('w-3.5 h-3.5 flex-shrink-0', !limits.watermark ? 'text-[#3DBA6F]' : 'text-[#E8E8E4]')} />
              <span className={cn('text-xs', !limits.watermark ? 'text-[#6B6B6B]' : 'text-[#C0C0C0] line-through')}>
                Galerie ohne Wasserzeichen
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn('w-3.5 h-3.5 flex-shrink-0', limits.customBranding ? 'text-[#3DBA6F]' : 'text-[#E8E8E4]')} />
              <span className={cn('text-xs', limits.customBranding ? 'text-[#6B6B6B]' : 'text-[#C0C0C0] line-through')}>
                Eigenes Branding
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn('w-3.5 h-3.5 flex-shrink-0', limits.analytics ? 'text-[#3DBA6F]' : 'text-[#E8E8E4]')} />
              <span className={cn('text-xs', limits.analytics ? 'text-[#6B6B6B]' : 'text-[#C0C0C0] line-through')}>
                Analytics-Dashboard
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn('w-3.5 h-3.5 flex-shrink-0', limits.teamSeats > 1 ? 'text-[#3DBA6F]' : 'text-[#E8E8E4]')} />
              <span className={cn('text-xs', limits.teamSeats > 1 ? 'text-[#6B6B6B]' : 'text-[#C0C0C0] line-through')}>
                Team ({limits.teamSeats} {limits.teamSeats === 1 ? 'Seat' : 'Seats'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment method info */}
      {hasStripeCustomer && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-4 h-4 text-[#6B6B6B]" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Zahlungsmethode & Rechnungen</h3>
          </div>
          <p className="text-sm text-[#6B6B6B] mb-4">
            Verwalte deine Zahlungsmethode, lade Rechnungen herunter und kündige dein Abo im Stripe-Kundenportal.
          </p>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[#E8E8E4] text-sm font-medium text-[#1A1A1A] rounded-lg hover:bg-[#F0F0EC] transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {portalLoading ? 'Weiterleitung...' : 'Stripe-Kundenportal öffnen'}
          </button>
        </div>
      )}

      {/* Free plan CTA */}
      {plan === 'free' && (
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl p-6 text-white">
          <h3 className="font-display text-lg font-semibold mb-2">Bereit für mehr?</h3>
          <p className="text-sm text-white/70 mb-4">
            Upgrade auf Starter ab €9/Monat und verwalte bis zu 10 Kunden ohne Wasserzeichen.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8A882] text-[#1A1A1A] text-sm font-semibold rounded-lg hover:bg-[#D4B896] transition-colors"
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
