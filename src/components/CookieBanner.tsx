'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const COOKIE_KEY = 'fotonizer_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={cn(
      'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50',
      'bg-[#1A1A1A] text-white rounded-2xl shadow-2xl p-5'
    )}>
      <p className="text-sm font-medium mb-1">🍪 Cookies</p>
      <p className="text-xs text-white/60 mb-4 leading-relaxed">
        Wir verwenden technisch notwendige Cookies für die Authentifizierung.
        Weitere Cookies nur mit deiner Zustimmung.{' '}
        <Link href="/datenschutz" className="text-[#C8A882] hover:underline">
          Datenschutz
        </Link>
      </p>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 py-2 bg-[#C8A882] text-[#1A1A1A] text-xs font-semibold rounded-lg hover:bg-[#D4B896] transition-colors"
        >
          Alle akzeptieren
        </button>
        <button
          onClick={decline}
          className="flex-1 py-2 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/20 transition-colors"
        >
          Nur notwendige
        </button>
      </div>
    </div>
  )
}
