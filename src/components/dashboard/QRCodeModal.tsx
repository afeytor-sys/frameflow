'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Download, Copy, Check, QrCode } from 'lucide-react'

interface Props {
  clientUrl: string
  projectTitle: string
}

export default function QRCodeModal({ clientUrl, projectTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const svgRef = useRef<HTMLDivElement>(null)

  const fullUrl = clientUrl.startsWith('http')
    ? clientUrl
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${clientUrl}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement('a')
      a.download = `qr-${projectTitle.toLowerCase().replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Dein Fotonizer Portal: ${fullUrl}`)}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
        style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <QrCode className="w-3.5 h-3.5" />
        QR Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>QR Code</h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{projectTitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code — always white background for readability */}
            <div ref={svgRef} className="flex items-center justify-center p-6 rounded-xl mb-5" style={{ background: '#FFFFFF' }}>
              <QRCodeSVG
                value={fullUrl}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#111827"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* URL */}
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'var(--bg-hover)' }}>
              <p className="flex-1 text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{fullUrl}</p>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 text-[11px] font-medium transition-colors flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#2A9B68' }} /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadQR}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
                style={{ background: 'var(--text-primary)' }}
              >
                <Download className="w-3.5 h-3.5" />
                PNG laden
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="text-[15px]">💬</span>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
