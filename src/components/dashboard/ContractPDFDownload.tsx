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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Decode HTML entities
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
}

// ── Block types for the PDF renderer ─────────────────────────────────────
type BlockType =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; runs: Run[] }
  | { type: 'li'; runs: Run[]; ordered: boolean; index: number }
  | { type: 'spacer' }

type Run = { text: string; bold: boolean }

// Extract inline runs from an HTML element's innerHTML, respecting <strong>/<b>/<em>/<i>
function parseInlineRuns(html: string): Run[] {
  const runs: Run[] = []

  // Replace <br> with newline marker
  const normalized = html
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove contract-variable spans but keep their text
    .replace(/<span[^>]*class="contract-variable"[^>]*>(.*?)<\/span>/gi, '$1')

  // Simple tokenizer: split on <strong>, <b>, <em>, <i> tags
  const parts = normalized.split(/(<\/?(?:strong|b|em|i)[^>]*>)/gi)
  let bold = false

  for (const part of parts) {
    if (/^<(strong|b)/i.test(part)) { bold = true; continue }
    if (/^<\/(strong|b)/i.test(part)) { bold = false; continue }
    if (/^<(em|i)/i.test(part)) { continue } // italic not supported natively, treat as normal
    if (/^<\/(em|i)/i.test(part)) { continue }
    // Strip any remaining tags
    const text = decodeEntities(part.replace(/<[^>]+>/g, ''))
    if (text) runs.push({ text, bold })
  }

  return runs
}

// Parse HTML from TipTap into structured blocks
function parseHtmlToBlocks(html: string): BlockType[] {
  const blocks: BlockType[] = []

  // Normalize: collapse whitespace between tags
  const normalized = html.replace(/>\s+</g, '><').trim()

  // Extract list items with their parent context
  // We process the HTML sequentially using regex
  const tagPattern = /<(\/?)(\w+)([^>]*)>([\s\S]*?)(?=<\/?(?:h[1-6]|p|ul|ol|li|blockquote|div|br)\b|$)/gi

  // Simpler approach: split by block-level tags
  // Replace block tags with markers and process
  let processed = normalized

  // Handle ordered lists
  processed = processed.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let idx = 0
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, liContent: string) => {
      idx++
      return `__OL_LI_${idx}__${liContent}__END_LI__`
    })
  })

  // Handle unordered lists
  processed = processed.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, liContent: string) => {
      return `__UL_LI__${liContent}__END_LI__`
    })
  })

  // Split into block segments
  const blockPattern = /(<h2[^>]*>[\s\S]*?<\/h2>|<h3[^>]*>[\s\S]*?<\/h3>|<p[^>]*>[\s\S]*?<\/p>|__(?:OL_LI_\d+|UL_LI)__[\s\S]*?__END_LI__)/gi
  const segments = processed.split(blockPattern).filter(s => s.trim())

  for (const seg of segments) {
    const trimmed = seg.trim()
    if (!trimmed) continue

    // H2
    const h2Match = trimmed.match(/^<h2[^>]*>([\s\S]*?)<\/h2>$/i)
    if (h2Match) {
      const text = decodeEntities(h2Match[1].replace(/<[^>]+>/g, '').trim())
      if (text) blocks.push({ type: 'h2', text })
      continue
    }

    // H3
    const h3Match = trimmed.match(/^<h3[^>]*>([\s\S]*?)<\/h3>$/i)
    if (h3Match) {
      const text = decodeEntities(h3Match[1].replace(/<[^>]+>/g, '').trim())
      if (text) blocks.push({ type: 'h3', text })
      continue
    }

    // Paragraph
    const pMatch = trimmed.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i)
    if (pMatch) {
      const inner = pMatch[1]
      // Empty paragraph = spacer
      if (!inner.trim() || inner.trim() === '<br>' || inner.trim() === '<br/>') {
        blocks.push({ type: 'spacer' })
      } else {
        const runs = parseInlineRuns(inner)
        if (runs.length > 0) blocks.push({ type: 'p', runs })
      }
      continue
    }

    // Ordered list item
    const olMatch = trimmed.match(/^__OL_LI_(\d+)__([\s\S]*?)__END_LI__$/)
    if (olMatch) {
      const index = parseInt(olMatch[1])
      const runs = parseInlineRuns(olMatch[2])
      blocks.push({ type: 'li', runs, ordered: true, index })
      continue
    }

    // Unordered list item
    const ulMatch = trimmed.match(/^__UL_LI__([\s\S]*?)__END_LI__$/)
    if (ulMatch) {
      const runs = parseInlineRuns(ulMatch[1])
      blocks.push({ type: 'li', runs, ordered: false, index: 0 })
      continue
    }
  }

  return blocks
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

      // ── Ensure new page if needed ─────────────────────────────────────────
      const ensurePage = (needed: number) => {
        if (y < margin + needed) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
      }

      // ── Draw a single line of text with word-wrap ─────────────────────────
      const drawWrappedText = (
        text: string,
        opts: {
          size?: number
          bold?: boolean
          color?: ReturnType<typeof rgb>
          indent?: number
          lineHeight?: number
        } = {}
      ): void => {
        const { size = 10, bold = false, color = colorPrimary, indent = 0, lineHeight } = opts
        const lh = lineHeight ?? size * 1.55
        const usedFont = bold ? fontBold : font
        const maxWidth = contentWidth - indent

        // Handle newlines within text (e.g. from <br>)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.trim() === '') {
            y -= lh * 0.5
            continue
          }
          const words = line.split(' ')
          let currentLine = ''
          for (const word of words) {
            const test = currentLine ? `${currentLine} ${word}` : word
            const w = usedFont.widthOfTextAtSize(test, size)
            if (w > maxWidth && currentLine) {
              ensurePage(lh)
              page.drawText(currentLine, { x: margin + indent, y, size, font: usedFont, color })
              y -= lh
              currentLine = word
            } else {
              currentLine = test
            }
          }
          if (currentLine) {
            ensurePage(lh)
            page.drawText(currentLine, { x: margin + indent, y, size, font: usedFont, color })
            y -= lh
          }
        }
      }

      // ── Draw mixed bold/normal runs with word-wrap ────────────────────────
      const drawRuns = (
        runs: Run[],
        opts: { size?: number; color?: ReturnType<typeof rgb>; indent?: number; lineHeight?: number } = {}
      ): void => {
        const { size = 10, color = colorPrimary, indent = 0, lineHeight } = opts
        const lh = lineHeight ?? size * 1.55
        const maxWidth = contentWidth - indent

        // Flatten runs into words with bold flag
        type Word = { text: string; bold: boolean }
        const words: Word[] = []
        for (const run of runs) {
          // Split by newlines first
          const parts = run.text.split('\n')
          for (let pi = 0; pi < parts.length; pi++) {
            const part = parts[pi]
            if (part) {
              const ws = part.split(' ')
              for (const w of ws) {
                if (w) words.push({ text: w, bold: run.bold })
              }
            }
            // Newline between parts (except last)
            if (pi < parts.length - 1) {
              words.push({ text: '\n', bold: false })
            }
          }
        }

        // Build lines respecting max width
        type LineWord = { text: string; bold: boolean }
        let currentLineWords: LineWord[] = []
        let currentLineWidth = 0

        const flushLine = () => {
          if (currentLineWords.length === 0) return
          ensurePage(lh)
          let xPos = margin + indent
          for (const lw of currentLineWords) {
            const usedFont = lw.bold ? fontBold : font
            page.drawText(lw.text, { x: xPos, y, size, font: usedFont, color })
            xPos += usedFont.widthOfTextAtSize(lw.text + ' ', size)
          }
          y -= lh
          currentLineWords = []
          currentLineWidth = 0
        }

        for (let wi = 0; wi < words.length; wi++) {
          const word = words[wi]

          // Newline marker
          if (word.text === '\n') {
            flushLine()
            y -= lh * 0.3
            continue
          }

          const usedFont = word.bold ? fontBold : font
          const wordWidth = usedFont.widthOfTextAtSize(word.text + ' ', size)
          const spaceWidth = font.widthOfTextAtSize(' ', size)

          if (currentLineWidth + wordWidth > maxWidth && currentLineWords.length > 0) {
            flushLine()
          }

          currentLineWords.push(word)
          currentLineWidth += wordWidth + (currentLineWords.length > 1 ? spaceWidth : 0)
        }
        flushLine()
      }

      const drawLine = (opacity = 1) => {
        ensurePage(20)
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
      page.drawRectangle({ x: 0, y: pageHeight - 6, width: pageWidth, height: 6, color: colorAccent })

      y -= 8
      drawWrappedText(title, { size: 22, bold: true, color: colorPrimary })
      y -= 4
      drawWrappedText(`Erstellt am: ${formatDate(createdAt)}`, { size: 9, color: colorMuted })
      y -= 8
      drawLine()
      y -= 4

      // ── Contract content (HTML-aware) ─────────────────────────────────────
      const blocks = parseHtmlToBlocks(content || '')

      for (const block of blocks) {
        switch (block.type) {
          case 'h2':
            y -= 6
            ensurePage(28)
            drawWrappedText(block.text, { size: 14, bold: true, color: colorPrimary, lineHeight: 20 })
            y -= 4
            break

          case 'h3':
            y -= 4
            ensurePage(22)
            drawWrappedText(block.text, { size: 11.5, bold: true, color: colorPrimary, lineHeight: 17 })
            y -= 2
            break

          case 'p':
            ensurePage(16)
            drawRuns(block.runs, { size: 10, color: colorPrimary, lineHeight: 16 })
            y -= 4
            break

          case 'li': {
            ensurePage(16)
            const bullet = block.ordered ? `${block.index}.` : '•'
            const bulletWidth = font.widthOfTextAtSize(bullet + '  ', 10)
            // Draw bullet
            page.drawText(bullet, { x: margin + 4, y, size: 10, font: block.ordered ? fontBold : font, color: colorPrimary })
            // Draw content indented
            const savedY = y
            drawRuns(block.runs, { size: 10, color: colorPrimary, indent: bulletWidth + 4, lineHeight: 16 })
            // If drawRuns didn't move y (empty), restore
            if (y === savedY) y -= 16
            y -= 2
            break
          }

          case 'spacer':
            y -= 8
            break
        }
      }

      y -= 16

      // ── Signatures section ────────────────────────────────────────────────
      if (y < margin + 200) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }

      drawLine()
      y -= 4
      drawWrappedText('Unterschriften', { size: 13, bold: true, color: colorPrimary })
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

      const labelY = sigBoxY + sigBoxHeight - 16
      page.drawText('Fotograf', { x: margin + 10, y: labelY, size: 8, font: fontBold, color: colorMuted })
      page.drawText('Kunde', { x: margin + sigBoxWidth + 34, y: labelY, size: 8, font: fontBold, color: colorMuted })

      if (photographerSignatureData) {
        try {
          const base64 = photographerSignatureData.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const img = await pdfDoc.embedPng(imgBytes)
          const imgDims = img.scaleToFit(sigBoxWidth - 20, 60)
          page.drawImage(img, { x: margin + 10, y: sigBoxY + 30, width: imgDims.width, height: imgDims.height })
        } catch { /* skip */ }
      }

      if (clientSignatureData) {
        try {
          const base64 = clientSignatureData.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const img = await pdfDoc.embedPng(imgBytes)
          const imgDims = img.scaleToFit(sigBoxWidth - 20, 60)
          page.drawImage(img, { x: margin + sigBoxWidth + 34, y: sigBoxY + 30, width: imgDims.width, height: imgDims.height })
        } catch { /* skip */ }
      }

      const nameY = sigBoxY - 14
      if (photographerName) {
        page.drawText(photographerName, { x: margin + 10, y: nameY, size: 9, font: fontBold, color: colorPrimary })
      }
      if (photographerSignedAt) {
        page.drawText(formatDate(photographerSignedAt), { x: margin + 10, y: nameY - 13, size: 8, font, color: colorMuted })
      }
      if (clientName) {
        page.drawText(clientName, { x: margin + sigBoxWidth + 34, y: nameY, size: 9, font: fontBold, color: colorPrimary })
      }
      if (clientSignedAt) {
        page.drawText(formatDate(clientSignedAt), { x: margin + sigBoxWidth + 34, y: nameY - 13, size: 8, font, color: colorMuted })
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const pages = pdfDoc.getPages()
      pages.forEach((p, idx) => {
        p.drawText(`Seite ${idx + 1} von ${pages.length}`, { x: margin, y: 24, size: 8, font, color: colorMuted })
        p.drawText('Erstellt mit Frameflow', { x: pageWidth - margin - 100, y: 24, size: 8, font, color: colorMuted })
      })

      // ── Save & download ───────────────────────────────────────────────────
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9\s]/g, '').trim()}.pdf`
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
