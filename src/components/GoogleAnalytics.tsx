'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'

const GA_ID = 'G-2081M7T2H7'
const CONSENT_KEY = 'fotonizer_cookie_consent'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

export default function GoogleAnalytics() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  useEffect(() => {
    // Always define window.gtag as a no-op so existing gtag() calls don't crash
    // when the user hasn't consented. Events accumulate locally but are not sent.
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || []
      if (!window.gtag) {
        window.gtag = function (...args: unknown[]) { window.dataLayer.push(args) }
      }
    }

    // Check existing consent
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.analytics === true) setAnalyticsEnabled(true)
      }
    } catch {}

    // Listen for consent updates (e.g. user accepts via banner)
    const handler = () => {
      try {
        const stored = localStorage.getItem(CONSENT_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.analytics === true) setAnalyticsEnabled(true)
        }
      } catch {}
    }
    window.addEventListener('fotonizer:consent:updated', handler)
    return () => window.removeEventListener('fotonizer:consent:updated', handler)
  }, [])

  if (!analyticsEnabled) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
