'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Share2, Copy, Check, X } from 'lucide-react'

interface Props {
  galleryUrl: string
  galleryPassword: string | null
}

export default function GalleryShareButton({ galleryUrl, galleryPassword }: Props) {
  const [open, setOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleCopyLink = async () => {
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

  const handleCopyAll = async () => {
    const text = `${galleryUrl}\n\nPassword: ${galleryPassword}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const modal = open && mounted ? createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <Share2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Galerie teilen</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Für Gäste & Familie</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {/* Gallery link */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
            <div className="px-3.5 pt-3 pb-2 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                🔗 Link da galeria
              </p>
              <p className="text-[13px] font-medium break-all" style={{ color: 'var(--text-primary)' }}>
                {galleryUrl}
              </p>
            </div>
            {/* Copy link button inline */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold transition-all"
              style={{
                background: copiedLink ? 'rgba(42,155,104,0.12)' : 'var(--bg-hover)',
                color: copiedLink ? '#2A9B68' : 'var(--text-primary)',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              {copiedLink ? (
                <><Check className="w-3.5 h-3.5" />Link kopiert!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Link kopieren</>
              )}
            </button>
          </div>

          {/* Gallery password (if set) */}
          {galleryPassword && (
            <>
              <div className="rounded-xl p-3.5 space-y-1" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  🔑 Password
                </p>
                <p className="text-[15px] font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
                  {galleryPassword}
                </p>
              </div>

              {/* Copy link + password together */}
              <button
                onClick={handleCopyAll}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all"
                style={{ background: copiedAll ? '#2A9B68' : 'var(--text-primary)' }}
              >
                {copiedAll ? (
                  <><Check className="w-4 h-4" />Kopiert!</>
                ) : (
                  <><Copy className="w-4 h-4" />Link + Password kopieren</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
        style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}
      >
        <Share2 className="w-3.5 h-3.5" />
        Teilen
      </button>
      {modal}
    </>
  )
}
