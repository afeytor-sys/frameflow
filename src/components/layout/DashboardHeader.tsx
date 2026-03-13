'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { Globe, ChevronDown } from 'lucide-react'

interface Props {
  photographer: Photographer
}

export default function DashboardHeader({ photographer }: Props) {
  const [langOpen, setLangOpen] = useState(false)

  const switchLanguage = (lang: string) => {
    document.cookie = `locale=${lang}; path=/; max-age=31536000`
    setLangOpen(false)
    window.location.reload()
  }

  return (
    <header
      className="h-[52px] flex items-center justify-end px-5 flex-shrink-0"
      style={{
        background: '#0D0D0C',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Language switcher */}
      <div className="relative">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
            {photographer.language || 'de'}
          </span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', langOpen && 'rotate-180')} />
        </button>

        {langOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
            <div
              className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-20 min-w-[130px]"
              style={{
                background: '#141413',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {[
                { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
              ].map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => switchLanguage(code)}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-2.5 transition-colors',
                    photographer.language === code
                      ? 'text-[#C4A47C] bg-white/[0.04]'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  )}
                >
                  <span>{flag}</span>
                  <span className="font-medium">{label}</span>
                  {photographer.language === code && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C4A47C]" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
