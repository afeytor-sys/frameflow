'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface ContractPDFProps {
  title: string
  content: string
  createdAt: string
  // Client signature
  clientName?: string | null
  clientSignedAt?: string | null
  clientSignatureData?: string | null
  // Photographer signature
  photographerName?: string | null
  photographerSignedAt?: string | null
  photographerSignatureData?: string | null
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ContractPDFDownload({
  title,
  content,
  createdAt,
  clientName,
  clientSignedAt,
  clientSignatureData,
  photographerName,
  photographerSignedAt,
  photographerSignatureData,
}: ContractPDFProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      // Dynamically import pdf-lib to avoid SSR issues
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')

      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const pageWidth = 595   // A4
      const pageHeight = 842
      const margin = 56
      const contentWidth = pageWidth - margin * 2

      let page = pdfDoc.addPage([pageWidth, pageHeight])
      let y = pageHeight - margin

      const colorPrimary = rgb(0.08, 0.08, 0.10)
      const colorMuted = rgb(0.45, 0.45, 0.50)
      const colorAccent = rgb(0.77, 0.64, 0.49)   // #C4A47C
      const colorLine = rgb(0.88, 0.88, 0.90)

      // ── Helper: draw text with word-wrap ──────────────────────────────────
      const drawText = (
        text: string,
        opts: {
          size?: number
          bold?: boolean
          color?: ReturnType<typeof rgb>
          indent?: number
          lineHeight?: number
        } = {}
      ): void => {
        const {
          size = 10,
          bold = false,
          color = colorPrimary,
          indent = 0,
          lineHeight,
        } = opts
        const lh = lineHeight ?? size * 1.55
        const usedFont = bold ? fontBold : font
        const maxWidth = contentWidth - indent

        const paragraphs = text.split('\n')
        for (const para of paragraphs) {
          if (para.trim() === '') {
            y -= lh * 0.6
            continue
          }
          // Word-wrap
          const words = para.split(' ')
          let line = ''
          for (const word of words) {
            const test = line ? `${line} ${word}` : word
            const w = usedFont.widthOfTextAtSize(test, size)
            if (w > maxWidth && line) {
              if (y < margin + lh) {
                page = pdfDoc.addPage([pageWidth, pageHeight])
                y = pageHeight - margin
              }
              page.drawText(line, { x: margin + indent, y, size, font: usedFont, color })
              y -= lh
              line = word
            } else {
              line = test
            }
          }
          if (line) {
            if (y < margin + lh) {
              page = pdfDoc.addPage([pageWidth, pageHeight])
              y = pageHeight - margin
            }
            page.drawText(line, { x: margin + indent, y, size, font: usedFont, color })
            y -= lh
          }
        }
      }

      const drawLine = (opacity = 1) => {
        if (y < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
        page.drawLine({
          start: { x: margin, y },
          end: { x: pageWidth - margin, y },
          thickness: 0.5,
          color: colorLine,
          opacity,
        })
        y -= 12
      }

      // ── Header ────────────────────────────────────────────────────────────
      // Accent bar at top
      page.drawRectangle({ x: 0, y: pageHeight - 6, width: pageWidth, height: 6, color: colorAccent })

      y -= 8
      drawText(title, { size: 22, bold: true, color: colorPrimary })
      y -= 4
      drawText(`Erstellt am: ${formatDate(createdAt)}`, { size: 9, color: colorMuted })
      y -= 8
      drawLine()
      y -= 4

      // ── Contract content ──────────────────────────────────────────────────
      const plainText = stripHtml(content || '')
      if (plainText) {
        drawText(plainText, { size: 10, color: colorPrimary, lineHeight: 16 })
        y -= 16
      }

      // ── Signatures section ────────────────────────────────────────────────
      // Make sure there's enough space for signatures (at least 200px)
      if (y < margin + 200) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }

      drawLine()
      y -= 4
      drawText('Unterschriften', { size: 13, bold: true, color: colorPrimary })
      y -= 12

      const sigBoxWidth = (contentWidth - 24) / 2
      const sigBoxHeight = 110
      const sigBoxY = y - sigBoxHeight

      // Left box: Fotograf
      page.drawRectangle({
        x: margin, y: sigBoxY,
        width: sigBoxWidth, height: sigBoxHeight,
        borderColor: colorLine, borderWidth: 1,
        color: rgb(0.98, 0.98, 0.99),
      })

      // Right box: Kunde
      page.drawRectangle({
        x: margin + sigBoxWidth + 24, y: sigBoxY,
        width: sigBoxWidth, height: sigBoxHeight,
        borderColor: colorLine, borderWidth: 1,
        color: rgb(0.98, 0.98, 0.99),
      })

      // Labels inside boxes
      const labelY = sigBoxY + sigBoxHeight - 16
      page.drawText('Fotograf', {
        x: margin + 10, y: labelY,
        size: 8, font: fontBold, color: colorMuted,
      })
      page.drawText('Kunde', {
        x: margin + sigBoxWidth + 34, y: labelY,
        size: 8, font: fontBold, color: colorMuted,
      })

      // Embed photographer signature image
      if (photographerSignatureData) {
        try {
          const base64 = photographerSignatureData.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const img = await pdfDoc.embedPng(imgBytes)
          const imgDims = img.scaleToFit(sigBoxWidth - 20, 60)
          page.drawImage(img, {
            x: margin + 10,
            y: sigBoxY + 30,
            width: imgDims.width,
            height: imgDims.height,
          })
        } catch { /* skip if image fails */ }
      }

      // Embed client signature image
      if (clientSignatureData) {
        try {
          const base64 = clientSignatureData.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const img = await pdfDoc.embedPng(imgBytes)
          const imgDims = img.scaleToFit(sigBoxWidth - 20, 60)
          page.drawImage(img, {
            x: margin + sigBoxWidth + 34,
            y: sigBoxY + 30,
            width: imgDims.width,
            height: imgDims.height,
          })
        } catch { /* skip if image fails */ }
      }

      // Names + dates below boxes
      const nameY = sigBoxY - 14
      if (photographerName) {
        page.drawText(photographerName, {
          x: margin + 10, y: nameY,
          size: 9, font: fontBold, color: colorPrimary,
        })
      }
      if (photographerSignedAt) {
        page.drawText(formatDate(photographerSignedAt), {
          x: margin + 10, y: nameY - 13,
          size: 8, font, color: colorMuted,
        })
      }
      if (clientName) {
        page.drawText(clientName, {
          x: margin + sigBoxWidth + 34, y: nameY,
          size: 9, font: fontBold, color: colorPrimary,
        })
      }
      if (clientSignedAt) {
        page.drawText(formatDate(clientSignedAt), {
          x: margin + sigBoxWidth + 34, y: nameY - 13,
          size: 8, font, color: colorMuted,
        })
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const pages = pdfDoc.getPages()
      pages.forEach((p, idx) => {
        p.drawText(`Seite ${idx + 1} von ${pages.length}`, {
          x: margin, y: 24,
          size: 8, font, color: colorMuted,
        })
        p.drawText('Erstellt mit Frameflow', {
          x: pageWidth - margin - 100, y: 24,
          size: 8, font, color: colorMuted,
        })
      })

      // ── Save & download ───────────────────────────────────────────────────
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '').trim()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF heruntergeladen!')
    } catch (err) {
      console.error(err)
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      style={{ background: '#3DBA6F', color: '#fff' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : <Download className="w-3.5 h-3.5" />
      }
      {loading ? 'Erstelle PDF...' : 'PDF herunterladen'}
    </button>
  )
}
