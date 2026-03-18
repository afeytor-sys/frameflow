'use client'

import { useState, useEffect } from 'react'

export type AppLocale = 'en' | 'de'

function readLocaleCookie(): AppLocale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  const val = match ? match[1] : null
  return val === 'de' ? 'de' : 'en'
}

export function useLocale(): AppLocale {
  const [locale, setLocale] = useState<AppLocale>(readLocaleCookie)

  useEffect(() => {
    setLocale(readLocaleCookie())
  }, [])

  return locale
}
