'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { Plus, Globe } from 'lucide-react'

interface Props {
  photographer: Photographer
}

export default function DashboardHeader({ photographer }: Props) {
  const t = useTranslations()
  const [langOpen, setLangOpen] = useState(false)

  const switchLanguage = (lang: string) => {
    document.cookie = `locale=${lang}; path=/; max-age=31536000`
    setLangOpen(false)
    window.location.reload()
  }

  return (
    <header className="h-14 bg-white border-b border-[#E4E1DC] flex items-center justify-between px-6 flex-shrink-0">
      <div />

      <div className="flex items-center gap-1.5">
        {/* New client */}
        <Link
          href="/dashboard/clients/new"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold bg-[#111110] text-[#F8F7F4] hover:bg-[#1E1E1C] transition-colors"
          style={{ letterSpacing: '0.01em' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t('nav.newClient')}
        </Link>

        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#7A7670] hover:text-[#111110] hover:bg-[#F2F0EC] transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
              {photographer.language || 'de'}
            </span>
          </button>

          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#E4E1DC] rounded-lg shadow-lg z-20 overflow-hidden min-w-[120px]">
                {[
                  { code: 'de', label: 'Deutsch' },
                  { code: 'en', label: 'English' },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => switchLanguage(code)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#F2F0EC] transition-colors',
                      photographer.language === code
                        ? 'text-[#C8A882] font-semibold'
                        : 'text-[#111110]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
