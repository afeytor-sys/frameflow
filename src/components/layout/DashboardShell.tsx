'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Photographer } from '@/types/database'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'

interface Props {
  photographer: Photographer
  children: React.ReactNode
}

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  if (diff <= 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DashboardShell({ photographer, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const isTrialing = photographer.stripe_sub_status === 'trialing'
  const daysLeft = isTrialing ? trialDaysLeft(photographer.trial_ends_at ?? null) : null
  const showTrialBanner = isTrialing && daysLeft !== null

  return (
    <div className="flex h-screen overflow-hidden page-bg">
      <DashboardSidebar
        photographer={photographer}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Trial countdown banner */}
        {showTrialBanner && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-2 flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, #1A1A1A 0%, #2A2520 100%)', borderBottom: '1px solid rgba(196,164,124,0.20)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm flex-shrink-0">⏳</span>
              <p className="text-[12.5px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                <span style={{ color: '#C4A47C', fontWeight: 700 }}>
                  Noch {daysLeft} Tag{daysLeft === 1 ? '' : 'e'}
                </span>
                {' '}kostenlos testen
                {photographer.trial_ends_at && (
                  <span style={{ color: 'rgba(255,255,255,0.40)' }}>
                    {' '}— endet am {formatDate(photographer.trial_ends_at)}
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="flex-shrink-0 text-[11.5px] font-bold px-3 py-1 rounded-lg transition-all hover:opacity-90"
              style={{ background: '#C4A47C', color: '#1A1A1A' }}
            >
              Abo verwalten
            </Link>
          </div>
        )}

        <DashboardHeader
          photographer={photographer}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-8 md:px-8 lg:px-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
