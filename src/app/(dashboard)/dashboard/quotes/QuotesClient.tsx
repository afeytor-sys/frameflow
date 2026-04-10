'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, FileText, Send, CheckCircle2, Clock, AlertCircle, X, Trash2,
  Eye, Copy, MoreHorizontal, ChevronDown, ChevronUp, GripVertical,
  ToggleLeft, CheckSquare, List, Pencil, ExternalLink, Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'

// ── Types ────────────────────────────────────────────────────────────────────
type SectionType = 'fixed' | 'single_choice' | 'multiple_choice'
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'expired'

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
  tax_status: 'kleinunternehmer' | 'vat_19' | 'vat_7'
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
  tax_status: 'kleinunternehmer' | 'vat_19' | 'vat_7' | null
  tax_rate: number | null
}

interface Props {
  quotes: Quote[]
  projects: Project[]
  photographerId: string
  photographer: Photographer | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://fotonizer.com'
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
export default function QuotesClient({ quotes: initial, projects, photographerId, photographer }: Props) {
  const locale = useLocale()
  const isDE = locale === 'de'
  const [quotes, setQuotes] = useState<Quote[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  // New quote form state
  const [form, setForm] = useState({ project_id: '', title: '', notes: '', valid_until: '' })
  const [sections, setSections] = useState<Array<Omit<QuoteSection, 'id' | 'quote_id'> & { _tempId: string; items: Array<Omit<QuoteItem, 'id' | 'section_id' | 'quote_id'> & { _tempId: string }> }>>([
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

    const taxStatus = photographer?.tax_status || 'kleinunternehmer'
    const taxRate = taxStatus === 'vat_19' ? 19 : taxStatus === 'vat_7' ? 7 : 0

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
    setForm({ project_id: '', title: '', notes: '', valid_until: '' })
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
      <div className="flex items-center justify-between mb-8 animate-in">
        <div>
          <h1 className="font-black" style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            {isDE ? 'Angebote' : 'Quotes'}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {isDE ? 'Interaktive Preisangebote für deine Kunden' : 'Interactive price quotes for your clients'}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
          style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          {isDE ? 'Neues Angebot' : 'New Quote'}
        </button>
      </div>

      {/* Stats */}
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                  <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>{q.title}</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                      {isDE ? cfg.labelDe : cfg.label}
                    </span>
                    {hasResponse && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(42,155,104,0.12)', color: '#2A9B68' }}>
                        {q.responses!.length} {isDE ? 'Antwort(en)' : 'response(s)'}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {getClientName(q)}
                    {q.valid_until && ` · ${isDE ? 'Gültig bis' : 'Valid until'} ${new Date(q.valid_until).toLocaleDateString('de-DE')}`}
                    {` · ${q.sections.length} ${isDE ? 'Sektionen' : 'sections'}, ${q.sections.reduce((s, sec) => s + sec.items.length, 0)} ${isDE ? 'Positionen' : 'items'}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => copyLink(q.client_token)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                    title={isDE ? 'Link kopieren' : 'Copy link'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`/q/${q.client_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                    title={isDE ? 'Vorschau' : 'Preview'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Responses dropdown */}
                  {hasResponse && (
                    <button
                      onClick={() => setPreviewQuote(previewQuote?.id === q.id ? null : q)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-88"
                      style={{ background: 'rgba(42,155,104,0.10)', color: '#2A9B68', border: '1px solid rgba(42,155,104,0.25)' }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isDE ? 'Antworten' : 'Responses'}
                    </button>
                  )}

                  {/* Menu */}
                  <div className="relative">
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
                            <option value="multiple_choice">{isDE ? 'Mehrfachauswahl' : 'Multiple choice'}</option>
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
                            <div key={item._tempId} className="grid items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', gridTemplateColumns: '1fr 100px 90px auto auto' }}>
                              <input
                                type="text"
                                value={item.title}
                                onChange={e => updateItem(sec._tempId, item._tempId, { title: e.target.value })}
                                placeholder={isDE ? 'Bezeichnung' : 'Title'}
                                className="text-[12px] bg-transparent outline-none"
                                style={{ color: 'var(--text-primary)' }}
                              />
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={e => updateItem(sec._tempId, item._tempId, { description: e.target.value || null })}
                                placeholder={isDE ? 'Beschreibung' : 'Description'}
                                className="text-[11px] bg-transparent outline-none"
                                style={{ color: 'var(--text-muted)' }}
                              />
                              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                                <span className="px-1.5 text-[11px] font-bold select-none" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>€</span>
                                <input
                                  type="number"
                                  value={item.unit_price || ''}
                                  onChange={e => updateItem(sec._tempId, item._tempId, { unit_price: parseFloat(e.target.value) || 0 })}
                                  min="0" step="0.01" placeholder="0"
                                  className="flex-1 px-1.5 py-1 text-[12px] bg-transparent outline-none text-right w-full"
                                  style={{ color: 'var(--text-primary)' }}
                                />
                              </div>
                              {/* Editable qty toggle */}
                              <label className="flex items-center gap-1 cursor-pointer" title={isDE ? 'Menge editierbar' : 'Editable qty'}>
                                <div onClick={() => updateItem(sec._tempId, item._tempId, { editable_qty: !item.editable_qty })} className="relative rounded-full cursor-pointer"
                                  style={{ width: '24px', height: '14px', background: item.editable_qty ? '#F97316' : 'var(--border-strong)', transition: 'background 150ms', flexShrink: 0 }}>
                                  <div className="absolute top-[1px] w-3 h-3 bg-white rounded-full shadow" style={{ left: item.editable_qty ? '11px' : '1px', transition: 'left 150ms' }} />
                                </div>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>×</span>
                              </label>
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

              {/* Tax info */}
              <div className="px-3 py-2 rounded-xl text-[12px]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {isDE ? 'Steuer' : 'Tax'}: {photographer?.tax_status === 'kleinunternehmer' ? '§19 UStG — 0%' : photographer?.tax_status === 'vat_19' ? '19% MwSt' : '7% MwSt'}
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
    </div>
  )
}
