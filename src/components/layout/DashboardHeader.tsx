'use client'

import { useState, useEffect } from 'react'
import type { Photographer } from '@/types/database'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/layout/NotificationBell'

interface Props {
  photographer: Photographer
}

export default function DashboardHeader({ photographer }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [currentLocale, setCurrentLocale] = useState<string>('de')

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
    const val = match ? match[1] : null
    setCurrentLocale(val === 'en' ? 'en' : 'de')
  }, [])

  const toggleLocale = async () => {
    const next = currentLocale === 'de' ? 'en' : 'de'
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`
    setCurrentLocale(next)
    try {
      const supabase = createClient()
      await supabase
        .from('photographers')
        .update({ language: next, locale: next })
        .eq('id', photographer.id)
    } catch { /* non-critical */ }
    window.location.reload()
  }

  return (
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
          onClick={toggleLocale}
          className="header-icon-btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
          title={currentLocale === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'}
        >
          <span className="text-[13px]">{currentLocale === 'de' ? '🇩🇪' : '🇬🇧'}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ fontFamily: 'monospace' }}>
            {currentLocale.toUpperCase()}
          </span>
        </button>
      </div>
    </header>
  )
}
