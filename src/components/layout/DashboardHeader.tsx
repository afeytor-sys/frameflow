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
  const { theme, toggle } = useTheme()

  const switchLanguage = (lang: string) => {
    document.cookie = `locale=${lang}; path=/; max-age=31536000`
    setLangOpen(false)
    window.location.reload()
  }

  return (
    <header
      className="h-[52px] flex items-center justify-end px-5 gap-2 flex-shrink-0"
      style={{
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200"
        style={{ color: 'var(--text-muted)' }}
        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
        }}
      >
        {theme === 'dark'
          ? <Sun className="w-4 h-4" />
          : <Moon className="w-4 h-4" />
        }
      </button>

      {/* Language switcher */}
      <div className="relative">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          }}
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
              className="absolute right-0 top-full mt-1.5 rounded-2xl overflow-hidden z-20 min-w-[140px]"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              {[
                { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
              ].map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => switchLanguage(code)}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-2.5 transition-colors"
                  style={{
                    color: photographer.language === code ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: photographer.language === code ? '600' : '400',
                    background: photographer.language === code ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = photographer.language === code ? 'var(--bg-hover)' : 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = photographer.language === code ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span>{flag}</span>
                  <span className="font-medium">{label}</span>
                  {photographer.language === code && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-primary)' }} />
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
