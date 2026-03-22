'use client'

import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, Users, User } from 'lucide-react'

// ── Single-password mode ─────────────────────────────────────────────────────
interface SingleProps {
  password: string
  children: React.ReactNode
  guestPassword?: never
  publicContent?: never
  allContent?: never
}

// ── Two-password mode (Kunden + Gast) ────────────────────────────────────────
// Both photo sets are pre-rendered server-side as ReactNode and passed as props.
interface DualProps {
  password: string          // Kunden-Password → full access (all photos)
  guestPassword: string     // Gast-Password   → limited access (no private photos)
  publicContent: React.ReactNode   // pre-rendered JSX for public photos
  allContent: React.ReactNode      // pre-rendered JSX for all photos
  children?: never
}

type Props = SingleProps | DualProps

export default function GalleryPasswordGate(props: Props) {
  const isDual = 'guestPassword' in props && !!props.guestPassword

  const [unlocked, setUnlocked] = useState(false)
  const [unlockedContent, setUnlockedContent] = useState<React.ReactNode>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isDual) {
      const dp = props as DualProps
      const kundenKey = `gallery_pw_${btoa(dp.password)}`
      const gastKey   = `gallery_pw_${btoa(dp.guestPassword)}`
      if (sessionStorage.getItem(kundenKey) === '1') {
        setUnlockedContent(dp.allContent)
        setUnlocked(true)
      } else if (sessionStorage.getItem(gastKey) === '1') {
        setUnlockedContent(dp.publicContent)
        setUnlocked(true)
      }
    } else {
      const sp = props as SingleProps
      const key = `gallery_pw_${btoa(sp.password)}`
      if (sessionStorage.getItem(key) === '1') setUnlocked(true)
    }
    setChecking(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()

    if (isDual) {
      const dp = props as DualProps
      if (trimmed === dp.password.trim()) {
        sessionStorage.setItem(`gallery_pw_${btoa(dp.password)}`, '1')
        setUnlockedContent(dp.allContent)
        setUnlocked(true)
        setError(false)
      } else if (trimmed === dp.guestPassword.trim()) {
        sessionStorage.setItem(`gallery_pw_${btoa(dp.guestPassword)}`, '1')
        setUnlockedContent(dp.publicContent)
        setUnlocked(true)
        setError(false)
      } else {
        setError(true)
        setInput('')
      }
    } else {
      const sp = props as SingleProps
      if (trimmed === sp.password.trim()) {
        sessionStorage.setItem(`gallery_pw_${btoa(sp.password)}`, '1')
        setUnlocked(true)
        setError(false)
      } else {
        setError(true)
        setInput('')
      }
    }
  }

  if (checking) return null
  if (unlocked) {
    if (isDual) return <>{unlockedContent}</>
    return <>{(props as SingleProps).children}</>
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Top accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #C4A47C, #D4B48C)' }} />

        <div style={{ padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            {/* Lock icon */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'rgba(196,164,124,0.12)',
              border: '1px solid rgba(196,164,124,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Lock style={{ width: '22px', height: '22px', color: '#C4A47C' }} />
            </div>

            <h1 style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: '20px',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.03em',
              margin: '0 0 6px',
            }}>
              Passwort erforderlich
            </h1>
            <p style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: '13px',
              color: '#6B7280',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {isDual
                ? <>Diese Galerie ist passwortgeschützt.<br />Kunden-Passwort: alle Fotos · Gast-Passwort: öffentliche Fotos</>
                : <>Diese Galerie ist passwortgeschützt.<br />Bitte gib das Passwort ein, um fortzufahren.</>
              }
            </p>

            {/* Two-password hint badges */}
            {isDual && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.20)' }}>
                  <User style={{ width: 11, height: 11, color: '#8B5CF6' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#8B5CF6', fontFamily: '"DM Sans", system-ui, sans-serif' }}>Kunden-PW</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.20)' }}>
                  <Users style={{ width: 11, height: 11, color: '#6B7280' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: '"DM Sans", system-ui, sans-serif' }}>Gast-PW</span>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={input}
                onChange={e => { setInput(e.target.value); setError(false) }}
                placeholder="Passwort eingeben..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  borderRadius: '12px',
                  border: error ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                  background: error ? 'rgba(239,68,68,0.04)' : '#F9FAFB',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPw
                  ? <EyeOff style={{ width: '16px', height: '16px' }} />
                  : <Eye style={{ width: '16px', height: '16px' }} />
                }
              </button>
            </div>

            {error && (
              <p style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: '12px',
                color: '#EF4444',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                ❌ Falsches Passwort. Bitte versuche es erneut.
              </p>
            )}

            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: input.trim() ? '#C4A47C' : '#E5E7EB',
                color: input.trim() ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: '14px',
                fontWeight: 700,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 150ms',
                letterSpacing: '-0.01em',
              }}
            >
              Galerie öffnen →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
