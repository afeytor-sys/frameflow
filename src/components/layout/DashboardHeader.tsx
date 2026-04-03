'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { Globe, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/layout/NotificationBell'

interface Props {
  photographer: Photographer
}

export default function DashboardHeader({ photographer }: Props) {
  const [langOpen, setLangOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const langBtnRef = useRef<HTMLButtonElement>(null)
  const { theme, toggleTheme } = useTheme()
  const [currentLocale, setCurrentLocale] = useState<string>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
    const cookieLocale = match ? match[1] : null
    if (cookieLocale === 'de' || cookieLocale === 'en') {
      setCurrentLocale(cookieLocale)
    } else {
      document.cookie = `locale=en; path=/; max-age=31536000; SameSite=Lax`
      setCurrentLocale('en')
    }
  }, [])


  const openLang = () => {
    if (!langOpen && langBtnRef.current) {
      const rect = langBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setLangOpen(o => !o)
  }

  const switchLanguage = (lang: string) => {
    document.cookie = `locale=${lang}; path=/; max-age=31536000; SameSite=Lax`
    setCurrentLocale(lang)
    setLangOpen(false)

    // Fire-and-forget — never block the reload
    try {
      const supabase = createClient()
      void supabase
        .from('photographers')
        .update({ language: lang, locale: lang })
        .eq('id', photographer.id)
    } catch { /* non-critical */ }

    window.location.reload()
  }

  const langDropdown = (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 99998 }}
        onClick={() => setLangOpen(false)}
      />
      <div
        className="dropdown-glass fixed rounded-xl overflow-hidden min-w-[140px]"
        style={{ top: dropdownPos.top, right: dropdownPos.right, zIndex: 99999 }}
      >
        {[
          { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
          { code: 'en', label: 'English', flag: '🇬🇧' },
        ].map(({ code, label, flag }) => {
          const isSelected = currentLocale === code
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
  )

  return (
    <>
      <header
        className="h-[52px] flex items-center justify-between px-5 gap-2 flex-shrink-0"
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <div />

        <div className="flex items-center gap-2">
          <WeatherWidget />
          <NotificationBell />

          <button
            onClick={toggleTheme}
            className="header-icon-btn w-8 h-8 rounded-xl"
            title={theme === 'light' ? 'Switch to Dark' : theme === 'dark' ? 'Switch to Mono' : 'Switch to Light'}
          >
            {theme === 'light' && <Moon className="w-3.5 h-3.5" />}
            {theme === 'dark'  && <Sun  className="w-3.5 h-3.5" />}
            {theme === 'mono'  && <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 }}>M</span>}
          </button>

          <button
            ref={langBtnRef}
            onClick={openLang}
            className="header-icon-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
              {currentLocale}
            </span>
            <ChevronDown className={cn('w-3 h-3 transition-transform', langOpen && 'rotate-180')} />
          </button>
        </div>
      </header>

      {mounted && langOpen && createPortal(langDropdown, document.body)}
    </>
  )
}
