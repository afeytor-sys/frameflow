/**
 * Server-side invoice PDF generation (pdf-lib — no headless browser needed,
 * mirrors the pattern used for questionnaire PDFs in
 * src/app/api/questionnaires/[submissionId]/pdf/route.ts).
 *
 * Used to attach the invoice directly to the "invoice sent" email, so the
 * client can pay without having to open the portal.
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'

export interface InvoicePdfItem {
  position: number
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface InvoicePdfSender {
  studio_name?: string | null
  full_name?: string | null
  company_name?: string | null
  address_street?: string | null
  address_zip?: string | null
  address_city?: string | null
  address_country?: string | null
  phone?: string | null
  website?: string | null
  email?: string | null
  tax_number?: string | null
  bank_account_holder?: string | null
  bank_name?: string | null
  bank_iban?: string | null
  bank_bic?: string | null
}

export interface InvoicePdfClient {
  full_name: string
  company_name?: string | null
  address_street?: string | null
  address_zip?: string | null
  address_city?: string | null
  address_country?: string | null
}

export interface InvoicePdfData {
  invoiceNumber: string | null
  createdAt: string
  dueDate: string | null
  description: string | null
  taxStatus: 'kleinunternehmer' | 'vat_19' | 'vat_7' | string
  taxRate: number
  subtotalCents: number
  taxCents: number
  totalCents: number
  items: InvoicePdfItem[]
  sender: InvoicePdfSender
  client: InvoicePdfClient
}

/** Strip characters Helvetica (WinAnsi, 0–255) can't render. */
function safe(text: string): string {
  return text.replace(/[^\x00-\xFF]/g, '?')
}

function splitLines(text: string, maxChars: number): string[] {
  const words = safe(text).split(' ')
  const result: string[] = []
  let current = ''
  for (const word of words) {
    if (current && current.length + word.length + 1 > maxChars) {
      result.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) result.push(current)
  return result.length ? result : ['']
}

function fmtEur(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const W = 595 // A4 width in pt
  const H = 842 // A4 height in pt
  const margin = 50
  const contentW = W - margin * 2

  let page = pdfDoc.addPage([W, H])
  let y = H - margin

  const ensurePage = (neededHeight: number) => {
    if (y - neededHeight < margin + 40) {
      page = pdfDoc.addPage([W, H])
      y = H - margin
    }
  }

  const drawText = (text: string, opts: {
    bold?: boolean; size?: number; color?: [number, number, number]; x?: number
  } = {}) => {
    const f = opts.bold ? boldFont : font
    const size = opts.size ?? 10
    const [r, g, b] = opts.color ?? [0.1, 0.1, 0.1]
    const x = opts.x ?? margin
    ensurePage(size + 6)
    page.drawText(text, { x, y, font: f, size, color: rgb(r, g, b) })
    y -= size + 5
  }

  const drawLine = (color: [number, number, number] = [0.88, 0.88, 0.88]) => {
    ensurePage(16)
    page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: rgb(...color) })
    y -= 14
  }

  // ── Header bar ─────────────────────────────────────────────────────────
  const studioDisplay = data.sender.studio_name || data.sender.full_name || 'Fotograf'
  page.drawRectangle({ x: 0, y: H - 54, width: W, height: 54, color: rgb(0.067, 0.067, 0.063) })
  page.drawText(safe('RECHNUNG'), { x: margin, y: H - 34, font: boldFont, size: 16, color: rgb(0.97, 0.97, 0.96) })
  page.drawText(safe('Fotonizer'), { x: W - margin - 52, y: H - 34, font, size: 10, color: rgb(0.77, 0.65, 0.49) })
  y = H - 54 - 30

  // ── Sender / client address blocks ────────────────────────────────────
  const blockTop = y
  drawText(safe(studioDisplay), { bold: true, size: 13 })
  if (data.sender.company_name && data.sender.company_name !== studioDisplay) drawText(safe(data.sender.company_name), { size: 9, color: [0.42, 0.42, 0.4] })
  if (data.sender.address_street) drawText(safe(data.sender.address_street), { size: 9, color: [0.42, 0.42, 0.4] })
  const senderCity = [data.sender.address_zip, data.sender.address_city].filter(Boolean).join(' ')
  if (senderCity) drawText(safe(senderCity), { size: 9, color: [0.42, 0.42, 0.4] })
  if (data.sender.tax_number) drawText(safe(`Steuernr.: ${data.sender.tax_number}`), { size: 9, color: [0.42, 0.42, 0.4] })
  if (data.sender.email) drawText(safe(data.sender.email), { size: 9, color: [0.42, 0.42, 0.4] })
  const senderBottom = y

  // Client block on the right half, starting from the same top
  y = blockTop
  const rightX = margin + contentW * 0.58
  drawText(safe('Rechnung an'), { size: 8, color: [0.6, 0.58, 0.55], x: rightX })
  if (data.client.company_name) drawText(safe(data.client.company_name), { bold: true, size: 11, x: rightX })
  drawText(safe(data.client.full_name), { bold: !data.client.company_name, size: data.client.company_name ? 9.5 : 11, x: rightX })
  if (data.client.address_street) drawText(safe(data.client.address_street), { size: 9, color: [0.42, 0.42, 0.4], x: rightX })
  const clientCity = [data.client.address_zip, data.client.address_city].filter(Boolean).join(' ')
  if (clientCity) drawText(safe(clientCity), { size: 9, color: [0.42, 0.42, 0.4], x: rightX })

  y = Math.min(senderBottom, y) - 18

  // ── Invoice meta ───────────────────────────────────────────────────────
  drawLine()
  drawText(safe(`Rechnungsnr.: ${data.invoiceNumber || '-'}`), { bold: true, size: 10 })
  drawText(safe(`Rechnungsdatum: ${fmtDate(data.createdAt)}`), { size: 9.5, color: [0.42, 0.42, 0.4] })
  if (data.dueDate) drawText(safe(`Fällig bis: ${fmtDate(data.dueDate)}`), { size: 9.5, color: [0.79, 0.25, 0.19] })
  y -= 6
  drawLine()

  // ── Items table ────────────────────────────────────────────────────────
  const col = { pos: margin, desc: margin + 30, qty: margin + contentW - 150, price: margin + contentW - 100, total: margin + contentW - 50 }
  ensurePage(30)
  page.drawText(safe('POS.'), { x: col.pos, y, font: boldFont, size: 8, color: rgb(0.6, 0.58, 0.55) })
  page.drawText(safe('BESCHREIBUNG'), { x: col.desc, y, font: boldFont, size: 8, color: rgb(0.6, 0.58, 0.55) })
  page.drawText(safe('MENGE'), { x: col.qty, y, font: boldFont, size: 8, color: rgb(0.6, 0.58, 0.55) })
  page.drawText(safe('PREIS'), { x: col.price, y, font: boldFont, size: 8, color: rgb(0.6, 0.58, 0.55) })
  page.drawText(safe('GESAMT'), { x: col.total, y, font: boldFont, size: 8, color: rgb(0.6, 0.58, 0.55) })
  y -= 14
  drawLine()

  const rows: InvoicePdfItem[] = data.items.length > 0
    ? data.items
    : [{ position: 1, description: data.description || 'Fotografieleistungen', quantity: 1, unit_price: data.totalCents, total: data.totalCents }]

  const maxDescChars = Math.floor((col.qty - col.desc) / (9.5 * 0.52))
  for (const it of rows.sort((a, b) => a.position - b.position)) {
    const descLines = splitLines(it.description, maxDescChars)
    const rowTop = y
    page.drawText(String(it.position), { x: col.pos, y, font, size: 9.5, color: rgb(0.15, 0.15, 0.15) })
    descLines.forEach((line, i) => {
      ensurePage(14)
      page.drawText(line, { x: col.desc, y, font, size: 9.5, color: rgb(0.07, 0.07, 0.07) })
      if (i < descLines.length - 1) y -= 13
    })
    page.drawText(String(it.quantity), { x: col.qty, y: rowTop, font, size: 9.5, color: rgb(0.15, 0.15, 0.15) })
    page.drawText(fmtEur(it.unit_price), { x: col.price, y: rowTop, font, size: 9.5, color: rgb(0.15, 0.15, 0.15) })
    page.drawText(fmtEur(it.total), { x: col.total, y: rowTop, font: boldFont, size: 9.5, color: rgb(0.07, 0.07, 0.07) })
    y -= 15
    ensurePage(15)
  }

  y -= 4
  drawLine()

  // ── Totals ─────────────────────────────────────────────────────────────
  const drawTotalRow = (label: string, value: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    ensurePage(16)
    const size = opts.size ?? 10
    const f = opts.bold ? boldFont : font
    const color = opts.color ?? [0.15, 0.15, 0.15]
    page.drawText(safe(label), { x: col.price - 60, y, font: f, size, color: rgb(...color) })
    // Not run through safe() — value is always a fmtEur() result, and
    // stripping non-WinAnsi codepoints there turns "€" into "?".
    page.drawText(value, { x: col.total, y, font: f, size, color: rgb(...color) })
    y -= size + 8
  }

  if (data.taxStatus === 'kleinunternehmer') {
    drawTotalRow('Gesamt', fmtEur(data.totalCents), { bold: true, size: 12, color: [0.77, 0.44, 0.09] })
  } else {
    drawTotalRow('Nettobetrag', fmtEur(data.subtotalCents), { color: [0.42, 0.42, 0.4] })
    drawTotalRow(`MwSt ${data.taxRate}%`, fmtEur(data.taxCents), { color: [0.42, 0.42, 0.4] })
    drawTotalRow('Gesamtbetrag', fmtEur(data.totalCents), { bold: true, size: 12, color: [0.77, 0.44, 0.09] })
  }

  if (data.taxStatus === 'kleinunternehmer') {
    y -= 4
    drawText(safe('Gemäß §19 UStG wird keine Umsatzsteuer berechnet.'), { size: 8.5, color: [0.55, 0.53, 0.5] })
  }

  // ── Bank details ───────────────────────────────────────────────────────
  const hasBank = data.sender.bank_iban || data.sender.bank_account_holder
  if (hasBank) {
    y -= 14
    drawLine()
    drawText(safe('Bankverbindung'), { bold: true, size: 10 })
    if (data.sender.bank_account_holder) drawText(safe(data.sender.bank_account_holder), { size: 9, color: [0.42, 0.42, 0.4] })
    if (data.sender.bank_name) drawText(safe(data.sender.bank_name), { size: 9, color: [0.42, 0.42, 0.4] })
    if (data.sender.bank_iban) drawText(safe(`IBAN: ${data.sender.bank_iban}`), { size: 9, color: [0.42, 0.42, 0.4] })
    if (data.sender.bank_bic) drawText(safe(`BIC: ${data.sender.bank_bic}`), { size: 9, color: [0.42, 0.42, 0.4] })
    if (data.invoiceNumber) drawText(safe(`Verwendungszweck: ${data.invoiceNumber}`), { size: 9, color: [0.42, 0.42, 0.4] })
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const totalPages = pdfDoc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const p: PDFPage = pdfDoc.getPage(i)
    const f: PDFFont = font
    p.drawText(safe(`Erstellt mit Fotonizer · Seite ${i + 1} von ${totalPages}`), {
      x: margin, y: 24, font: f, size: 8, color: rgb(0.7, 0.7, 0.7),
    })
  }

  return pdfDoc.save()
}
