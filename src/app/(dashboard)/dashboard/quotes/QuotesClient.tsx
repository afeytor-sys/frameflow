'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, FileText, Send, CheckCircle2, Clock, AlertCircle, X, Trash2,
  Eye, Copy, MoreHorizontal, ChevronDown, ChevronUp, GripVertical,
  ToggleLeft, CheckSquare, List, Pencil, ExternalLink, Receipt, FileDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'

// ── Types ────────────────────────────────────────────────────────────────────
type SectionType = 'fixed' | 'single_choice' | 'multiple_choice'
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'expired'

// Builder-only types (no DB ids yet)
type BuilderItem = Omit<QuoteItem, 'id' | 'section_id' | 'quote_id'> & { _tempId: string }
type BuilderSection = Omit<QuoteSection, 'id' | 'quote_id' | 'items'> & { _tempId: string; items: BuilderItem[] }

interface QuoteItem {
  id: string
  section_id: string
  quote_id: string
  title: string
  description: string | null
  unit_price: number   // cents
  editable_qty: boolean
  default_qty: number
  position: number
}

interface QuoteSection {
  id: string
  quote_id: string
  title: string
  type: SectionType
  required: boolean
  position: number
  items: QuoteItem[]
}

interface QuoteResponse {
  id: string
  submitted_at: string
  total_amount: number
  subtotal: number
  tax_amount: number
  selections: Record<string, number>
  client_name: string | null
  client_email: string | null
  converted_invoice_id: string | null
}

interface Quote {
  id: string
  photographer_id: string
  project_id: string | null
  title: string
  status: QuoteStatus
  valid_until: string | null
  client_token: string
  notes: string | null
  tax_status: 'kleinunternehmer' | 'vat_19' | 'vat_7' | 'none'
  tax_rate: number
  created_at: string
  sections: QuoteSection[]
  project?: { id: string; title: string; client?: { full_name: string; email?: string } | { full_name: string; email?: string }[] } | null
  responses?: QuoteResponse[]
}

interface Project {
  id: string
  title: string
  client?: { full_name: string; email?: string; company_name?: string | null; address_street?: string | null; address_zip?: string | null; address_city?: string | null; address_country?: string | null } | null
           | { full_name: string; email?: string }[]
}

interface Photographer {
  id: string
  full_name: string | null
  studio_name: string | null
  email: string | null
  logo_url: string | null
  tax_status: 'kleinunternehmer' | 'vat_19' | 'vat_7' | null
  tax_rate: number | null
  website?: string | null
  phone?: string | null
}

interface QuoteTemplateItem {
  id: string
  section_id: string
  template_id: string
  title: string
  description: string | null
  unit_price: number
  editable_qty: boolean
  default_qty: number
  position: number
}

interface QuoteTemplateSection {
  id: string
  template_id: string
  title: string
  type: SectionType
  required: boolean
  position: number
  items: QuoteTemplateItem[]
}

interface QuoteTemplate {
  id: string
  photographer_id: string
  title: string
  notes: string | null
  created_at: string
  sections: QuoteTemplateSection[]
}

interface Props {
  quotes: Quote[]
  projects: Project[]
  photographerId: string
  photographer: Photographer | null
  templates: QuoteTemplate[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://fotonizer.com'
}

function buildQuoteResponseHtml(quote: Quote, response: QuoteResponse, photographer: Photographer | null, hideTax = false) {
  const studioName = photographer?.studio_name || photographer?.full_name || 'Studio'
  const displayName = [photographer?.studio_name, photographer?.full_name].filter(Boolean).join(' · ') || 'Studio'
  const logoUrl = photographer?.logo_url || null

  // Build ordered item map (section.position → item.position)
  const itemOrderMap = new Map<string, { sectionPos: number; itemPos: number; item: QuoteItem }>()
  for (const section of [...quote.sections].sort((a, b) => a.position - b.position)) {
    for (const item of [...section.items].sort((a, b) => a.position - b.position)) {
      itemOrderMap.set(item.id, { sectionPos: section.position, itemPos: item.position, item })
    }
  }

  const lineItems = Object.entries(response.selections || {})
    .filter(([, qty]) => qty > 0)
    .sort(([aId], [bId]) => {
      const a = itemOrderMap.get(aId)
      const b = itemOrderMap.get(bId)
      if (!a || !b) return 0
      if (a.sectionPos !== b.sectionPos) return a.sectionPos - b.sectionPos
      return a.itemPos - b.itemPos
    })
    .map(([itemId, qty]) => {
      const entry = itemOrderMap.get(itemId)
      if (!entry || !qty) return null
      const item = entry.item
      return { title: item.title, qty, unit_price: item.unit_price, total: item.unit_price * qty }
    })
    .filter(Boolean) as { title: string; qty: number; unit_price: number; total: number }[]

  const subtotal = response.subtotal || lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = response.tax_amount || 0
  const total = response.total_amount
  const isKlein = quote.tax_status === 'kleinunternehmer'
  const showTax = !hideTax
  const dateStr = new Date(response.submitted_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const itemRows = lineItems.map((it, idx) => `
    <tr>
      <td style="padding:9px 0;font-size:13px;color:#7A7670;border-top:1px solid #E8E4DC;">${idx + 1}</td>
      <td style="padding:9px 12px;font-size:13px;color:#111110;border-top:1px solid #E8E4DC;">${it.title}</td>
      <td style="padding:9px 0;font-size:13px;color:#7A7670;text-align:center;border-top:1px solid #E8E4DC;">${it.qty}</td>
      <td style="padding:9px 0;font-size:13px;color:#7A7670;text-align:right;border-top:1px solid #E8E4DC;">${formatEur(it.unit_price)}</td>
      <td style="padding:9px 0;font-size:13px;font-weight:700;color:#111110;text-align:right;border-top:1px solid #E8E4DC;">${formatEur(it.total)}</td>
    </tr>`).join('')

  const totalRows = isKlein
    ? `<tr>
        <td colspan="4" style="padding:10px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#7A7670;border-top:2px solid #E8E4DC;">Gesamt</td>
        <td style="padding:10px 0 4px;font-size:15px;font-weight:800;text-align:right;color:#C4A47C;border-top:2px solid #E8E4DC;">${formatEur(total)}</td>
      </tr>`
    : `<tr>
        <td colspan="4" style="padding:8px 0 2px;font-size:13px;text-align:right;color:#7A7670;border-top:2px solid #E8E4DC;">Nettobetrag</td>
        <td style="padding:8px 0 2px;font-size:13px;text-align:right;color:#111110;border-top:2px solid #E8E4DC;">${formatEur(subtotal)}</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:2px 0;font-size:13px;text-align:right;color:#7A7670;">MwSt ${quote.tax_rate}%</td>
        <td style="padding:2px 0;font-size:13px;text-align:right;color:#111110;">${formatEur(taxAmount)}</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:8px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#111110;border-top:1px solid #E8E4DC;">Gesamtbetrag</td>
        <td style="padding:8px 0 4px;font-size:15px;font-weight:800;text-align:right;color:#C4A47C;">${formatEur(total)}</td>
      </tr>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Angebot – ${quote.title}</title>
  <style>
    @media print { @page { size: A4; margin: 18mm 20mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111110; }
  </style>
  <script>window.onload = function(){ window.print() }</script>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr><td style="height:3px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);border-radius:2px;"></td></tr>
    <tr><td style="padding:28px 0 20px;">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td style="vertical-align:middle;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${displayName}" style="height:48px;width:auto;object-fit:contain;border-radius:8px;display:block;margin-bottom:8px;">` : ''}
          <p style="margin:0;font-size:22px;font-weight:800;color:#111110;letter-spacing:-0.03em;">${displayName}</p>
          ${photographer?.email ? `<p style="margin:3px 0 0;font-size:12px;color:#7A7670;">${photographer.email}</p>` : ''}
          ${photographer?.website ? `<p style="margin:2px 0 0;font-size:12px;color:#7A7670;">${photographer.website}</p>` : ''}
          ${photographer?.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#7A7670;">${photographer.phone}</p>` : ''}
          <p style="margin:6px 0 0;font-size:11px;color:#B0ACA6;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Angebot</p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="height:1px;background:#E8E4DC;"></td></tr>
    <tr><td style="padding:24px 0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;vertical-align:top;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;">Kunde</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#111110;">${response.client_name || '—'}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#7A7670;">${response.client_email || ''}</p>
          </td>
          <td style="width:50%;vertical-align:top;text-align:right;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;">Datum</p>
            <p style="margin:0;font-size:14px;color:#111110;">${dateStr}</p>
            ${quote.valid_until ? `<p style="margin:2px 0 0;font-size:12px;color:#7A7670;">Gültig bis ${new Date(quote.valid_until).toLocaleDateString('de-DE')}</p>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 0 24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:800;color:#111110;letter-spacing:-0.02em;">${quote.title}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E4DC;border-radius:10px;overflow:hidden;">
        <tr style="background:#F8F7F4;">
          <td style="padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;width:5%;">Pos.</td>
          <td style="padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;">Beschreibung</td>
          <td style="padding:10px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;text-align:center;width:10%;">Menge</td>
          <td style="padding:10px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;text-align:right;width:15%;">Einzelpr.</td>
          <td style="padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;text-align:right;width:15%;">Gesamt</td>
        </tr>
        ${itemRows}
        ${showTax ? totalRows : `<tr><td colspan="5" style="padding:10px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#7A7670;border-top:2px solid #E8E4DC;">Gesamt</td><td style="padding:10px 0 4px;font-size:15px;font-weight:800;text-align:right;color:#C4A47C;border-top:2px solid #E8E4DC;">${formatEur(total)}</td></tr>`}
        ${showTax && isKlein ? '<tr><td colspan="5" style="padding:4px 12px 12px;font-size:11px;color:#B0ACA6;">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</td></tr>' : '<tr><td colspan="5" style="height:12px;"></td></tr>'}
      </table>
    </td></tr>
    <tr><td style="height:1px;background:#E8E4DC;"></td></tr>
    <tr><td style="padding:20px 0 0;text-align:center;">
      <p style="margin:0;font-size:11px;color:#B0ACA6;">Erstellt mit Fotonizer · fotonizer.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; labelDe: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:    { label: 'Draft',    labelDe: 'Entwurf',    color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: FileText },
  sent:     { label: 'Sent',     labelDe: 'Gesendet',   color: '#CC8415', bg: 'rgba(204,132,21,0.10)',  icon: Send },
  accepted: { label: 'Accepted', labelDe: 'Angenommen', color: '#2A9B68', bg: 'rgba(42,155,104,0.10)',  icon: CheckCircle2 },
  expired:  { label: 'Expired',  labelDe: 'Abgelaufen', color: '#C43B2C', bg: 'rgba(196,59,44,0.10)',   icon: AlertCircle },
}

const SECTION_TYPE_ICONS: Record<SectionType, React.ElementType> = {
  fixed:           List,
  single_choice:   ToggleLeft,
  multiple_choice: CheckSquare,
}

// ── New item/section defaults ─────────────────────────────────────────────────
function newItem(sectionId: string, quoteId: string, position: number): Omit<QuoteItem, 'id'> {
  return { section_id: sectionId, quote_id: quoteId, title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function QuotesClient({ quotes: initial, projects, photographerId, photographer, templates: initialTemplates }: Props) {
  const locale = useLocale()
  const isDE = locale === 'de'
  const [quotes, setQuotes] = useState<Quote[]>(initial)
  const [activeTab, setActiveTab] = useState<'quotes' | 'templates'>('quotes')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  // Templates state
  const [templates, setTemplates] = useState<QuoteTemplate[]>(initialTemplates)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState({ title: '', notes: '' })
  const [templateSections, setTemplateSections] = useState<BuilderSection[]>([
    { _tempId: 't1', title: isDE ? 'Paket' : 'Package', type: 'single_choice', required: true, position: 0, items: [
      { _tempId: 'i1', title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: 0 },
    ]},
  ])

  // New quote form state
  const [form, setForm] = useState({
    project_id: '', title: '', notes: '', valid_until: '',
    tax_status: (photographer?.tax_status || 'kleinunternehmer') as 'kleinunternehmer' | 'vat_19' | 'vat_7' | 'none',
    tax_rate: photographer?.tax_rate || 0,
  })
  const [sections, setSections] = useState<BuilderSection[]>([
    { _tempId: 't1', title: isDE ? 'Paket' : 'Package', type: 'single_choice', required: true, position: 0, items: [
      { _tempId: 'i1', title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: 0 },
    ]},
  ])

  const supabase = createClient()

  // ── Section helpers ────────────────────────────────────────────────────────
  const addSection = () => setSections(prev => [...prev, {
    _tempId: `t${Date.now()}`,
    title: '',
    type: 'multiple_choice' as SectionType,
    required: false,
    position: prev.length,
    items: [{ _tempId: `i${Date.now()}`, title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: 0 }],
  }])

  const removeSection = (tid: string) => setSections(prev => prev.filter(s => s._tempId !== tid))

  const updateSection = useCallback((tid: string, patch: Partial<Omit<QuoteSection, 'id' | 'quote_id' | 'items'>>) => {
    setSections(prev => prev.map(s => s._tempId === tid ? { ...s, ...patch } : s))
  }, [])

  const addItem = (sectionTid: string) => setSections(prev => prev.map(s => {
    if (s._tempId !== sectionTid) return s
    return { ...s, items: [...s.items, { _tempId: `i${Date.now()}`, title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: s.items.length }] }
  }))

  const removeItem = (sectionTid: string, itemTid: string) => setSections(prev => prev.map(s => {
    if (s._tempId !== sectionTid) return s
    return { ...s, items: s.items.filter(i => i._tempId !== itemTid) }
  }))

  const updateItem = useCallback((sectionTid: string, itemTid: string, patch: Partial<Omit<QuoteItem, 'id' | 'section_id' | 'quote_id'>>) => {
    setSections(prev => prev.map(s => {
      if (s._tempId !== sectionTid) return s
      return { ...s, items: s.items.map(i => i._tempId === itemTid ? { ...i, ...patch } : i) }
    }))
  }, [])

  // ── Create quote ──────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error(isDE ? 'Bitte Titel eingeben' : 'Please enter a title'); return }
    if (sections.length === 0) { toast.error(isDE ? 'Mindestens eine Sektion' : 'At least one section'); return }
    setSaving(true)

    const taxStatus = form.tax_status
    const taxRate = form.tax_rate

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        photographer_id: photographerId,
        project_id: form.project_id || null,
        title: form.title.trim(),
        notes: form.notes || null,
        valid_until: form.valid_until || null,
        tax_status: taxStatus,
        tax_rate: taxRate,
        status: 'draft',
      })
      .select('*, sections:quote_sections(*, items:quote_items(*)), project:projects(id,title,client:clients(full_name,email)), responses:quote_responses(*)')
      .single()

    if (error || !quote) { toast.error(isDE ? 'Fehler beim Erstellen' : 'Error creating'); setSaving(false); return }

    // Insert sections + items
    for (const sec of sections) {
      const { data: secRow } = await supabase
        .from('quote_sections')
        .insert({ quote_id: quote.id, title: sec.title, type: sec.type, required: sec.required, position: sec.position })
        .select('id').single()
      if (!secRow) continue
      const validItems = sec.items.filter(i => i.title.trim())
      if (validItems.length > 0) {
        await supabase.from('quote_items').insert(
          validItems.map((it, idx) => ({
            section_id: secRow.id,
            quote_id: quote.id,
            title: it.title.trim(),
            description: it.description || null,
            unit_price: Math.round((it.unit_price || 0) * 100),
            editable_qty: it.editable_qty,
            default_qty: it.default_qty,
            position: idx,
          }))
        )
      }
    }

    // Re-fetch with full data
    const { data: fullQuote } = await supabase
      .from('quotes')
      .select('*, sections:quote_sections(*, items:quote_items(*)), project:projects(id,title,client:clients(full_name,email)), responses:quote_responses(*)')
      .eq('id', quote.id)
      .single()

    setQuotes(prev => [fullQuote as Quote, ...prev])
    setForm({ project_id: '', title: '', notes: '', valid_until: '', tax_status: photographer?.tax_status || 'kleinunternehmer', tax_rate: photographer?.tax_rate || 0 })
    setSections([{ _tempId: 't1', title: isDE ? 'Paket' : 'Package', type: 'single_choice', required: true, position: 0, items: [
      { _tempId: 'i1', title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: 0 },
    ]}])
    setShowNew(false)
    setSaving(false)
    toast.success(isDE ? `Angebot "${form.title.trim()}" erstellt!` : `Quote "${form.title.trim()}" created!`)
  }

  // ── Update status ──────────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: QuoteStatus) => {
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
    if (error) { toast.error(isDE ? 'Fehler' : 'Error'); return }
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q))
    setOpenMenu(null)
    toast.success(STATUS_CONFIG[status][isDE ? 'labelDe' : 'label'])
  }

  // ── Delete quote ───────────────────────────────────────────────────────────
  const deleteQuote = async (id: string) => {
    if (!confirm(isDE ? 'Angebot wirklich löschen?' : 'Really delete this quote?')) return
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) { toast.error(isDE ? 'Fehler' : 'Error'); return }
    setQuotes(prev => prev.filter(q => q.id !== id))
    setOpenMenu(null)
    toast.success(isDE ? 'Angebot gelöscht' : 'Quote deleted')
  }

  // ── Copy link ─────────────────────────────────────────────────────────────
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${getSiteUrl()}/q/${token}`)
    toast.success(isDE ? 'Link kopiert!' : 'Link copied!')
  }

  // ── Apply template to new quote builder ────────────────────────────────────
  const applyTemplate = (tpl: QuoteTemplate) => {
    const built: BuilderSection[] = tpl.sections
      .sort((a, b) => a.position - b.position)
      .map(s => ({
        _tempId: `t${s.id}`,
        title: s.title,
        type: s.type,
        required: s.required,
        position: s.position,
        items: s.items
          .sort((a, b) => a.position - b.position)
          .map(it => ({
            _tempId: `i${it.id}`,
            title: it.title,
            description: it.description,
            unit_price: Math.round(it.unit_price / 100), // cents → euros for builder state
            editable_qty: it.editable_qty,
            default_qty: it.default_qty,
            position: it.position,
          })),
      }))
    setSections(built.length > 0 ? built : sections)
    if (!form.title && tpl.title) setForm(f => ({ ...f, title: tpl.title }))
    toast.success(isDE ? `Vorlage „${tpl.title}" angewendet` : `Template "${tpl.title}" applied`)
  }

  // ── Template section helpers ───────────────────────────────────────────────
  const addTemplateSection = () => setTemplateSections(prev => [...prev, {
    _tempId: `t${Date.now()}`,
    title: '',
    type: 'multiple_choice' as SectionType,
    required: false,
    position: prev.length,
    items: [{ _tempId: `i${Date.now()}`, title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: 0 }],
  }])

  const removeTemplateSection = (tid: string) => setTemplateSections(prev => prev.filter(s => s._tempId !== tid))

  const updateTemplateSection = useCallback((tid: string, patch: Partial<Omit<BuilderSection, '_tempId' | 'items'>>) => {
    setTemplateSections(prev => prev.map(s => s._tempId === tid ? { ...s, ...patch } : s))
  }, [])

  const addTemplateItem = (sectionTid: string) => setTemplateSections(prev => prev.map(s => {
    if (s._tempId !== sectionTid) return s
    return { ...s, items: [...s.items, { _tempId: `i${Date.now()}`, title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: s.items.length }] }
  }))

  const removeTemplateItem = (sectionTid: string, itemTid: string) => setTemplateSections(prev => prev.map(s => {
    if (s._tempId !== sectionTid) return s
    return { ...s, items: s.items.filter(i => i._tempId !== itemTid) }
  }))

  const updateTemplateItem = useCallback((sectionTid: string, itemTid: string, patch: Partial<Omit<BuilderItem, '_tempId'>>) => {
    setTemplateSections(prev => prev.map(s => {
      if (s._tempId !== sectionTid) return s
      return { ...s, items: s.items.map(i => i._tempId === itemTid ? { ...i, ...patch } : i) }
    }))
  }, [])

  const openNewTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ title: '', notes: '' })
    setTemplateSections([{ _tempId: 't1', title: isDE ? 'Paket' : 'Package', type: 'single_choice', required: true, position: 0, items: [
      { _tempId: 'i1', title: '', description: null, unit_price: 0, editable_qty: false, default_qty: 1, position: 0 },
    ]}])
    setShowNewTemplate(true)
  }

  const openEditTemplate = (tpl: QuoteTemplate) => {
    setEditingTemplate(tpl)
    setTemplateForm({ title: tpl.title, notes: tpl.notes || '' })
    setTemplateSections(
      tpl.sections.sort((a, b) => a.position - b.position).map(s => ({
        _tempId: `t${s.id}`,
        title: s.title,
        type: s.type,
        required: s.required,
        position: s.position,
        items: s.items.sort((a, b) => a.position - b.position).map(it => ({
          _tempId: `i${it.id}`,
          title: it.title,
          description: it.description,
          unit_price: it.unit_price,
          editable_qty: it.editable_qty,
          default_qty: it.default_qty,
          position: it.position,
        })),
      }))
    )
    setShowNewTemplate(true)
  }

  // ── Save template ─────────────────────────────────────────────────────────
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateForm.title.trim()) { toast.error(isDE ? 'Bitte Titel eingeben' : 'Please enter a title'); return }
    setSavingTemplate(true)
    try {
      if (editingTemplate) {
        // Update existing
        await supabase.from('quote_templates').update({ title: templateForm.title, notes: templateForm.notes || null }).eq('id', editingTemplate.id)
        await supabase.from('quote_template_sections').delete().eq('template_id', editingTemplate.id)
        // Re-insert sections + items
        for (let si = 0; si < templateSections.length; si++) {
          const sec = templateSections[si]
          const { data: dbSec } = await supabase.from('quote_template_sections').insert({
            template_id: editingTemplate.id,
            title: sec.title, type: sec.type, required: sec.required, position: si,
          }).select('id').single()
          if (dbSec) {
            for (let ii = 0; ii < sec.items.length; ii++) {
              const it = sec.items[ii]
              await supabase.from('quote_template_items').insert({
                template_id: editingTemplate.id, section_id: dbSec.id,
                title: it.title, description: it.description, unit_price: it.unit_price,
                editable_qty: it.editable_qty, default_qty: it.default_qty, position: ii,
              })
            }
          }
        }
        // Refetch template
        const { data: updated } = await supabase.from('quote_templates')
          .select('*, sections:quote_template_sections(*, items:quote_template_items(*))')
          .eq('id', editingTemplate.id).single()
        if (updated) setTemplates(prev => prev.map(t => t.id === updated.id ? updated as QuoteTemplate : t))
        toast.success(isDE ? 'Vorlage aktualisiert' : 'Template updated')
      } else {
        // Create new
        const { data: tpl, error } = await supabase.from('quote_templates')
          .insert({ photographer_id: photographerId, title: templateForm.title, notes: templateForm.notes || null })
          .select('id').single()
        if (error || !tpl) { toast.error(isDE ? 'Fehler' : 'Error'); return }
        for (let si = 0; si < templateSections.length; si++) {
          const sec = templateSections[si]
          const { data: dbSec } = await supabase.from('quote_template_sections').insert({
            template_id: tpl.id,
            title: sec.title, type: sec.type, required: sec.required, position: si,
          }).select('id').single()
          if (dbSec) {
            for (let ii = 0; ii < sec.items.length; ii++) {
              const it = sec.items[ii]
              await supabase.from('quote_template_items').insert({
                template_id: tpl.id, section_id: dbSec.id,
                title: it.title, description: it.description, unit_price: it.unit_price,
                editable_qty: it.editable_qty, default_qty: it.default_qty, position: ii,
              })
            }
          }
        }
        const { data: full } = await supabase.from('quote_templates')
          .select('*, sections:quote_template_sections(*, items:quote_template_items(*))')
          .eq('id', tpl.id).single()
        if (full) setTemplates(prev => [full as QuoteTemplate, ...prev])
        toast.success(isDE ? 'Vorlage erstellt!' : 'Template created!')
      }
      setShowNewTemplate(false)
      setEditingTemplate(null)
    } catch {
      toast.error(isDE ? 'Fehler' : 'Error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm(isDE ? 'Vorlage wirklich löschen?' : 'Really delete this template?')) return
    const { error } = await supabase.from('quote_templates').delete().eq('id', id)
    if (error) { toast.error(isDE ? 'Fehler' : 'Error'); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success(isDE ? 'Vorlage gelöscht' : 'Template deleted')
  }

  // ── Convert response to invoice ───────────────────────────────────────────
  const convertToInvoice = async (quote: Quote, response: QuoteResponse) => {
    if (response.converted_invoice_id) {
      toast.error(isDE ? 'Bereits konvertiert' : 'Already converted')
      return
    }
    setConvertingId(response.id)

    // Build invoice items from response selections
    const selections = (response as { selections?: Record<string, number> }).selections || {}
    const allItems = quote.sections.flatMap(s => s.items)
    const invoiceItems = Object.entries(selections)
      .map(([itemId, qty]) => {
        const item = allItems.find(i => i.id === itemId)
        if (!item || !qty) return null
        return {
          description: item.title,
          quantity: qty,
          unit_price: item.unit_price,
          total: item.unit_price * qty,
        }
      })
      .filter(Boolean) as { description: string; quantity: number; unit_price: number; total: number }[]

    if (invoiceItems.length === 0) {
      toast.error(isDE ? 'Keine Positionen ausgewählt' : 'No items selected')
      setConvertingId(null)
      return
    }

    const autoNumber = `INV-${Date.now().toString().slice(-6)}`
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        photographer_id: photographerId,
        project_id: quote.project_id,
        amount: response.total_amount,
        subtotal: response.subtotal,
        tax_amount: response.tax_amount,
        tax_rate: quote.tax_rate,
        tax_status: quote.tax_status,
        currency: 'eur',
        status: 'draft',
        invoice_number: autoNumber,
        verwendungszweck: autoNumber,
        description: quote.title,
        notes: quote.notes,
      })
      .select('id')
      .single()

    if (error || !invoice) { toast.error(isDE ? 'Fehler' : 'Error'); setConvertingId(null); return }

    // Insert invoice items
    await supabase.from('invoice_items').insert(
      invoiceItems.map((it, idx) => ({
        invoice_id: invoice.id,
        position: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.total,
      }))
    )

    // Mark response as converted
    await supabase.from('quote_responses').update({ converted_invoice_id: invoice.id }).eq('id', response.id)
    setQuotes(prev => prev.map(q => q.id === quote.id ? {
      ...q,
      responses: q.responses?.map(r => r.id === response.id ? { ...r, converted_invoice_id: invoice.id } : r),
    } : q))
    setConvertingId(null)
    toast.success(isDE ? `Rechnung ${autoNumber} erstellt!` : `Invoice ${autoNumber} created!`)
  }

  const getClientName = (q: Quote) => {
    if (!q.project) return '—'
    const c = q.project.client
    if (!c) return q.project.title
    if (Array.isArray(c)) return c[0]?.full_name || q.project.title
    return c.full_name || q.project.title
  }

  const totalAccepted = quotes.filter(q => q.status === 'accepted').reduce((s, q) => {
    const last = q.responses?.[q.responses.length - 1]
    return s + (last?.total_amount || 0)
  }, 0)
  const pendingCount = quotes.filter(q => q.status === 'sent').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <div>
          <h1 className="font-black" style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            {isDE ? 'Angebote' : 'Quotes'}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {isDE ? 'Interaktive Preisangebote für deine Kunden' : 'Interactive price quotes for your clients'}
          </p>
        </div>
        {activeTab === 'quotes' ? (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
            style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            {isDE ? 'Neues Angebot' : 'New Quote'}
          </button>
        ) : (
          <button
            onClick={openNewTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
            style={{ background: '#C4A47C', boxShadow: '0 1px 8px rgba(196,164,124,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            {isDE ? 'Neue Vorlage' : 'New Template'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-hover)' }}>
        {([['quotes', isDE ? 'Angebote' : 'Quotes'], ['templates', isDE ? 'Vorlagen' : 'Templates']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
            style={activeTab === tab ? {
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            } : { color: 'var(--text-muted)' }}
          >
            {label}
            {tab === 'templates' && templates.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(196,164,124,0.2)', color: '#C4A47C' }}>
                {templates.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Templates tab ── */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {templates.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-24 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(196,164,124,0.12)' }}>
                <FileText className="w-7 h-7" style={{ color: '#C4A47C' }} />
              </div>
              <h3 className="font-black mb-2" style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                {isDE ? 'Noch keine Vorlagen' : 'No templates yet'}
              </h3>
              <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                {isDE ? 'Erstelle eine Vorlage und nutze sie für neue Angebote' : 'Create a template and reuse it for new quotes'}
              </p>
              <button onClick={openNewTemplate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white" style={{ background: '#C4A47C' }}>
                <Plus className="w-4 h-4" />
                {isDE ? 'Vorlage erstellen' : 'Create template'}
              </button>
            </div>
          ) : templates.map(tpl => (
            <div key={tpl.id} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,164,124,0.12)' }}>
                  <FileText className="w-4 h-4" style={{ color: '#C4A47C' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>{tpl.title}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {tpl.sections.length} {isDE ? 'Sektionen' : 'sections'} · {tpl.sections.reduce((s, sec) => s + sec.items.length, 0)} {isDE ? 'Positionen' : 'items'}
                    {tpl.notes && ` · ${tpl.notes.slice(0, 40)}${tpl.notes.length > 40 ? '…' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Use template */}
                  <button
                    onClick={() => { applyTemplate(tpl); setShowNew(true); setActiveTab('quotes') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-88"
                    style={{ background: 'rgba(196,164,124,0.15)', color: '#C4A47C', border: '1px solid rgba(196,164,124,0.3)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isDE ? 'Verwenden' : 'Use'}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEditTemplate(tpl)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title={isDE ? 'Bearbeiten' : 'Edit'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => deleteTemplate(tpl.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,64,48,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title={isDE ? 'Löschen' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats + Quote list */}
      {activeTab === 'quotes' && <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: isDE ? 'Angenommen' : 'Accepted', value: formatEur(totalAccepted), color: '#2A9B68', icon: CheckCircle2 },
          { label: isDE ? 'Offen' : 'Pending', value: `${pendingCount}`, color: '#CC8415', icon: Clock },
          { label: isDE ? 'Gesamt' : 'Total', value: `${quotes.length}`, color: '#6B7280', icon: FileText },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: `1px solid ${color}20`, boxShadow: `0 2px 12px ${color}10` }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="font-black tabular-nums text-[22px] leading-none" style={{ color, letterSpacing: '-0.03em' }}>{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Quote list */}
      <div className="space-y-3">
        {quotes.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center justify-center py-24 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <FileText className="w-7 h-7" style={{ color: '#F97316' }} />
            </div>
            <h3 className="font-black mb-2" style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {isDE ? 'Noch keine Angebote' : 'No quotes yet'}
            </h3>
            <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              {isDE ? 'Erstelle dein erstes interaktives Angebot' : 'Create your first interactive quote'}
            </p>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white" style={{ background: '#F97316' }}>
              <Plus className="w-4 h-4" />
              {isDE ? 'Angebot erstellen' : 'Create quote'}
            </button>
          </div>
        ) : quotes.map(q => {
          const cfg = STATUS_CONFIG[q.status]
          const StatusIcon = cfg.icon
          const lastResponse = q.responses?.[0]
          const hasResponse = (q.responses?.length || 0) > 0

          return (
            <div key={q.id} className="glass-card p-4">
              {/* Top row: icon + info + menu */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                  <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] leading-snug" style={{ color: 'var(--text-primary)' }}>{q.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                      {isDE ? cfg.labelDe : cfg.label}
                    </span>
                    {hasResponse && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(42,155,104,0.12)', color: '#2A9B68' }}>
                        {q.responses!.length} {isDE ? 'Antwort(en)' : 'response(s)'}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-1.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {getClientName(q)}
                    {q.valid_until && ` · ${isDE ? 'Gültig bis' : 'Valid until'} ${new Date(q.valid_until).toLocaleDateString('de-DE')}`}
                    {` · ${q.sections.length} ${isDE ? 'Sektionen' : 'sections'}, ${q.sections.reduce((s, sec) => s + sec.items.length, 0)} ${isDE ? 'Positionen' : 'items'}`}
                  </p>
                </div>

                {/* Menu only in top-right */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === q.id ? null : q.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                    {openMenu === q.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                        <div className="dropdown-glass absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 min-w-[180px]">
                          {q.status !== 'sent' && (
                            <button onClick={() => updateStatus(q.id, 'sent')} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors" style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <Send className="w-3.5 h-3.5" style={{ color: '#CC8415' }} />
                              {isDE ? 'Als gesendet markieren' : 'Mark as sent'}
                            </button>
                          )}
                          {q.status !== 'accepted' && (
                            <button onClick={() => updateStatus(q.id, 'accepted')} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors" style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2A9B68' }} />
                              {isDE ? 'Als angenommen markieren' : 'Mark as accepted'}
                            </button>
                          )}
                          <div style={{ borderTop: '1px solid var(--border-color)' }} />
                          <button onClick={() => deleteQuote(q.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors" style={{ color: '#C43B2C' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDE ? 'Löschen' : 'Delete'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              {/* Bottom actions row */}
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => copyLink(q.client_token)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                  title={isDE ? 'Link kopieren' : 'Copy link'}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isDE ? 'Link' : 'Link'}</span>
                </button>
                <a
                  href={`/q/${q.client_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                  title={isDE ? 'Vorschau' : 'Preview'}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isDE ? 'Vorschau' : 'Preview'}</span>
                </a>
                {hasResponse && (
                  <button
                    onClick={() => setPreviewQuote(previewQuote?.id === q.id ? null : q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-88"
                    style={{ background: 'rgba(42,155,104,0.10)', color: '#2A9B68', border: '1px solid rgba(42,155,104,0.25)' }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isDE ? 'Antworten' : 'Responses'}
                  </button>
                )}
              </div>

              {/* Responses panel */}
              {previewQuote?.id === q.id && q.responses && q.responses.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                    {isDE ? 'Kundenantworten' : 'Client responses'}
                  </p>
                  <div className="space-y-2">
                    {q.responses.map(resp => (
                      <div key={resp.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                            {resp.client_name || (isDE ? 'Unbekannter Kunde' : 'Unknown client')}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {resp.client_email || '—'} · {new Date(resp.submitted_at).toLocaleDateString('de-DE')} · {formatEur(resp.total_amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const w = window.open('', '_blank')
                            if (w) { w.document.write(buildQuoteResponseHtml(q, resp, photographer, q.tax_status === 'none')); w.document.close() }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                          title={isDE ? 'PDF herunterladen' : 'Download PDF'}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        {resp.converted_invoice_id ? (
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(42,155,104,0.12)', color: '#2A9B68' }}>
                            {isDE ? '✓ Rechnung erstellt' : '✓ Invoice created'}
                          </span>
                        ) : (
                          <button
                            onClick={() => convertToInvoice(q, resp)}
                            disabled={convertingId === resp.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-88 disabled:opacity-50"
                            style={{ background: '#F97316' }}
                          >
                            {convertingId === resp.id
                              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              : <Receipt className="w-3.5 h-3.5" />}
                            {isDE ? 'In Rechnung' : 'To Invoice'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </>}

      {/* ── New Quote Modal ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {isDE ? 'Neues Angebot' : 'New Quote'}
              </h2>
              <button onClick={() => setShowNew(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-6">
              {/* Von Vorlage */}
              {templates.length > 0 && (
                <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(196,164,124,0.08)', border: '1px solid rgba(196,164,124,0.2)' }}>
                  <span className="text-[12px] font-bold flex-shrink-0" style={{ color: '#C4A47C' }}>
                    {isDE ? 'Von Vorlage:' : 'From template:'}
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all hover:opacity-80"
                        style={{ background: 'rgba(196,164,124,0.15)', color: '#C4A47C', border: '1px solid rgba(196,164,124,0.25)' }}
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {isDE ? 'Titel *' : 'Title *'}
                  </label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder={isDE ? 'z.B. Hochzeitspaket 2026' : 'e.g. Wedding Package 2026'} className="input-base w-full" autoFocus />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {isDE ? 'Projekt' : 'Project'}
                  </label>
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="input-base w-full" style={{ color: form.project_id ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <option value="">{isDE ? 'Kein Projekt' : 'No project'}</option>
                    {projects.map(p => {
                      const c = p.client
                      const name = Array.isArray(c) ? c[0]?.full_name : (c as { full_name?: string } | null)?.full_name
                      return <option key={p.id} value={p.id}>{p.title}{name ? ` — ${name}` : ''}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {isDE ? 'Gültig bis' : 'Valid until'}
                  </label>
                  <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className="input-base w-full" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {isDE ? 'Steuerart' : 'Tax'}
                  </label>
                  <select
                    value={form.tax_status}
                    onChange={e => {
                      const v = e.target.value as typeof form.tax_status
                      setForm(f => ({
                        ...f,
                        tax_status: v,
                        tax_rate: v === 'vat_19' ? 19 : v === 'vat_7' ? 7 : 0,
                      }))
                    }}
                    className="input-base w-full"
                  >
                    <option value="kleinunternehmer">{isDE ? 'Kleinunternehmer (§19)' : 'Small business (§19)'}</option>
                    <option value="vat_19">{isDE ? '19% MwSt' : '19% VAT'}</option>
                    <option value="vat_7">{isDE ? '7% MwSt' : '7% VAT'}</option>
                    <option value="none">{isDE ? 'Keine Angabe' : 'No mention'}</option>
                  </select>
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-primary)' }}>
                    {isDE ? `Sektionen (${sections.length})` : `Sections (${sections.length})`}
                  </label>
                  <button type="button" onClick={addSection} className="flex items-center gap-1.5 text-[12px] font-bold transition-colors" style={{ color: 'var(--accent)' }}>
                    <Plus className="w-3.5 h-3.5" />
                    {isDE ? 'Sektion' : 'Section'}
                  </button>
                </div>

                <div className="space-y-4">
                  {sections.map((sec, si) => {
                    const SectionIcon = SECTION_TYPE_ICONS[sec.type]
                    return (
                      <div key={sec._tempId} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                          <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            value={sec.title}
                            onChange={e => updateSection(sec._tempId, { title: e.target.value })}
                            placeholder={isDE ? `Sektion ${si + 1}` : `Section ${si + 1}`}
                            className="flex-1 bg-transparent text-[13px] font-bold outline-none"
                            style={{ color: 'var(--text-primary)' }}
                          />
                          {/* Type selector */}
                          <select
                            value={sec.type}
                            onChange={e => updateSection(sec._tempId, { type: e.target.value as SectionType })}
                            className="text-[11px] font-bold px-2 py-1 rounded-lg outline-none"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                          >
                            <option value="fixed">{isDE ? 'Inklusive (fest)' : 'Fixed (included)'}</option>
                            <option value="single_choice">{isDE ? 'Einfachauswahl' : 'Single choice'}</option>
                            <option value="multiple_choice">{isDE ? 'Extra Leistungen' : 'Extra services'}</option>
                          </select>
                          {/* Required toggle */}
                          <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                            <div onClick={() => updateSection(sec._tempId, { required: !sec.required })} className="relative rounded-full cursor-pointer"
                              style={{ width: '28px', height: '16px', background: sec.required ? '#F97316' : 'var(--border-strong)', transition: 'background 150ms' }}>
                              <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow" style={{ left: sec.required ? '13px' : '2px', transition: 'left 150ms' }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{isDE ? 'Pflicht' : 'Req.'}</span>
                          </label>
                          <button type="button" onClick={() => removeSection(sec._tempId)} disabled={sections.length <= 1} className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-20" style={{ color: '#C43B2C' }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Items */}
                        <div className="p-3 space-y-2">
                          {sec.items.map(item => (
                            <div key={item._tempId} className="grid items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', gridTemplateColumns: '1fr 90px 80px 56px auto' }}>
                              <input
                                type="text"
                                value={item.title}
                                onChange={e => updateItem(sec._tempId, item._tempId, { title: e.target.value })}
                                placeholder={isDE ? 'Bezeichnung' : 'Title'}
                                className="text-[12px] bg-transparent outline-none min-w-0"
                                style={{ color: 'var(--text-primary)' }}
                              />
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={e => updateItem(sec._tempId, item._tempId, { description: e.target.value || null })}
                                placeholder={isDE ? 'Beschreibung' : 'Description'}
                                className="text-[11px] bg-transparent outline-none min-w-0"
                                style={{ color: 'var(--text-muted)' }}
                              />
                              {/* Price */}
                              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                                <span className="px-1.5 text-[11px] font-bold select-none flex-shrink-0" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>€</span>
                                <input
                                  type="number"
                                  value={item.unit_price || ''}
                                  onChange={e => updateItem(sec._tempId, item._tempId, { unit_price: Math.round(parseFloat(e.target.value) || 0) })}
                                  min="0" step="1" placeholder="0"
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[12px] bg-transparent outline-none text-right"
                                  style={{ color: 'var(--text-primary)' }}
                                />
                              </div>
                              {/* Quantity */}
                              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                                <span className="px-1.5 text-[11px] font-bold select-none flex-shrink-0" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>×</span>
                                <input
                                  type="number"
                                  value={item.default_qty}
                                  onChange={e => {
                                    const qty = Math.max(1, Math.round(parseInt(e.target.value) || 1))
                                    updateItem(sec._tempId, item._tempId, { default_qty: qty, editable_qty: qty > 1 })
                                  }}
                                  min="1" step="1"
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[12px] bg-transparent outline-none text-right"
                                  style={{ color: 'var(--text-primary)' }}
                                />
                              </div>
                              <button type="button" onClick={() => removeItem(sec._tempId, item._tempId)} disabled={sec.items.length <= 1} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-20" style={{ color: '#C43B2C' }}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => addItem(sec._tempId)} className="flex items-center gap-1 text-[11px] font-bold mt-1" style={{ color: 'var(--accent)' }}>
                            <Plus className="w-3 h-3" />
                            {isDE ? 'Position' : 'Item'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {isDE ? 'Anmerkungen' : 'Notes'}
                </label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-base w-full resize-none" placeholder={isDE ? 'Hinweise für den Kunden...' : 'Notes for the client...'} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">
                  {isDE ? 'Abbrechen' : 'Cancel'}
                </button>
                <button type="submit" disabled={saving} className="btn-shimmer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50" style={{ background: '#F97316' }}>
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Plus className="w-4 h-4" />{isDE ? 'Angebot erstellen' : 'Create Quote'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Template Builder Modal ── */}
      {showNewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {editingTemplate ? (isDE ? 'Vorlage bearbeiten' : 'Edit Template') : (isDE ? 'Neue Vorlage' : 'New Template')}
              </h2>
              <button onClick={() => { setShowNewTemplate(false); setEditingTemplate(null) }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-6">
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {isDE ? 'Name der Vorlage *' : 'Template name *'}
                </label>
                <input type="text" value={templateForm.title} onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))} required
                  placeholder={isDE ? 'z.B. Hochzeitspaket Standard' : 'e.g. Wedding Package Standard'}
                  className="input-base w-full" autoFocus />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {isDE ? 'Notiz (intern)' : 'Note (internal)'}
                </label>
                <input type="text" value={templateForm.notes} onChange={e => setTemplateForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={isDE ? 'Optional' : 'Optional'}
                  className="input-base w-full" />
              </div>

              {/* Sections builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-primary)' }}>
                    {isDE ? 'Sektionen' : 'Sections'}
                  </label>
                  <button type="button" onClick={addTemplateSection} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold transition-colors"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    <Plus className="w-3 h-3" />
                    {isDE ? 'Sektion' : 'Section'}
                  </button>
                </div>
                <div className="space-y-3">
                  {templateSections.map((sec, si) => (
                    <div key={sec._tempId} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <input type="text" value={sec.title} onChange={e => updateTemplateSection(sec._tempId, { title: e.target.value })}
                          placeholder={isDE ? 'Sektionsname' : 'Section name'} className="input-base flex-1 text-sm" />
                        <select value={sec.type} onChange={e => updateTemplateSection(sec._tempId, { type: e.target.value as SectionType })} className="input-base text-sm" style={{ width: 160 }}>
                          <option value="fixed">{isDE ? 'Fest' : 'Fixed'}</option>
                          <option value="single_choice">{isDE ? 'Einzelauswahl' : 'Single choice'}</option>
                          <option value="multiple_choice">{isDE ? 'Extra Leistungen' : 'Extra services'}</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] font-semibold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          <input type="checkbox" checked={sec.required} onChange={e => updateTemplateSection(sec._tempId, { required: e.target.checked })} style={{ accentColor: '#C4A47C' }} />
                          {isDE ? 'Pflicht' : 'Req.'}
                        </label>
                        {templateSections.length > 1 && (
                          <button type="button" onClick={() => removeTemplateSection(sec._tempId)} className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ color: '#C94030' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,64,48,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 pl-6">
                        {sec.items.map((it) => (
                          <div key={it._tempId} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 110px 80px 56px auto' }}>
                            <input type="text" value={it.title} onChange={e => updateTemplateItem(sec._tempId, it._tempId, { title: e.target.value })}
                              placeholder={isDE ? 'Position' : 'Item'} className="input-base text-sm min-w-0" />
                            <input type="text" value={it.description || ''} onChange={e => updateTemplateItem(sec._tempId, it._tempId, { description: e.target.value || null })}
                              placeholder={isDE ? 'Beschreibung' : 'Description'} className="input-base text-sm min-w-0" />
                            {/* Price */}
                            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                              <span className="px-1.5 text-[11px] font-bold select-none flex-shrink-0" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>€</span>
                              <input type="number" min={0} step={1} value={Math.round(it.unit_price / 100)}
                                onChange={e => updateTemplateItem(sec._tempId, it._tempId, { unit_price: Math.round(parseFloat(e.target.value || '0')) * 100 })}
                                className="flex-1 min-w-0 px-1.5 py-1 text-[12px] bg-transparent outline-none text-right" style={{ color: 'var(--text-primary)' }} />
                            </div>
                            {/* Quantity */}
                            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                              <span className="px-1.5 text-[11px] font-bold select-none flex-shrink-0" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>×</span>
                              <input type="number" min={1} step={1} value={it.default_qty}
                                onChange={e => {
                                  const qty = Math.max(1, Math.round(parseInt(e.target.value) || 1))
                                  updateTemplateItem(sec._tempId, it._tempId, { default_qty: qty, editable_qty: qty > 1 })
                                }}
                                className="flex-1 min-w-0 px-1.5 py-1 text-[12px] bg-transparent outline-none text-right" style={{ color: 'var(--text-primary)' }} />
                            </div>
                            {sec.items.length > 1 && (
                              <button type="button" onClick={() => removeTemplateItem(sec._tempId, it._tempId)} className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ color: '#C94030' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,64,48,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addTemplateItem(sec._tempId)} className="flex items-center gap-1 text-[11.5px] font-semibold mt-1"
                          style={{ color: 'var(--text-muted)' }}>
                          <Plus className="w-3 h-3" />
                          {isDE ? 'Position hinzufügen' : 'Add item'}
                        </button>
                      </div>
                      <p className="text-[11px] pl-6" style={{ color: 'var(--text-muted)' }}>
                        {isDE ? `Sektion ${si + 1}` : `Section ${si + 1}`} · {sec.items.length} {isDE ? 'Positionen' : 'items'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNewTemplate(false); setEditingTemplate(null) }} className="btn-secondary flex-1">
                  {isDE ? 'Abbrechen' : 'Cancel'}
                </button>
                <button type="submit" disabled={savingTemplate} className="btn-shimmer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50" style={{ background: '#C4A47C' }}>
                  {savingTemplate
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Plus className="w-4 h-4" />{editingTemplate ? (isDE ? 'Speichern' : 'Save') : (isDE ? 'Vorlage erstellen' : 'Create Template')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
