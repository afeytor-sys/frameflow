'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText, Send, CheckCircle2, Clock, AlertCircle, MoreHorizontal, Trash2, X, Percent, FolderPlus, UserPlus, Eye, Printer, Mail, GripVertical, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import EmailVorlagePicker from '@/components/dashboard/EmailVorlagePicker'
import { useLocale } from '@/hooks/useLocale'
import { dashboardT } from '@/lib/dashboardTranslations'
import { formatCompact } from '@/lib/utils'

interface InvoiceLineItem {
  id?: string
  position: number
  description: string
  quantity: number      // e.g. 1, 2.5
  unit_price: number    // euros (not cents) — only in form state
  total: number         // euros — auto-calculated
}

interface InvoiceSnapshot {
  studio_name: string | null
  full_name: string | null
  company_name: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
  phone: string | null
  website: string | null
  email: string | null
  tax_number: string | null
  bank_account_holder: string | null
  bank_name: string | null
  bank_iban: string | null
  bank_bic: string | null
}

interface ClientSnapshot {
  full_name: string
  company_name: string | null
  email: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
}

interface Invoice {
  id: string
  project_id: string
  photographer_id: string
  amount: number          // gross total in cents
  subtotal: number        // net subtotal in cents
  tax_amount: number      // tax in cents
  tax_rate: number        // 0 | 7 | 19
  tax_status: 'kleinunternehmer' | 'vat_19' | 'vat_7'
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  due_date: string | null
  description: string | null
  notes: string | null
  invoice_number: string | null
  verwendungszweck: string | null
  stripe_invoice_id: string | null
  sent_at?: string | null
  created_at: string
  photographer_snapshot: InvoiceSnapshot | null
  client_snapshot: ClientSnapshot | null
  items?: { position: number; description: string; quantity: number; unit_price: number; total: number }[]
  project?: {
    title: string
    client?: { full_name: string; email?: string; company_name?: string | null; address_street?: string | null; address_zip?: string | null; address_city?: string | null } | { full_name: string; email?: string; company_name?: string | null }[]
  }
}

interface Project {
  id: string
  title: string
  client?: { full_name: string } | { full_name: string }[]
}

interface Client {
  id: string
  full_name: string
  email: string | null
}

interface Photographer {
  id: string
  plan: string | null
  full_name: string | null
  studio_name: string | null
  email: string | null
  company_name: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
  phone: string | null
  website: string | null
  tax_number: string | null
  tax_status: 'kleinunternehmer' | 'vat_19' | 'vat_7' | null
  bank_account_holder: string | null
  bank_name: string | null
  bank_iban: string | null
  bank_bic: string | null
}

interface Props {
  invoices: Invoice[]
  projects: Project[]
  photographerId: string
  photographer: Photographer | null
}

const STATUS_CONFIG = {
  draft:   { label: 'Not sent', color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: FileText },
  sent:    { label: 'Sent',   color: '#CC8415', bg: 'rgba(204,132,21,0.10)',  icon: Send },
  paid:    { label: 'Paid',    color: '#2A9B68', bg: 'rgba(42,155,104,0.10)', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: '#C43B2C', bg: 'rgba(196,59,44,0.10)',  icon: AlertCircle },
}

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function getClientName(project?: Invoice['project']): string {
  if (!project) return '—'
  const c = project.client
  if (!c) return project.title
  if (Array.isArray(c)) return c[0]?.full_name || project.title
  return c.full_name || project.title
}

function getClientEmail(project?: Invoice['project']): string | null {
  if (!project) return null
  const c = project.client
  if (!c) return null
  if (Array.isArray(c)) return c[0]?.email || null
  return c.email || null
}

const MWST_RATE = 0.19

// ── Format helpers ─────────────────────────────────────────────────────────
function fmtEurText(euros: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(euros)
}
function fmtCentsText(cents: number) { return fmtEurText(cents / 100) }

// ── EPC GiroCode QR URL (SEPA Credit Transfer) ────────────────────────────
function buildEpcQrUrl(invoice: Invoice, photographer: Photographer | null): string | null {
  const snap = invoice.photographer_snapshot
  const iban = (snap?.bank_iban ?? photographer?.bank_iban)?.replace(/\s/g, '')
  if (!iban) return null
  const name = (
    snap?.bank_account_holder ?? photographer?.bank_account_holder ??
    snap?.studio_name ?? photographer?.studio_name ??
    snap?.full_name ?? photographer?.full_name ?? ''
  ).slice(0, 70)
  const bic = snap?.bank_bic ?? photographer?.bank_bic ?? ''
  const amount = (invoice.amount / 100).toFixed(2)
  const ref = (invoice.verwendungszweck || invoice.invoice_number || '').slice(0, 140)
  const epc = ['BCD', '002', '1', 'SCT', bic, name, iban, `EUR${amount}`, '', '', ref].join('\n')
  return `https://api.qrserver.com/v1/create-qr-code/?size=132x132&ecc=M&data=${encodeURIComponent(epc)}`
}

// ── Build A4 HTML invoice ──────────────────────────────────────────────────
function buildInvoiceHtml(invoice: Invoice, photographer: Photographer | null, autoPrint = false): string {
  // Use snapshot if available, fall back to current photographer
  const snap = invoice.photographer_snapshot
  const csnap = invoice.client_snapshot
  const ph = {
    studio_name: snap?.studio_name ?? photographer?.studio_name,
    full_name: snap?.full_name ?? photographer?.full_name,
    company_name: snap?.company_name ?? photographer?.company_name,
    address_street: snap?.address_street ?? photographer?.address_street,
    address_zip: snap?.address_zip ?? photographer?.address_zip,
    address_city: snap?.address_city ?? photographer?.address_city,
    address_country: snap?.address_country ?? photographer?.address_country,
    phone: snap?.phone ?? photographer?.phone,
    website: snap?.website ?? photographer?.website,
    email: snap?.email ?? photographer?.email,
    tax_number: snap?.tax_number ?? photographer?.tax_number,
    bank_account_holder: snap?.bank_account_holder ?? photographer?.bank_account_holder,
    bank_name: snap?.bank_name ?? photographer?.bank_name,
    bank_iban: snap?.bank_iban ?? photographer?.bank_iban,
    bank_bic: snap?.bank_bic ?? photographer?.bank_bic,
  }

  const client = {
    full_name: csnap?.full_name ?? getClientName(invoice.project),
    company_name: csnap?.company_name ?? null,
    email: csnap?.email ?? getClientEmail(invoice.project),
    address_street: csnap?.address_street ?? null,
    address_zip: csnap?.address_zip ?? null,
    address_city: csnap?.address_city ?? null,
    address_country: csnap?.address_country ?? null,
  }

  const taxStatus = invoice.tax_status || photographer?.tax_status || 'kleinunternehmer'
  const taxRate = invoice.tax_rate || 0
  const subtotalCents = invoice.subtotal || invoice.amount
  const taxCents = invoice.tax_amount || 0
  const totalCents = invoice.amount
  const hasItems = invoice.items && invoice.items.length > 0
  const hasBankDetails = ph.bank_iban || ph.bank_account_holder
  const qrUrl = buildEpcQrUrl(invoice, photographer)
  const invoiceDate = new Date(invoice.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : null
  const studioDisplay = ph.studio_name || ph.full_name || 'Fotograf'

  const itemsHtml = hasItems
    ? invoice.items!.map(it => `
      <tr>
        <td style="padding:10px 14px;font-size:13px;border-top:1px solid #E8E8E4;color:#3A3A3A;">${it.position}</td>
        <td style="padding:10px 14px;font-size:13px;border-top:1px solid #E8E8E4;color:#1A1A1A;">${it.description}</td>
        <td style="padding:10px 14px;font-size:13px;border-top:1px solid #E8E8E4;text-align:right;color:#3A3A3A;">${it.quantity}</td>
        <td style="padding:10px 14px;font-size:13px;border-top:1px solid #E8E8E4;text-align:right;color:#3A3A3A;">${fmtCentsText(it.unit_price)}</td>
        <td style="padding:10px 14px;font-size:13px;border-top:1px solid #E8E8E4;text-align:right;font-weight:700;color:#1A1A1A;">${fmtCentsText(it.total)}</td>
      </tr>`).join('')
    : `<tr>
        <td colspan="5" style="padding:14px 14px;font-size:13px;border-top:1px solid #E8E8E4;color:#1A1A1A;">${invoice.description || invoice.project?.title || 'Fotografieleistungen'}</td>
      </tr>`

  const taxRowsHtml = taxStatus === 'kleinunternehmer'
    ? `<tr>
        <td colspan="4" style="padding:8px 14px;font-size:12px;font-weight:700;text-align:right;color:#6B6B6B;">Gesamt (netto)</td>
        <td style="padding:8px 14px;font-size:13px;font-weight:700;text-align:right;color:#1A1A1A;">${fmtCentsText(totalCents)}</td>
      </tr>`
    : `<tr>
        <td colspan="4" style="padding:8px 14px;font-size:12px;text-align:right;color:#6B6B6B;">Nettobetrag</td>
        <td style="padding:8px 14px;font-size:13px;text-align:right;color:#1A1A1A;">${fmtCentsText(subtotalCents)}</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:8px 14px;font-size:12px;text-align:right;color:#6B6B6B;">MwSt ${taxRate}%</td>
        <td style="padding:8px 14px;font-size:13px;text-align:right;color:#1A1A1A;">${fmtCentsText(taxCents)}</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:10px 14px;font-size:13px;font-weight:900;text-align:right;color:#1A1A1A;border-top:2px solid #E8E8E4;">Gesamtbetrag</td>
        <td style="padding:10px 14px;font-size:16px;font-weight:900;text-align:right;color:#F97316;border-top:2px solid #E8E8E4;">${fmtCentsText(totalCents)}</td>
      </tr>`

  const kleinunternehmerText = taxStatus === 'kleinunternehmer'
    ? `<p style="font-size:11px;color:#6B6B6B;margin-top:14px;line-height:1.6;">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Rechnung ${invoice.invoice_number || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif; color: #1A1A1A; background: #fff; }
    .page { max-width: 794px; margin: 0 auto; padding: 52px 56px; }
    @media print {
      body { background: #fff; }
      .page { padding: 28mm 24mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Top: sender + invoice meta -->
  <table style="width:100%;margin-bottom:32px;">
    <tr>
      <td style="vertical-align:top;width:55%;">
        <div style="font-size:20px;font-weight:900;letter-spacing:-0.03em;color:#1A1A1A;margin-bottom:2px;">${studioDisplay}</div>
        ${ph.company_name && ph.company_name !== studioDisplay ? `<div style="font-size:12px;color:#6B6B6B;">${ph.company_name}</div>` : ''}
        ${ph.full_name && ph.full_name !== studioDisplay ? `<div style="font-size:12px;color:#6B6B6B;">${ph.full_name}</div>` : ''}
        <div style="height:8px;"></div>
        ${ph.address_street ? `<div style="font-size:12px;color:#6B6B6B;">${ph.address_street}</div>` : ''}
        ${(ph.address_zip || ph.address_city) ? `<div style="font-size:12px;color:#6B6B6B;">${[ph.address_zip, ph.address_city].filter(Boolean).join(' ')}</div>` : ''}
        ${ph.address_country ? `<div style="font-size:12px;color:#6B6B6B;">${ph.address_country}</div>` : ''}
        <div style="height:6px;"></div>
        ${ph.phone ? `<div style="font-size:12px;color:#6B6B6B;">Tel: ${ph.phone}</div>` : ''}
        ${ph.email ? `<div style="font-size:12px;color:#6B6B6B;">${ph.email}</div>` : ''}
        ${ph.website ? `<div style="font-size:12px;color:#6B6B6B;">${ph.website}</div>` : ''}
        ${ph.tax_number ? `<div style="font-size:11px;color:#9B9B9B;margin-top:6px;">Steuernr.: ${ph.tax_number}</div>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#F97316;margin-bottom:6px;">RECHNUNG</div>
        <div style="font-family:monospace;font-size:17px;font-weight:900;color:#1A1A1A;">${invoice.invoice_number || '—'}</div>
        <div style="font-size:12px;color:#6B6B6B;margin-top:4px;">Datum: ${invoiceDate}</div>
        ${dueDate ? `<div style="font-size:12px;color:#6B6B6B;margin-top:2px;">Fällig: ${dueDate}</div>` : ''}
      </td>
    </tr>
  </table>

  <!-- Divider -->
  <div style="height:2px;background:linear-gradient(90deg,#F97316,#E8E8E4);margin-bottom:28px;border-radius:1px;"></div>

  <!-- Bill to -->
  <div style="margin-bottom:28px;">
    <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#9B9B9B;margin-bottom:8px;">Rechnungsempfänger</div>
    ${client.company_name ? `<div style="font-size:14px;font-weight:700;color:#1A1A1A;">${client.company_name}</div>` : ''}
    <div style="font-size:14px;font-weight:${client.company_name ? '400' : '700'};color:#1A1A1A;">${client.full_name}</div>
    ${client.address_street ? `<div style="font-size:12px;color:#6B6B6B;margin-top:2px;">${client.address_street}</div>` : ''}
    ${(client.address_zip || client.address_city) ? `<div style="font-size:12px;color:#6B6B6B;">${[client.address_zip, client.address_city].filter(Boolean).join(' ')}</div>` : ''}
    ${client.address_country ? `<div style="font-size:12px;color:#6B6B6B;">${client.address_country}</div>` : ''}
    ${client.email ? `<div style="font-size:12px;color:#6B6B6B;margin-top:2px;">${client.email}</div>` : ''}
  </div>

  <!-- Items table -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #E8E8E4;border-radius:10px;overflow:hidden;margin-bottom:0;">
    <thead>
      <tr style="background:#F8F8F6;">
        <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9B9B9B;text-align:left;width:6%;">Pos.</th>
        <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9B9B9B;text-align:left;">Beschreibung</th>
        <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9B9B9B;text-align:right;width:10%;">Menge</th>
        <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9B9B9B;text-align:right;width:16%;">Einzelpreis</th>
        <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9B9B9B;text-align:right;width:16%;">Gesamt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
    <tfoot style="background:#F8F8F6;">
      ${taxRowsHtml}
    </tfoot>
  </table>

  ${kleinunternehmerText}

  <!-- Notes -->
  ${invoice.notes ? `
  <div style="margin-top:20px;">
    <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#9B9B9B;margin-bottom:6px;">Anmerkungen</div>
    <p style="font-size:12.5px;color:#4A4A4A;line-height:1.65;white-space:pre-wrap;">${invoice.notes}</p>
  </div>` : ''}

  <!-- Bank details -->
  ${hasBankDetails ? `
  <div style="margin-top:28px;padding:18px 20px;background:#F8F8F6;border:1px solid #E8E8E4;border-radius:12px;">
    <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#9B9B9B;margin-bottom:12px;">Bankverbindung — Bitte überweisen Sie den Betrag auf folgendes Konto</div>
    <div style="display:flex;align-items:flex-start;gap:20px;">
      <div style="flex:1;">
        <table style="width:100%;">
          <tr>
            ${ph.bank_account_holder ? `<td style="padding-right:32px;padding-bottom:8px;"><div style="font-size:9.5px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.08em;">Kontoinhaber</div><div style="font-size:13px;font-weight:700;margin-top:2px;">${ph.bank_account_holder}</div></td>` : ''}
            ${ph.bank_name ? `<td style="padding-right:32px;padding-bottom:8px;"><div style="font-size:9.5px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.08em;">Bank</div><div style="font-size:13px;font-weight:700;margin-top:2px;">${ph.bank_name}</div></td>` : ''}
          </tr>
          <tr>
            ${ph.bank_iban ? `<td style="padding-right:32px;"><div style="font-size:9.5px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.08em;">IBAN</div><div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:2px;">${ph.bank_iban}</div></td>` : ''}
            ${ph.bank_bic ? `<td><div style="font-size:9.5px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.08em;">BIC / SWIFT</div><div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:2px;">${ph.bank_bic}</div></td>` : ''}
          </tr>
        </table>
        ${(invoice.verwendungszweck || invoice.invoice_number) ? `<div style="margin-top:10px;font-size:11px;color:#6B6B6B;">Verwendungszweck: <strong style="color:#1A1A1A;">${invoice.verwendungszweck || invoice.invoice_number}</strong></div>` : ''}
      </div>
      ${qrUrl ? `
      <div style="flex-shrink:0;text-align:center;">
        <img src="${qrUrl}" width="110" height="110" style="border-radius:8px;display:block;" alt="GiroCode" />
        <div style="font-size:8.5px;color:#9B9B9B;margin-top:5px;letter-spacing:0.06em;text-transform:uppercase;">GiroCode scannen</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="margin-top:36px;padding-top:16px;border-top:1px solid #E8E8E4;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:11px;color:#9B9B9B;">${studioDisplay}</span>
    <span style="font-size:11px;color:#9B9B9B;">Danke für Ihr Vertrauen!</span>
    <span style="font-size:11px;color:#9B9B9B;">${invoice.invoice_number || ''}</span>
  </div>

</div>
${autoPrint ? '<script>window.onload=function(){window.print()}</script>' : ''}
</body>
</html>`
}

// ── Print invoice in a new window ─────────────────────────────────────────
function printInvoiceWindow(invoice: Invoice, photographer: Photographer | null) {
  const html = buildInvoiceHtml(invoice, photographer, true)
  const win = window.open('', '_blank', 'width=900,height=750')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ── Invoice Preview Modal ──────────────────────────────────────────────────
function InvoicePreviewModal({
  invoice,
  photographer,
  onClose,
  autoPrint,
}: {
  invoice: Invoice
  photographer: Photographer | null
  onClose: () => void
  autoPrint: boolean
}) {
  // Auto-trigger print in new window after mount
  if (typeof window !== 'undefined' && autoPrint) {
    setTimeout(() => printInvoiceWindow(invoice, photographer), 200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in"
        style={{ background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto' }}
      >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E4]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.10)' }}>
                <FileText className="w-4 h-4" style={{ color: '#F97316' }} />
              </div>
              <span className="font-bold text-[15px] text-[#1A1A1A]">Invoice Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => printInvoiceWindow(invoice, photographer)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-88"
                style={{ background: '#1A1A1A' }}
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Invoice document via iframe ── */}
          <div style={{ background: '#E0E0DB', padding: '12px 16px' }}>
            <iframe
              srcDoc={buildInvoiceHtml(invoice, photographer)}
              title="Invoice Preview"
              style={{ width: '100%', height: '620px', border: 'none', borderRadius: '8px', background: '#fff', display: 'block' }}
              sandbox="allow-same-origin"
            />
          </div>

          {/* Bottom print button */}
          <div className="px-8 pb-6 flex gap-3">
            <button
              onClick={() => printInvoiceWindow(invoice, photographer)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:opacity-88"
              style={{ background: '#1A1A1A' }}
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-[13px] font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              style={{ background: '#F0F0EC' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function InvoicesClient({ invoices: initial, projects, photographerId, photographer }: Props) {
  const locale = useLocale()
  const ti = dashboardT(locale).invoicesPage
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [projectList, setProjectList] = useState<Project[]>(projects)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all')
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Preview modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [autoPrint, setAutoPrint] = useState(false)

  // After-create modal
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null)
  const [sendingCreated, setSendingCreated] = useState(false)
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')

  const [form, setForm] = useState({
    project_id: '',
    description: '',
    notes: '',
    invoice_number: '',
    verwendungszweck: '',
    due_date: '',
  })

  const [items, setItems] = useState<InvoiceLineItem[]>([
    { position: 1, description: '', quantity: 1, unit_price: 0, total: 0 },
  ])

  const addItem = () => setItems(prev => [
    ...prev,
    { position: prev.length + 1, description: '', quantity: 1, unit_price: 0, total: 0 },
  ])
  const removeItem = (idx: number) => setItems(prev =>
    prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, position: i + 1 }))
  )
  const updateItem = useCallback((idx: number, field: keyof InvoiceLineItem, value: string | number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: value }
      updated.total = Number((updated.quantity * updated.unit_price).toFixed(4))
      return updated
    }))
  }, [])

  // Quick-create project
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectClientId, setNewProjectClientId] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoaded, setClientsLoaded] = useState(false)

  // Quick-create client
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const supabase = createClient()

  const loadClients = async () => {
    if (clientsLoaded) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('photographer_id', photographerId)
      .order('full_name')
    setClients(data || [])
    setClientsLoaded(true)
  }

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) { toast.error(ti.enterProjectName); return }
    setSavingProject(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        photographer_id: photographerId,
        title: newProjectTitle.trim(),
        client_id: newProjectClientId || null,
        status: 'inquiry',
      })
      .select('id, title, client:clients(full_name)')
      .single()
    if (error) { toast.error('Error creating'); setSavingProject(false); return }
    const newProject = data as Project
    setProjectList(prev => [newProject, ...prev])
    setForm(f => ({ ...f, project_id: newProject.id }))
    setNewProjectTitle('')
    setNewProjectClientId('')
    setShowNewProject(false)
    setSavingProject(false)
    toast.success(ti.projectCreated(newProject.title))
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) { toast.error(ti.enterName); return }
    setSavingClient(true)
    const { data, error } = await supabase
      .from('clients')
      .insert({
        photographer_id: photographerId,
        full_name: newClientName.trim(),
        email: newClientEmail.trim() || null,
        status: 'active',
      })
      .select('id, full_name, email')
      .single()
    if (error) { toast.error('Error creating'); setSavingClient(false); return }
    const newClient = data as Client
    setClients(prev => [newClient, ...prev])
    setNewProjectClientId(newClient.id)
    setNewClientName('')
    setNewClientEmail('')
    setShowNewClient(false)
    setSavingClient(false)
    toast.success(ti.clientCreated(newClient.full_name))
  }

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const totalMwst = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => {
      if (i.tax_amount > 0) return s + i.tax_amount
      if (i.description?.includes('inkl. 19% MwSt')) return s + Math.round(i.amount * MWST_RATE / (1 + MWST_RATE))
      return s
    }, 0)

  // Form totals
  const formTaxStatus = photographer?.tax_status || 'kleinunternehmer'
  const formTaxRate = formTaxStatus === 'vat_19' ? 19 : formTaxStatus === 'vat_7' ? 7 : 0
  const subtotalEur = items.reduce((s, it) => s + it.total, 0)
  const taxEur = formTaxStatus !== 'kleinunternehmer' ? subtotalEur * formTaxRate / 100 : 0
  const grossEur = subtotalEur + taxEur

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.project_id) { toast.error(ti.selectProjectError); return }
    const validItems = items.filter(it => it.description.trim())
    if (validItems.length === 0) { toast.error('Bitte mindestens eine Position ausfüllen'); return }
    setSaving(true)

    const taxStatus = photographer?.tax_status || 'kleinunternehmer'
    const taxRate = taxStatus === 'vat_19' ? 19 : taxStatus === 'vat_7' ? 7 : 0
    const subtotalCents = Math.round(validItems.reduce((s, it) => s + it.total, 0) * 100)
    const taxCents = taxStatus !== 'kleinunternehmer' ? Math.round(subtotalCents * taxRate / 100) : 0
    const amountCents = subtotalCents + taxCents

    const autoNumber = `INV-${Date.now().toString().slice(-6)}`
    const invoiceNumber = form.invoice_number.trim() || autoNumber

    // Build photographer snapshot
    const photographerSnapshot: InvoiceSnapshot = {
      studio_name: photographer?.studio_name || null,
      full_name: photographer?.full_name || null,
      company_name: photographer?.company_name || null,
      address_street: photographer?.address_street || null,
      address_zip: photographer?.address_zip || null,
      address_city: photographer?.address_city || null,
      address_country: photographer?.address_country || null,
      phone: photographer?.phone || null,
      website: photographer?.website || null,
      email: photographer?.email || null,
      tax_number: photographer?.tax_number || null,
      bank_account_holder: photographer?.bank_account_holder || null,
      bank_name: photographer?.bank_name || null,
      bank_iban: photographer?.bank_iban || null,
      bank_bic: photographer?.bank_bic || null,
    }

    // Fetch full client data from the selected project for snapshot
    let clientSnapshot: ClientSnapshot | null = null
    const { data: projectData } = await supabase
      .from('projects')
      .select('client:clients(full_name, company_name, email, address_street, address_zip, address_city, address_country)')
      .eq('id', form.project_id)
      .single()
    const rawClient = projectData?.client
    const clientObj = Array.isArray(rawClient) ? rawClient[0] : rawClient
    if (clientObj) {
      clientSnapshot = {
        full_name: clientObj.full_name,
        company_name: (clientObj as { company_name?: string | null }).company_name || null,
        email: (clientObj as { email?: string | null }).email || null,
        address_street: (clientObj as { address_street?: string | null }).address_street || null,
        address_zip: (clientObj as { address_zip?: string | null }).address_zip || null,
        address_city: (clientObj as { address_city?: string | null }).address_city || null,
        address_country: (clientObj as { address_country?: string | null }).address_country || null,
      }
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        project_id: form.project_id,
        photographer_id: photographerId,
        amount: amountCents,
        subtotal: subtotalCents,
        tax_amount: taxCents,
        tax_rate: taxRate,
        tax_status: taxStatus,
        currency: 'eur',
        status: 'draft',
        description: form.description || null,
        due_date: form.due_date || null,
        invoice_number: invoiceNumber,
        notes: form.notes || null,
        verwendungszweck: form.verwendungszweck.trim() || invoiceNumber,
        photographer_snapshot: photographerSnapshot,
        client_snapshot: clientSnapshot,
      })
      .select('*, project:projects(title, client:clients(full_name, email))')
      .single()

    if (error) { toast.error('Error creating'); setSaving(false); return }

    // Insert line items
    const itemsToInsert = validItems.map(it => ({
      invoice_id: data.id,
      position: it.position,
      description: it.description.trim(),
      quantity: it.quantity,
      unit_price: Math.round(it.unit_price * 100),
      total: Math.round(it.total * 100),
    }))
    if (itemsToInsert.length > 0) {
      await supabase.from('invoice_items').insert(itemsToInsert)
    }

    const newInvoice = { ...data, items: itemsToInsert } as Invoice
    setInvoices(prev => [newInvoice, ...prev])
    setForm({ project_id: '', description: '', notes: '', invoice_number: '', verwendungszweck: '', due_date: '' })
    setItems([{ position: 1, description: '', quantity: 1, unit_price: 0, total: 0 }])
    setShowNew(false)
    setSaving(false)
    setCreatedInvoice(newInvoice)
  }

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId)
    const res = await fetch('/api/invoices/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    })
    const json = await res.json()
    setSendingId(null)
    if (!res.ok) {
      if (json.error === 'Client has no email address') {
        toast.error(ti.noClientEmail)
      } else {
        toast.error(ti.errorSend)
      }
      return false
    }
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'sent' as const, sent_at: new Date().toISOString() } : i))
    toast.success(ti.invoiceSent)
    return true
  }

  const handleSendCreated = async () => {
    if (!createdInvoice) return
    setSendingCreated(true)
    const ok = await handleSendInvoice(createdInvoice.id)
    setSendingCreated(false)
    if (ok) setCreatedInvoice(null)
  }

  const updateStatus = async (id: string, status: Invoice['status']) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (error) { toast.error(ti.errorStatus); return }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    setOpenMenu(null)
    toast.success(ti.statusUpdated(STATUS_CONFIG[status].label))
  }

  const deleteInvoice = async (id: string) => {
    if (!confirm(ti.deleteConfirm)) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) { toast.error(ti.errorDelete); return }
    setInvoices(prev => prev.filter(i => i.id !== id))
    setOpenMenu(null)
    toast.success(ti.deleted)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-in">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            {ti.title}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {ti.subtitle}
          </p>
        </div>
        <button onClick={() => {
            const autoNum = `INV-${Date.now().toString().slice(-6)}`
            setForm(f => ({ ...f, invoice_number: autoNum, verwendungszweck: autoNum }))
            setShowNew(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98]"
          style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}>
          <Plus className="w-4 h-4" />
          {ti.newInvoice}
        </button>
      </div>

      {/* Stats */}
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {([
          { label: ti.stats.paid,    value: formatCompact(totalPaid / 100, 'de'),    color: '#2A9B68', desc: totalPaid > 0 ? ti.stats.paidDesc : ti.stats.paidDescEmpty,          Icon: CheckCircle2, delay: 0 },
          { label: ti.stats.pending, value: formatCompact(totalPending / 100, 'de'), color: '#C4A47C', desc: totalPending > 0 ? ti.stats.pendingDesc : ti.stats.pendingDescEmpty,  Icon: Clock,        delay: 90 },
          { label: ti.stats.overdue, value: formatCompact(totalOverdue / 100, 'de'), color: '#C43B2C', desc: totalOverdue > 0 ? ti.stats.overdueDesc : ti.stats.overdueDescEmpty,  Icon: AlertCircle,  delay: 180 },
          { label: ti.stats.vat,     value: formatCompact(totalMwst / 100, 'de'),    color: '#8B5CF6', desc: ti.stats.vatDesc,                                                     Icon: Percent,      delay: 270 },
        ] as const).map(({ label, value, color, desc, Icon, delay }) => (
          <div
            key={label}
            className="relative group rounded-2xl overflow-hidden cursor-default transition-all duration-300"
            style={{
              background: 'var(--card-bg)',
              border: `1px solid ${color}20`,
              boxShadow: `0 2px 12px ${color}12`,
              animation: 'statFadeUp 0.5s ease forwards',
              animationDelay: `${delay}ms`,
              opacity: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 12px 32px ${color}22`
              e.currentTarget.style.borderColor = color + '40'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 2px 12px ${color}12`
              e.currentTarget.style.borderColor = color + '20'
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color, opacity: 0.7 }} />
            <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}12 0%, ${color}03 100%)`, opacity: 0.5 }} />
            <div className="relative z-10 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: color + '15', border: `1px solid ${color}25` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              </div>
              <p className="font-black tabular-nums leading-none mb-1" style={{ fontSize: '32px', letterSpacing: '-0.04em', color }}>{value}</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: color + '99' }}>{label}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter bar */}
      {invoices.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap animate-in-delay-2">
          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={locale === 'de' ? 'Name, Rechnungsnr. suchen…' : 'Search name, invoice no…'}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[13px] outline-none transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(f => {
              const count = f === 'all' ? invoices.length : invoices.filter(i => i.status === f).length
              if (f !== 'all' && count === 0) return null
              const cfg = f !== 'all' ? STATUS_CONFIG[f] : null
              const label = f === 'all'
                ? (locale === 'de' ? 'Alle' : 'All')
                : cfg!.label
              const active = statusFilter === f
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
                  style={{
                    background: active ? (f === 'all' ? '#F97316' : cfg!.color) : 'var(--bg-surface)',
                    color: active ? '#fff' : 'var(--text-muted)',
                    border: active ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  {label}
                  <span className="opacity-70 text-[11px]">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Invoice list */}
      {(() => {
        const q = search.trim().toLowerCase()
        const filtered = invoices.filter(inv => {
          const matchStatus = statusFilter === 'all' || inv.status === statusFilter
          if (!matchStatus) return false
          if (!q) return true
          const name = getClientName(inv.project).toLowerCase()
          const num = (inv.invoice_number ?? '').toLowerCase()
          const desc = (inv.description ?? '').toLowerCase()
          return name.includes(q) || num.includes(q) || desc.includes(q)
        })

        if (invoices.length === 0) return (
          <div className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(249,115,22,0.08)' }}>
              <FileText className="w-7 h-7" style={{ color: '#F97316' }} />
            </div>
            <h3 className="font-black mb-2" style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {ti.noInvoices}
            </h3>
            <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              {ti.noInvoicesDesc}
            </p>
            <button onClick={() => {
                const autoNum = `INV-${Date.now().toString().slice(-6)}`
                setForm(f => ({ ...f, invoice_number: autoNum, verwendungszweck: autoNum }))
                setShowNew(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
              style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}>
              <Plus className="w-4 h-4" />
              {ti.createFirst}
            </button>
          </div>
        )

        if (filtered.length === 0) return (
          <div className="rounded-2xl flex flex-col items-center justify-center py-14 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <Search className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>
              {locale === 'de' ? 'Keine Treffer' : 'No results'}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {locale === 'de' ? 'Filter oder Suchbegriff anpassen' : 'Try a different search or filter'}
            </p>
          </div>
        )

        return (
          <div className="space-y-2 animate-in-delay-2">
          {filtered.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status]
            const StatusIcon = cfg.icon
            const clientName = getClientName(inv.project)
            const clientEmail = getClientEmail(inv.project)
            const isSending = sendingId === inv.id
            return (
              <div key={inv.id} className="glass-card p-4 flex items-center gap-3">
                {/* Status icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}>
                  <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                      {clientName}
                    </p>
                    {inv.invoice_number && (
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {inv.invoice_number}
                      </span>
                    )}
                  </div>
                  {inv.description && (
                    <p className="text-[12.5px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {inv.description}
                    </p>
                  )}
                  {inv.due_date && (
                    <p className="text-[11.5px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" />
                      Due: {new Date(inv.due_date).toLocaleDateString('en-US')}
                    </p>
                  )}
                </div>

                {/* Amount + status */}
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-[16px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {formatCompact(inv.amount / 100, 'de')}
                  </p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Send button */}
                {(inv.status === 'sent' || inv.status === 'draft') && clientEmail && (
                  <button
                    onClick={() => handleSendInvoice(inv.id)}
                    disabled={isSending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white flex-shrink-0 transition-all hover:opacity-88 disabled:opacity-50"
                    style={{ background: '#CC8415', boxShadow: '0 1px 6px rgba(204,132,21,0.25)' }}
                    title={`${ti.sendToClient} ${clientEmail}`}
                  >
                    {isSending
                      ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                    {isSending ? ti.sending : ti.send}
                  </button>
                )}

                {/* ── View button ── */}
                <button
                  onClick={() => { setAutoPrint(false); setPreviewInvoice(inv) }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title={ti.viewInvoice}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* ── Print/Download button ── */}
                <button
                  onClick={() => { setAutoPrint(true); setPreviewInvoice(inv) }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title={ti.printPdf}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Printer className="w-4 h-4" />
                </button>

                {/* Actions menu */}
                <div className="relative flex-shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {openMenu === inv.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="dropdown-glass absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 min-w-[200px]">
                        {/* Send — only for draft/sent */}
                        {(inv.status === 'draft' || inv.status === 'sent') && (
                          <button onClick={() => { handleSendInvoice(inv.id); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Send className="w-3.5 h-3.5" style={{ color: '#CC8415' }} />
                            {ti.sendToClient}
                          </button>
                        )}
                        {/* Mark as paid — always visible (except already paid) */}
                        {inv.status !== 'paid' && (
                          <button onClick={() => updateStatus(inv.id, 'paid')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2A9B68' }} />
                            {ti.markPaid}
                          </button>
                        )}
                        {/* Mark as overdue — for draft/sent/paid */}
                        {inv.status !== 'overdue' && (
                          <button onClick={() => updateStatus(inv.id, 'overdue')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <AlertCircle className="w-3.5 h-3.5" style={{ color: '#C43B2C' }} />
                            {ti.markOverdue}
                          </button>
                        )}
                        <div style={{ borderTop: '1px solid var(--border-color)' }} />
                        <button onClick={() => deleteInvoice(inv.id)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                          style={{ color: '#C43B2C' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Trash2 className="w-3.5 h-3.5" />
                          {ti.delete}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )
      })()}

      {/* ── Invoice Preview Modal ── */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          photographer={photographer}
          onClose={() => { setPreviewInvoice(null); setAutoPrint(false) }}
          autoPrint={autoPrint}
        />
      )}

      {/* ── New invoice modal ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{ti.modalTitle}</h2>
              <button onClick={() => setShowNew(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Project */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: 'var(--text-primary)' }}>
                    Projekt *
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowNewProject(v => !v); loadClients() }}
                    className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    <FolderPlus className="w-3 h-3" />
                    {ti.newProject}
                  </button>
                </div>

                {showNewProject && (
                  <div className="mb-2 p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={e => setNewProjectTitle(e.target.value)}
                      placeholder="Projektname *"
                      className="input-base w-full text-[13px]"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newProjectClientId}
                        onChange={e => setNewProjectClientId(e.target.value)}
                        className="input-base flex-1 text-[13px]"
                        style={{ color: newProjectClientId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        <option value="">{ti.noClient}</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewClient(v => !v)}
                        className="flex items-center gap-1 text-[11px] font-bold flex-shrink-0 transition-colors"
                        style={{ color: 'var(--accent)' }}
                      >
                        <UserPlus className="w-3 h-3" />
                        + Neu
                      </button>
                    </div>

                    {showNewClient && (
                      <div className="p-2.5 rounded-lg space-y-1.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>New client</p>
                        <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Name *" className="input-base w-full text-[12px]" autoFocus />
                        <input type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="E-Mail (optional)" className="input-base w-full text-[12px]" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowNewClient(false)} className="flex-1 text-[12px] py-1.5 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Cancel</button>
                          <button type="button" onClick={handleCreateClient} disabled={savingClient || !newClientName.trim()} className="flex-1 text-[12px] py-1.5 rounded-lg font-bold text-white disabled:opacity-40" style={{ background: 'var(--accent)' }}>
                            {savingClient ? '...' : 'Create'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 text-[12px] py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Cancel</button>
                      <button type="button" onClick={handleCreateProject} disabled={savingProject || !newProjectTitle.trim()} className="flex-1 text-[12px] py-1.5 rounded-lg font-bold text-white disabled:opacity-40" style={{ background: 'var(--accent)' }}>
                        {savingProject ? '...' : '+ Create'}
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  className="input-base"
                  style={{ color: form.project_id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                        <option value="">{ti.selectProject}</option>
                  {projectList.map(p => {
                    const c = p.client
                    const clientName = Array.isArray(c) ? c[0]?.full_name : c?.full_name
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title}{clientName ? ` — ${clientName}` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Line items */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-primary)' }}>
                  Positionen *
                </label>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                  {/* Header */}
                  <div className="grid px-2 py-2 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', gridTemplateColumns: '1fr 52px 80px 24px' }}>
                    <span className="pl-1">Beschreibung</span>
                    <span className="text-right">Menge</span>
                    <span className="text-right pr-1">Einzelpreis</span>
                    <span></span>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid items-center gap-1 px-2 py-1.5"
                      style={{ borderTop: '1px solid var(--border-color)', gridTemplateColumns: '1fr 52px 80px 24px' }}>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder={`Position ${item.position}`}
                        className="px-2 py-1.5 rounded-lg text-[13px] outline-none w-full"
                        style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        step="1"
                        className="px-2 py-1.5 rounded-lg text-[13px] outline-none text-right w-full"
                        style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                      />
                      <input
                        type="number"
                        value={item.unit_price || ''}
                        onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="px-2 py-1.5 rounded-lg text-[13px] outline-none text-right w-full"
                        style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="w-6 h-6 rounded flex items-center justify-center mx-auto disabled:opacity-20 transition-opacity"
                        style={{ color: '#C43B2C' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 text-[12px] font-bold transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Position hinzufügen
                </button>
              </div>

              {/* Totals */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                {formTaxStatus !== 'kleinunternehmer' && (
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: 'var(--text-muted)' }}>Nettobetrag</span>
                    <span style={{ color: 'var(--text-primary)' }}>{fmtEurText(subtotalEur)}</span>
                  </div>
                )}
                {formTaxStatus !== 'kleinunternehmer' && (
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: 'var(--text-muted)' }}>MwSt {formTaxRate}%</span>
                    <span style={{ color: 'var(--text-primary)' }}>{fmtEurText(taxEur)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between font-black text-[15px]"
                  style={{
                    borderTop: formTaxStatus !== 'kleinunternehmer' ? '1px solid var(--border-color)' : undefined,
                    paddingTop: formTaxStatus !== 'kleinunternehmer' ? '8px' : undefined,
                    marginTop: formTaxStatus !== 'kleinunternehmer' ? '4px' : undefined,
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>Gesamtbetrag</span>
                  <span style={{ color: '#F97316' }}>{fmtEurText(grossEur)}</span>
                </div>
                {formTaxStatus === 'kleinunternehmer' && (
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="z.B. Hochzeitsfotografie — 12. April 2026"
                  className="input-base"
                />
              </div>

              {/* Notes / Anmerkungen */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Anmerkungen
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Hinweise für den Kunden..."
                  rows={3}
                  className="input-base resize-none"
                  style={{ lineHeight: '1.5' }}
                />
              </div>

              {/* Rechnungsnummer */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Rechnungsnummer
                </label>
                <input
                  type="text"
                  value={form.invoice_number}
                  onChange={e => {
                    const val = e.target.value
                    setForm(f => ({
                      ...f,
                      invoice_number: val,
                      // keep verwendungszweck in sync only if it matches old invoice_number
                      verwendungszweck: f.verwendungszweck === f.invoice_number ? val : f.verwendungszweck,
                    }))
                  }}
                  placeholder="INV-000000"
                  className="input-base font-mono"
                />
              </div>

              {/* Verwendungszweck */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Verwendungszweck
                </label>
                <input
                  type="text"
                  value={form.verwendungszweck}
                  onChange={e => setForm(f => ({ ...f, verwendungszweck: e.target.value }))}
                  placeholder={form.invoice_number || 'Rechnungsnummer als Verwendungszweck'}
                  className="input-base"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Due date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="input-base"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="btn-shimmer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50"
                  style={{ background: '#F97316' }}>
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Plus className="w-4 h-4" />Create invoice</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── After-create: send modal ── */}
      {createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-glass w-full max-w-lg rounded-2xl overflow-hidden flex flex-col animate-scale-in"
            style={{ maxHeight: '92vh' }}>

            {/* Accent bar */}
            <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #F97316, #CC8415)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.12)' }}>
                  <Mail className="w-4 h-4" style={{ color: '#F97316' }} />
                </div>
                <div>
                  <h2 className="font-black text-[15px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Send invoice
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {getClientEmail(createdInvoice.project) ? `To ${getClientEmail(createdInvoice.project)}` : ti.noEmail}
                  </p>
                </div>
              </div>
              <button onClick={() => setCreatedInvoice(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Invoice summary */}
              <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.10)' }}>
                  <FileText className="w-4 h-4" style={{ color: '#F97316' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {getClientName(createdInvoice.project)} · {createdInvoice.invoice_number}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {formatEur(createdInvoice.amount)}{createdInvoice.due_date ? ` · Due ${new Date(createdInvoice.due_date).toLocaleDateString('en-US')}` : ''}
                  </p>
                </div>
              </div>

              {/* Vorlage picker */}
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>E-Mail Vorlage</p>
                <EmailVorlagePicker
                  category="rechnung"
                  onSelect={(subject, body) => { setSendSubject(subject); setSendMessage(body) }}
                  vars={{ client_name: getClientName(createdInvoice.project), invoice_number: createdInvoice.invoice_number || undefined, amount: formatEur(createdInvoice.amount) }}
                  label="Select template"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Betreff</label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={e => setSendSubject(e.target.value)}
                  className="input-base w-full"
                  placeholder={`Rechnung ${createdInvoice.invoice_number || ''}`}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Nachricht</label>
                <textarea
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  rows={6}
                  className="input-base w-full resize-none"
                  style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
                  placeholder="Deine Nachricht an den Kunden..."
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  The invoice link will be automatically added to the email.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              {getClientEmail(createdInvoice.project) ? (
                <button
                  onClick={handleSendCreated}
                  disabled={sendingCreated}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 disabled:opacity-50"
                  style={{ background: '#CC8415', boxShadow: '0 1px 8px rgba(204,132,21,0.30)' }}
                >
                  {sendingCreated
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                  {sendingCreated ? ti.sendingBtn : ti.sendToClientNow}
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl text-[13px] text-center"
                  style={{ background: 'rgba(196,59,44,0.08)', color: '#C43B2C', border: '1px solid rgba(196,59,44,0.20)' }}>
                  {ti.noEmailWarning}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setAutoPrint(false); setPreviewInvoice(createdInvoice); setCreatedInvoice(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium transition-colors"
                  style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)' }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {ti.preview}
                </button>
                <button
                  onClick={() => setCreatedInvoice(null)}
                  className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
                >
                  {ti.later}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
