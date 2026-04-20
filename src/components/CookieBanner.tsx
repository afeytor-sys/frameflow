'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'fotonizer_cookie_consent'

type ConsentState = {
  analytics: boolean
  marketing: boolean
  timestamp: string
}

function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentState
  } catch {
    return null
  }
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const consent: ConsentState = { analytics, marketing, timestamp: new Date().toISOString() }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  window.dispatchEvent(new Event('fotonizer:consent:updated'))
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(true)
  const [marketingOn, setMarketingOn] = useState(true)

  useEffect(() => {
    if (!readConsent()) setVisible(true)
  }, [])

  const acceptAll = () => {
    saveConsent(true, true)
    setVisible(false)
  }

  const rejectAll = () => {
    saveConsent(false, false)
    setVisible(false)
  }

  const saveCustom = () => {
    saveConsent(analyticsOn, marketingOn)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: '#1A1A1A', color: '#fff', fontSize: '13px' }}
    >
      {/* Main banner */}
      {!showDetails && (
        <div className="p-5">
          <p className="font-semibold mb-1" style={{ fontSize: '14px' }}>🍪 Cookie-Einstellungen</p>
          <p className="leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.60)', fontSize: '12px' }}>
            Wir nutzen Cookies für technisch notwendige Funktionen und — mit deiner Einwilligung — für
            Webanalyse (Google Analytics) und Werbung (Google Ads).{' '}
            <Link href="/datenschutz" className="underline" style={{ color: '#C8A882' }}>
              Datenschutzerklärung
            </Link>
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={acceptAll}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors"
              style={{ background: '#C8A882', color: '#1A1A1A' }}
            >
              Alle akzeptieren
            </button>
            <div className="flex gap-2">
              <button
                onClick={rejectAll}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}
              >
                Nur notwendige
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.60)' }}
              >
                Einstellungen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / customize panel */}
      {showDetails && (
        <div className="p-5">
          <button
            onClick={() => setShowDetails(false)}
            className="text-xs mb-3 flex items-center gap-1"
            style={{ color: 'rgba(255,255,255,0.40)' }}
          >
            ← Zurück
          </button>
          <p className="font-semibold mb-3" style={{ fontSize: '13px' }}>Cookie-Einstellungen</p>

          {/* Necessary — always on */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-medium text-xs">Notwendige Cookies</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Session, Authentifizierung — immer aktiv.
              </p>
            </div>
            <div
              className="flex-shrink-0 w-9 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
              style={{ background: '#C8A882', color: '#1A1A1A' }}
            >
              An
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-medium text-xs">Analyse (Google Analytics)</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Hilft uns, die Nutzung zu verstehen.
              </p>
            </div>
            <button
              onClick={() => setAnalyticsOn(v => !v)}
              className="flex-shrink-0 w-9 h-5 rounded-full transition-colors mt-0.5 text-[10px] font-bold"
              style={{
                background: analyticsOn ? '#C8A882' : 'rgba(255,255,255,0.15)',
                color: analyticsOn ? '#1A1A1A' : 'rgba(255,255,255,0.5)',
              }}
            >
              {analyticsOn ? 'An' : 'Aus'}
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-medium text-xs">Marketing (Google Ads)</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Conversion-Tracking für Werbeanzeigen.
              </p>
            </div>
            <button
              onClick={() => setMarketingOn(v => !v)}
              className="flex-shrink-0 w-9 h-5 rounded-full transition-colors mt-0.5 text-[10px] font-bold"
              style={{
                background: marketingOn ? '#C8A882' : 'rgba(255,255,255,0.15)',
                color: marketingOn ? '#1A1A1A' : 'rgba(255,255,255,0.5)',
              }}
            >
              {marketingOn ? 'An' : 'Aus'}
            </button>
          </div>

          <button
            onClick={saveCustom}
            className="w-full py-2.5 rounded-xl text-xs font-bold"
            style={{ background: '#C8A882', color: '#1A1A1A' }}
          >
            Einstellungen speichern
          </button>
        </div>
      )}
    </div>
  )
}
