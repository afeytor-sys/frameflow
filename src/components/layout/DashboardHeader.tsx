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
        background: '#FAFAF8',
        borderBottom: '1px solid #E8E4DE',
      }}
    >
      {/* Language switcher */}
      <div className="relative">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#B0A99E] hover:text-[#1A1A1A] hover:bg-[#F0EDE8] transition-all"
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
                background: '#FFFFFF',
                border: '1px solid #E8E4DE',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
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
                      ? 'text-[#1A1A1A] font-semibold bg-[#F5F2EE]'
                      : 'text-[#6B6560] hover:text-[#1A1A1A] hover:bg-[#F5F2EE]'
                  )}
                >
                  <span>{flag}</span>
                  <span className="font-medium">{label}</span>
                  {photographer.language === code && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
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
