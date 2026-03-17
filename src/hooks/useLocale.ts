'use client'

import { useState, useEffect } from 'react'

export type AppLocale = 'en' | 'de'

export function useLocale(): AppLocale {
  const [locale, setLocale] = useState<AppLocale>('en')

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
    const cookieLocale = match ? match[1] : null
    if (cookieLocale === 'de' || cookieLocale === 'en') {
      setLocale(cookieLocale)
    }
  }, [])

  return locale
}
