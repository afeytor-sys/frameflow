'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Share2, Copy, Check, X, Lock, Mail, Send, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Props {
  open: boolean
  onClose: () => void
  galleryTitle: string
  galleryUrl: string
  galleryPassword: string | null
  galleryGuestPassword?: string | null
  galleryId?: string | null
  studioName?: string
  clientName?: string
  clientEmail?: string | null
}

export default function GalleryShareModal({
  open,
  onClose,
  galleryTitle,
  galleryUrl,
  galleryPassword,
  galleryGuestPassword,
  galleryId,
  studioName,
  clientName,
  clientEmail,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [copiedGuestPassword, setCopiedGuestPassword] = useState(false)

  // Email sub-modal
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCopiedLink(false)
      setCopiedPassword(false)
      setShowEmailModal(false)
      setEmailSent(false)
      // Pre-fill with passed email or fetch from DB
      if (clientEmail) {
        setShareEmail(clientEmail)
      } else {
        setShareEmail('')
      }
    }
  }, [open, clientEmail])

  // Fetch client email from gallery → project → client when galleryId is available
  useEffect(() => {
    if (!open || !galleryId || clientEmail) return
    const supabase = createClient()
    supabase
      .from('galleries')
      .select('project:projects(client:clients(email))')
      .eq('id', galleryId)
      .single()
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proj = data?.project as any
        const client = Array.isArray(proj?.client) ? proj.client[0] : proj?.client
        if (client?.email) {
          setShareEmail(client.email)
        }
      })
  }, [open, galleryId, clientEmail])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = galleryUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const copyPassword = async () => {
    if (!galleryPassword) return
    try {
      await navigator.clipboard.writeText(galleryPassword)
    } catch {
      const el = document.createElement('textarea')
      el.value = galleryPassword
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  const sendEmail = async () => {
    if (!shareEmail.trim()) return
    setSendingEmail(true)
    try {
      const endpoint = galleryId
        ? `/api/galleries/${galleryId}/share`
        : '/api/galleries/share'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: shareEmail.trim(),
          clientName: clientName || undefined,
          galleryUrl,
          password: galleryPassword,
          galleryTitle,
          studioName: studioName || undefined,
        }),
      })
      if (res.ok) {
        setEmailSent(true)
        toast.success('E-Mail gesendet!')
        setTimeout(() => {
          setEmailSent(false)
          setShowEmailModal(false)
          setShareEmail('')
        }, 2000)
      } else {
        toast.error('Fehler beim Senden')
      }
    } catch {
      toast.error('Fehler beim Senden')
    } finally {
      setSendingEmail(false)
    }
  }

  if (!mounted || !open) return null

  // ── Email sub-modal ──────────────────────────────────────────────────────
  const emailModal = showEmailModal ? createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 10001, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={() => setShowEmailModal(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface, #fff)',
          border: '1px solid var(--border-color, #E8E4DC)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color, #E8E4DC)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(196,164,124,0.12)' }}
            >
              <Mail className="w-4 h-4" style={{ color: '#C4A47C' }} />
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary, #111110)', letterSpacing: '-0.01em' }}>
                Per E-Mail senden
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted, #7A7670)' }}>
                {galleryTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEmailModal(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted, #7A7670)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted, #7A7670)' }}>
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && shareEmail.trim()) sendEmail() }}
              placeholder="kunde@email.com"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none transition-all"
              style={{
                background: 'var(--bg-hover, #F5F4F1)',
                border: '1px solid var(--border-color, #E8E4DC)',
                color: 'var(--text-primary, #111110)',
              }}
            />
          </div>

          {/* Email preview card */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border-color, #E8E4DC)', background: 'var(--bg-page, #FAFAF8)' }}
          >
            {/* Preview header */}
            <div className="px-4 py-3" style={{ background: '#1A1A18' }}>
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: '#C4A47C' }}>
                {studioName || 'Dein Studio'}
              </p>
            </div>
            {/* Preview body */}
            <div className="px-4 py-3 space-y-3">
              <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary, #111110)', letterSpacing: '-0.01em' }}>
                📸 {galleryTitle}
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted, #7A7670)' }}>
                Deine Galerie ist bereit! Klicke auf den Button unten, um deine Fotos anzusehen.
              </p>
              {/* CTA button preview */}
              <div
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white"
                style={{ background: '#1A1A18' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Galerie öffnen →
              </div>
              {/* Password preview */}
              {galleryPassword && (
                <div
                  className="px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(196,164,124,0.08)', border: '1px solid rgba(196,164,124,0.2)' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: '#9A9590' }}>
                    🔒 Passwort
                  </p>
                  <p className="text-[14px] font-mono font-bold tracking-widest" style={{ color: '#1A1A18' }}>
                    {galleryPassword}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex gap-2.5 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-color, #E8E4DC)' }}
        >
          <button
            onClick={() => setShowEmailModal(false)}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
            style={{
              background: 'var(--bg-hover, #F5F4F1)',
              color: 'var(--text-muted, #7A7670)',
              border: '1px solid var(--border-color, #E8E4DC)',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={sendEmail}
            disabled={sendingEmail || !shareEmail.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 transition-all"
            style={{
              background: emailSent ? '#10B981' : '#C4A47C',
              boxShadow: emailSent ? '0 1px 8px rgba(16,185,129,0.25)' : '0 1px 8px rgba(196,164,124,0.20)',
            }}
          >
            {sendingEmail
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : emailSent
                ? <><Check className="w-4 h-4" />Gesendet!</>
                : <><Send className="w-4 h-4" />E-Mail senden</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  // ── Main share modal ─────────────────────────────────────────────────────
  const mainModal = createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface, #fff)',
          border: '1px solid var(--border-color, #E8E4DC)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color, #E8E4DC)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(196,164,124,0.12)' }}
            >
              <Share2 className="w-4 h-4" style={{ color: '#C4A47C' }} />
            </div>
            <div>
              <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary, #111110)', letterSpacing: '-0.01em' }}>
                {galleryTitle}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted, #7A7670)' }}>Galerie teilen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted, #7A7670)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* LINK section */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted, #7A7670)' }}>
              Link
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center px-3 py-2.5 rounded-xl min-w-0"
                style={{ background: 'var(--bg-hover, #F5F4F1)', border: '1px solid var(--border-color, #E8E4DC)' }}
              >
                <span className="text-[12px] truncate font-mono" style={{ color: 'var(--text-secondary, #5A5650)' }}>
                  {galleryUrl}
                </span>
              </div>
              <button
                onClick={copyLink}
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                style={{
                  background: copiedLink ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover, #F5F4F1)',
                  border: `1px solid ${copiedLink ? 'rgba(16,185,129,0.30)' : 'var(--border-color, #E8E4DC)'}`,
                  color: copiedLink ? '#10B981' : 'var(--text-primary, #111110)',
                }}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* KUNDEN-PASSWORT section */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted, #7A7670)' }}>
              <Lock className="w-3 h-3" />
              Kunden-Passwort
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center px-3 py-2.5 rounded-xl min-w-0"
                style={{ background: 'var(--bg-hover, #F5F4F1)', border: '1px solid var(--border-color, #E8E4DC)' }}
              >
                {galleryPassword ? (
                  <span className="text-[14px] font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary, #111110)' }}>
                    {galleryPassword}
                  </span>
                ) : (
                  <span className="text-[12px] italic" style={{ color: 'var(--text-muted, #7A7670)' }}>
                    Kein Passwort
                  </span>
                )}
              </div>
              {galleryPassword && (
                <button
                  onClick={copyPassword}
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                  style={{
                    background: copiedPassword ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover, #F5F4F1)',
                    border: `1px solid ${copiedPassword ? 'rgba(16,185,129,0.30)' : 'var(--border-color, #E8E4DC)'}`,
                    color: copiedPassword ? '#10B981' : 'var(--text-primary, #111110)',
                  }}
                >
                  {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* GAST-PASSWORT section */}
          {(galleryGuestPassword !== undefined) && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted, #7A7670)' }}>
                <Lock className="w-3 h-3" style={{ opacity: 0.5 }} />
                Gast-Passwort <span className="font-normal normal-case tracking-normal ml-1" style={{ opacity: 0.6 }}>(ohne private Fotos)</span>
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center px-3 py-2.5 rounded-xl min-w-0"
                  style={{ background: 'var(--bg-hover, #F5F4F1)', border: '1px solid var(--border-color, #E8E4DC)' }}
                >
                  {galleryGuestPassword ? (
                    <span className="text-[14px] font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary, #111110)' }}>
                      {galleryGuestPassword}
                    </span>
                  ) : (
                    <span className="text-[12px] italic" style={{ color: 'var(--text-muted, #7A7670)' }}>
                      Kein Gast-Passwort
                    </span>
                  )}
                </div>
                {galleryGuestPassword && (
                  <button
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(galleryGuestPassword) } catch { /* fallback */ }
                      setCopiedGuestPassword(true)
                      setTimeout(() => setCopiedGuestPassword(false), 2000)
                    }}
                    className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                    style={{
                      background: copiedGuestPassword ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover, #F5F4F1)',
                      border: `1px solid ${copiedGuestPassword ? 'rgba(16,185,129,0.30)' : 'var(--border-color, #E8E4DC)'}`,
                      color: copiedGuestPassword ? '#10B981' : 'var(--text-primary, #111110)',
                    }}
                  >
                    {copiedGuestPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PER E-MAIL SENDEN section */}
          <div style={{ borderTop: '1px solid var(--border-color, #E8E4DC)', paddingTop: '16px' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted, #7A7670)' }}>
              <Mail className="w-3 h-3 inline mr-1" />
              Per E-Mail senden
            </p>
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-90"
              style={{
                background: '#C4A47C',
                boxShadow: '0 1px 8px rgba(196,164,124,0.25)',
              }}
            >
              <Send className="w-4 h-4" />
              E-Mail verfassen
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      {mainModal}
      {emailModal}
    </>
  )
}
