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

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Dein Studioflow Portal: ${fullUrl}`)}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#4B5563] hover:bg-[#F1F1EF] hover:text-[#111827] transition-all text-[13px] font-medium"
      >
        <QrCode className="w-3.5 h-3.5" />
        QR Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-[#111827] text-[15px]">QR Code</h3>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5">{projectTitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F1F1EF] text-[#9CA3AF] hover:text-[#111827] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code */}
            <div ref={svgRef} className="flex items-center justify-center p-6 bg-[#F7F7F5] rounded-xl mb-5">
              <QRCodeSVG
                value={fullUrl}
                size={180}
                bgColor="#F7F7F5"
                fgColor="#111827"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* URL */}
            <div className="flex items-center gap-2 p-3 bg-[#F7F7F5] rounded-xl mb-4">
              <p className="flex-1 text-[11px] font-mono text-[#4B5563] truncate">{fullUrl}</p>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 text-[11px] font-medium text-[#4B5563] hover:text-[#111827] transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2A9B68]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadQR}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111827] text-white rounded-xl text-[13px] font-semibold hover:opacity-85 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" />
                PNG laden
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E5E7EB] text-[#111827] rounded-xl text-[13px] font-semibold hover:bg-[#F1F1EF] transition-colors"
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
