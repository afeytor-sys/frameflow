'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { Globe, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

interface Props {
  photographer: Photographer
}

export default function DashboardHeader({ photographer }: Props) {
  const [langOpen, setLangOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const switchLanguage = (lang: string) => {
    document.cookie = `locale=${lang}; path=/; max-age=31536000`
    setLangOpen(false)
    window.location.reload()
  }

  return (
    <header
      className="h-[52px] flex items-center justify-end px-5 gap-2 flex-shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="header-icon-btn w-8 h-8 rounded-xl"
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      >
        {theme === 'light'
          ? <Moon className="w-3.5 h-3.5" />
          : <Sun className="w-3.5 h-3.5" />
        }
      </button>

      {/* Language switcher */}
      <div className="relative">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="header-icon-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
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
              className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-20 min-w-[140px]"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--card-shadow-hover)',
              }}
            >
              {[
                { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
              ].map(({ code, label, flag }) => {
                const isSelected = photographer.language === code
                return (
                  <button
                    key={code}
                    onClick={() => switchLanguage(code)}
                    className="header-icon-btn w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-2.5"
                    style={{
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                    }}
                  >
                    <span>{flag}</span>
                    <span className="font-medium">{label}</span>
                    {isSelected && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
