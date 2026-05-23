'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

const PIXEL_ID = '1724913888499835'
const CONSENT_KEY = 'fotonizer_cookie_consent'

// ── Global type augmentation ────────────────────────────────────────────────
declare global {
  interface Window {
    fbq: {
      (...args: unknown[]): void
      callMethod?: (...args: unknown[]) => void
      queue: unknown[]
      push: (...args: unknown[]) => void
      loaded: boolean
      version: string
    }
    _fbq: Window['fbq']
  }
}

// ── Helper: check marketing consent ─────────────────────────────────────────
function hasMarketingConsent(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) return false
    const parsed = JSON.parse(stored)
    return parsed.marketing === true
  } catch {
    return false
  }
}

// ── Event helpers (call from anywhere in the app) ────────────────────────────
export function fbEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return
  if (!hasMarketingConsent()) return
  window.fbq('track', event, params)
}

export const MetaEvents = {
  pageView:             ()                          => fbEvent('PageView'),
  lead:                 (params?: Record<string, unknown>) => fbEvent('Lead', params),
  completeRegistration: (params?: Record<string, unknown>) => fbEvent('CompleteRegistration', params),
  startTrial:           (params?: Record<string, unknown>) => fbEvent('StartTrial', params),
  purchase:             (value: number, currency = 'EUR') => fbEvent('Purchase', { value, currency }),
  viewContent:          (params?: Record<string, unknown>) => fbEvent('ViewContent', params),
}

// ── Inner component — needs Suspense for useSearchParams ─────────────────────
function MetaPixelInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [enabled, setEnabled] = useState(false)

  // Enable on mount if consent already given, or when consent is updated
  useEffect(() => {
    if (hasMarketingConsent()) setEnabled(true)

    const handler = () => {
      if (hasMarketingConsent()) setEnabled(true)
    }
    window.addEventListener('fotonizer:consent:updated', handler)
    return () => window.removeEventListener('fotonizer:consent:updated', handler)
  }, [])

  // Track SPA route changes as PageView
  useEffect(() => {
    if (!enabled) return
    MetaEvents.pageView()
  }, [pathname, searchParams, enabled])

  if (!enabled) return null

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

// ── Public export — wrapped in Suspense (required for useSearchParams) ───────
export default function MetaPixel() {
  return (
    <Suspense fallback={null}>
      <MetaPixelInner />
    </Suspense>
  )
}
