'use client'

import { useState } from 'react'
import type { Photographer } from '@/types/database'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'

interface Props {
  photographer: Photographer
  children: React.ReactNode
}

export default function DashboardShell({ photographer, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden page-bg">
      <DashboardSidebar
        photographer={photographer}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
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
