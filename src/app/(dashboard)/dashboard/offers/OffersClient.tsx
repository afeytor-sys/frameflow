'use client'

import { useState, useCallback } from 'react'
import {
  Plus, Send, CheckCircle2, Clock, XCircle, FileEdit,
  Trash2, Copy, ExternalLink, ChevronRight, Eye, X,
  Check, ArrowLeft, ArrowRight, Sparkles, Link2,
  GripVertical, ToggleLeft, ToggleRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'
import { OFFER_TEMPLATES, OfferTemplate } from '@/lib/offerTemplates'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  full_name: string
  email: string | null
}

interface OfferService {
  id?: string
  title: string
  description?: string | null
  included: boolean
  price?: number | null
  sort_order: number
}

interface OfferExtra {
  id?: string
  title: string
  description?: string | null
  price: number
  selectable: boolean
  sort_order: number
}

interface GalleryLink {
  label: string
  url: string
}

interface Offer {
  id: string
  title: string
  slug: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired' | 'declined'
  event_date: string | null
  valid_until: string | null
  base_price: number
  currency: string
  deposit_amount: number | null
  intro_text: string | null
  notes: string | null
  gallery_links: GalleryLink[]
  created_at: string
  client?: { id: string; full_name: string; email: string | null } | { id: string; full_name: string; email: string | null }[] | null
  services?: OfferService[]
  extras?: OfferExtra[]
}

interface Photographer {
  id: string
  full_name: string | null
  studio_name: string | null
  logo_url: string | null
  email: string | null
}

interface Props {
  initialOffers: Offer[]
  clients: Client[]
  photographer: Photographer | null
}

// ── Builder state types ───────────────────────────────────────────────────────

interface BuilderService {
  _id: string
  title: string
  description: string
  included: boolean
  price: string
}

interface BuilderExtra {
  _id: string
  title: string
  description: string
  price: string
}

interface BuilderLink {
  _id: string
  label: string
  url: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function parsePriceCents(val: string): number {
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function getClientName(offer: Offer): string | null {
  if (!offer.client) return null
  const c = Array.isArray(offer.client) ? offer.client[0] : offer.client
  return c?.full_name || null
}

function getSiteUrl() {
  return typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com')
}

function uid() { return Math.random().toString(36).slice(2, 10) }

const STATUS_CONFIG = {
  draft:    { label: 'Entwurf',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', Icon: FileEdit },
  sent:     { label: 'Versendet',  color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  Icon: Send },
  viewed:   { label: 'Angesehen',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  Icon: Eye },
  accepted: { label: 'Angenommen', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  Icon: CheckCircle2 },
  expired:  { label: 'Abgelaufen', color: '#F97316', bg: 'rgba(249,115,22,0.12)',  Icon: Clock },
  declined: { label: 'Abgelehnt',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   Icon: XCircle },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OffersClient({ initialOffers, clients, photographer }: Props) {
  const locale = useLocale()
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const [tab, setTab] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'expired'>('all')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // ── Builder form state ─────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', clientId: '', eventDate: '', validUntil: '',
    basePrice: '', depositAmount: '', introText: '',
  })
  const [services, setServices] = useState<BuilderService[]>([])
  const [extras, setExtras] = useState<BuilderExtra[]>([])
  const [links, setLinks] = useState<BuilderLink[]>([])

  // ── Open builder ───────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingOffer(null)
    setStep(1)
    setSelectedTemplate(null)
    setForm({ title: '', clientId: '', eventDate: '', validUntil: '', basePrice: '', depositAmount: '', introText: '' })
    setServices([])
    setExtras([])
    setLinks([])
    setShowBuilder(true)
  }

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer)
    setStep(1)
    setSelectedTemplate(null)
    const clientId = offer.client
      ? (Array.isArray(offer.client) ? offer.client[0]?.id : offer.client?.id) || ''
      : ''
    setForm({
      title: offer.title,
      clientId,
      eventDate: offer.event_date || '',
      validUntil: offer.valid_until || '',
      basePrice: offer.base_price ? (offer.base_price / 100).toFixed(2) : '',
      depositAmount: offer.deposit_amount ? (offer.deposit_amount / 100).toFixed(2) : '',
      introText: offer.intro_text || '',
    })
    setServices((offer.services || []).map(s => ({
      _id: uid(),
      title: s.title,
      description: s.description || '',
      included: s.included,
      price: s.price ? (s.price / 100).toFixed(2) : '',
    })))
    setExtras((offer.extras || []).map(e => ({
      _id: uid(),
      title: e.title,
      description: e.description || '',
      price: e.price ? (e.price / 100).toFixed(2) : '',
    })))
    setLinks((offer.gallery_links || []).map(l => ({ _id: uid(), label: l.label, url: l.url })))
    setShowBuilder(true)
  }

  // ── Apply template ─────────────────────────────────────────────────────────
  const applyTemplate = useCallback((tpl: OfferTemplate) => {
    setSelectedTemplate(tpl.id)
    setForm(prev => ({
      ...prev,
      introText: prev.introText || tpl.introText,
      basePrice: prev.basePrice || (tpl.basePrice / 100).toFixed(2),
    }))
    setServices(tpl.services.map(s => ({
      _id: uid(),
      title: s.title,
      description: s.description || '',
      included: s.included,
      price: '',
    })))
    setExtras(tpl.extras.map(e => ({
      _id: uid(),
      title: e.title,
      description: '',
      price: e.price ? (e.price / 100).toFixed(2) : '',
    })))
  }, [])

  // ── Service helpers ────────────────────────────────────────────────────────
  const addService = () => setServices(prev => [...prev, { _id: uid(), title: '', description: '', included: true, price: '' }])
  const removeService = (id: string) => setServices(prev => prev.filter(s => s._id !== id))
  const updateService = useCallback((id: string, patch: Partial<BuilderService>) =>
    setServices(prev => prev.map(s => s._id === id ? { ...s, ...patch } : s)), [])

  // ── Extra helpers ──────────────────────────────────────────────────────────
  const addExtra = () => setExtras(prev => [...prev, { _id: uid(), title: '', description: '', price: '' }])
  const removeExtra = (id: string) => setExtras(prev => prev.filter(e => e._id !== id))
  const updateExtra = useCallback((id: string, patch: Partial<BuilderExtra>) =>
    setExtras(prev => prev.map(e => e._id === id ? { ...e, ...patch } : e)), [])

  // ── Link helpers ───────────────────────────────────────────────────────────
  const addLink = () => setLinks(prev => [...prev, { _id: uid(), label: '', url: '' }])
  const removeLink = (id: string) => setLinks(prev => prev.filter(l => l._id !== id))
  const updateLink = useCallback((id: string, patch: Partial<BuilderLink>) =>
    setLinks(prev => prev.map(l => l._id === id ? { ...l, ...patch } : l)), [])

  // ── Save offer ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Bitte Titel eingeben'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        client_id: form.clientId || null,
        event_date: form.eventDate || null,
        valid_until: form.validUntil || null,
        base_price: parsePriceCents(form.basePrice),
        deposit_amount: form.depositAmount ? parsePriceCents(form.depositAmount) : null,
        intro_text: form.introText.trim() || null,
        gallery_links: links.filter(l => l.url.trim()).map(l => ({ label: l.label, url: l.url })),
        services: services.filter(s => s.title.trim()).map(s => ({
          title: s.title.trim(),
          description: s.description.trim() || null,
          included: s.included,
          price: s.price ? parsePriceCents(s.price) : null,
        })),
        extras: extras.filter(e => e.title.trim()).map(e => ({
          title: e.title.trim(),
          description: e.description.trim() || null,
          price: parsePriceCents(e.price),
          selectable: true,
        })),
      }

      if (editingOffer) {
        const res = await fetch(`/api/offers/${editingOffer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { toast.error('Fehler beim Speichern'); return }

        setOffers(prev => prev.map(o => o.id !== editingOffer.id ? o : {
          ...o, ...payload,
          client: clients.find(c => c.id === payload.client_id) || o.client,
          services: services.filter(s => s.title.trim()).map((s, i) => ({ title: s.title, description: s.description || null, included: s.included, price: s.price ? parsePriceCents(s.price) : null, sort_order: i })),
          extras: extras.filter(e => e.title.trim()).map((e, i) => ({ title: e.title, description: e.description || null, price: parsePriceCents(e.price), selectable: true, sort_order: i })),
          gallery_links: links.filter(l => l.url.trim()).map(l => ({ label: l.label, url: l.url })),
        }))
        toast.success('Angebot gespeichert')
      } else {
        const res = await fetch('/api/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { toast.error('Fehler beim Erstellen'); return }
        const { id, slug } = await res.json()
        const newOffer: Offer = {
          id, slug, status: 'draft', created_at: new Date().toISOString(),
          currency: 'EUR', notes: null, ...payload,
          client: clients.find(c => c.id === payload.client_id) || null,
          services: services.filter(s => s.title.trim()).map((s, i) => ({ title: s.title, description: s.description || null, included: s.included, price: s.price ? parsePriceCents(s.price) : null, sort_order: i })),
          extras: extras.filter(e => e.title.trim()).map((e, i) => ({ title: e.title, description: e.description || null, price: parsePriceCents(e.price), selectable: true, sort_order: i })),
        }
        setOffers(prev => [newOffer, ...prev])
        toast.success('Angebot erstellt')
      }
      setShowBuilder(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Angebot löschen?')) return
    const res = await fetch(`/api/offers/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Fehler beim Löschen'); return }
    setOffers(prev => prev.filter(o => o.id !== id))
    toast.success('Gelöscht')
  }

  // ── Status change ──────────────────────────────────────────────────────────
  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/offers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Fehler'); return }
    setOffers(prev => prev.map(o => o.id === id ? { ...o, status: status as Offer['status'] } : o))
    setOpenMenu(null)
  }

  // ── Copy share link ────────────────────────────────────────────────────────
  const copyLink = (slug: string) => {
    const url = `${getSiteUrl()}/a/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link kopiert')
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = offers.filter(o => {
    if (tab === 'all') return true
    if (tab === 'sent') return o.status === 'sent' || o.status === 'viewed'
    return o.status === tab
  })

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'all',      label: 'Alle' },
    { key: 'draft',    label: 'Entwurf' },
    { key: 'sent',     label: 'Versendet' },
    { key: 'accepted', label: 'Angenommen' },
    { key: 'expired',  label: 'Abgelaufen' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>Angebote</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Interaktive Proposals für deine Kunden
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #C4A47C, #B8956A)' }}
        >
          <Plus className="w-4 h-4" />
          Neues Angebot
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-hover)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={tab === t.key
              ? { background: 'var(--bg-card)', color: '#C4A47C', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: 'var(--text-muted)' }
            }
          >
            {t.label}
            {t.key !== 'all' && <span className="ml-1.5 opacity-60">{offers.filter(o => t.key === 'sent' ? o.status === 'sent' || o.status === 'viewed' : o.status === t.key).length}</span>}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(196,164,124,0.12)' }}>
            <Sparkles className="w-6 h-6" style={{ color: '#C4A47C' }} />
          </div>
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {tab === 'all' ? 'Noch keine Angebote' : 'Keine Angebote hier'}
          </p>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {tab === 'all' ? 'Erstelle dein erstes interaktives Proposal' : ''}
          </p>
          {tab === 'all' && (
            <button
              onClick={openNew}
              className="mt-4 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #C4A47C, #B8956A)' }}
            >
              + Neues Angebot
            </button>
          )}
        </div>
      )}

      {/* Offer cards */}
      <div className="space-y-3">
        {filtered.map(offer => {
          const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft
          const StatusIcon = cfg.Icon
          const clientName = getClientName(offer)

          return (
            <div
              key={offer.id}
              className="rounded-2xl p-4 transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-start gap-3">
                {/* Status dot */}
                <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: cfg.color }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{offer.title}</p>
                      {clientName && <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{clientName}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {offer.event_date && (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        📅 {new Date(offer.event_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {offer.base_price > 0 && (
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatEur(offer.base_price)}
                      </span>
                    )}
                    {offer.valid_until && (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        Gültig bis {new Date(offer.valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => copyLink(offer.slug)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Link kopieren
                    </button>
                    <a
                      href={`/a/${offer.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Vorschau
                    </a>
                    {offer.status === 'draft' && (
                      <button
                        onClick={() => setStatus(offer.id, 'sent')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                        style={{ background: 'rgba(99,102,241,0.10)', color: '#6366F1' }}
                      >
                        <Send className="w-3.5 h-3.5" />
                        Versenden
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(offer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-hover)', color: '#EF4444' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Old quotes link */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
        <a href="/dashboard/quotes" className="text-[12px] flex items-center gap-1.5 w-fit hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>
          <ChevronRight className="w-3.5 h-3.5" />
          Kostenvoranschläge (klassisch)
        </a>
      </div>

      {/* ── Builder overlay ───────────────────────────────────────────────── */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-stretch" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="ml-auto w-full max-w-2xl flex flex-col" style={{ background: 'var(--bg-card)' }}>

            {/* Builder header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowBuilder(false)} className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editingOffer ? 'Angebot bearbeiten' : 'Neues Angebot'}
                </h2>
              </div>
              {/* Steps */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
                    style={step === n
                      ? { background: '#C4A47C', color: '#fff' }
                      : step > n
                        ? { background: 'rgba(196,164,124,0.2)', color: '#C4A47C' }
                        : { background: 'var(--bg-hover)', color: 'var(--text-muted)' }
                    }
                  >
                    {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                ))}
              </div>
            </div>

            {/* Builder body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Step 1: Basic info + template ─────────────────────────── */}
              {step === 1 && (
                <div className="p-6 space-y-5">
                  {/* Template picker */}
                  {!editingOffer && (
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>
                        Vorlage wählen
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setSelectedTemplate(null)
                            setServices([])
                            setExtras([])
                          }}
                          className="px-3 py-2.5 rounded-xl text-[12px] font-semibold text-left transition-all"
                          style={selectedTemplate === null
                            ? { background: 'rgba(196,164,124,0.15)', border: '1.5px solid #C4A47C', color: '#C4A47C' }
                            : { background: 'var(--bg-hover)', border: '1.5px solid transparent', color: 'var(--text-muted)' }
                          }
                        >
                          ✦ Leer starten
                        </button>
                        {OFFER_TEMPLATES.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => applyTemplate(tpl)}
                            className="px-3 py-2.5 rounded-xl text-[12px] font-semibold text-left transition-all"
                            style={selectedTemplate === tpl.id
                              ? { background: 'rgba(196,164,124,0.15)', border: '1.5px solid #C4A47C', color: '#C4A47C' }
                              : { background: 'var(--bg-hover)', border: '1.5px solid transparent', color: 'var(--text-muted)' }
                            }
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Titel *</label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="z. B. Angebot Hochzeit Meyer – Juni 2026"
                      className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    />
                  </div>

                  {/* Client */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Kunde</label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      value={form.clientId}
                      onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                    >
                      <option value="">— Kein Kunde verknüpft —</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Termin / Event</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.eventDate}
                        onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Gültig bis</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.validUntil}
                        onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Basispreis (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.basePrice}
                        onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Anzahlung (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.depositAmount}
                        onChange={e => setForm(p => ({ ...p, depositAmount: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Intro text */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Einleitungstext</label>
                    <textarea
                      rows={4}
                      placeholder="Persönliche Ansprache an den Kunden…"
                      className="w-full px-3 py-2.5 rounded-xl text-[14px] resize-none"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      value={form.introText}
                      onChange={e => setForm(p => ({ ...p, introText: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: Services + Extras ──────────────────────────────── */}
              {step === 2 && (
                <div className="p-6 space-y-6">

                  {/* Services */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Leistungen
                      </label>
                      <button onClick={addService} className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: '#C4A47C' }}>
                        <Plus className="w-3.5 h-3.5" /> Hinzufügen
                      </button>
                    </div>
                    {services.length === 0 && (
                      <p className="text-[13px] py-3" style={{ color: 'var(--text-muted)' }}>Noch keine Leistungen. Wähle eine Vorlage in Schritt 1 oder füge manuell hinzu.</p>
                    )}
                    <div className="space-y-2">
                      {services.map((svc) => (
                        <div key={svc._id} className="rounded-xl p-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateService(svc._id, { included: !svc.included })}
                              className="flex-shrink-0 transition-opacity hover:opacity-80"
                              title="In / Nicht enthalten"
                            >
                              {svc.included
                                ? <ToggleRight className="w-5 h-5" style={{ color: '#10B981' }} />
                                : <ToggleLeft className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                              }
                            </button>
                            <input
                              type="text"
                              placeholder="Leistung, z. B. 8h Reportage"
                              className="flex-1 px-2 py-1.5 rounded-lg text-[13px] font-medium"
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                              value={svc.title}
                              onChange={e => updateService(svc._id, { title: e.target.value })}
                            />
                            <button onClick={() => removeService(svc._id)} className="p-1 flex-shrink-0 hover:opacity-70" style={{ color: '#EF4444' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Kurze Beschreibung (optional)"
                            className="w-full mt-1 px-2 py-1 rounded-lg text-[12px]"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', outline: 'none' }}
                            value={svc.description}
                            onChange={e => updateService(svc._id, { description: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extras */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Extras (optional buchbar)
                      </label>
                      <button onClick={addExtra} className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: '#C4A47C' }}>
                        <Plus className="w-3.5 h-3.5" /> Hinzufügen
                      </button>
                    </div>
                    {extras.length === 0 && (
                      <p className="text-[13px] py-2" style={{ color: 'var(--text-muted)' }}>Keine Extras — der Kunde kann keine Zusatzleistungen wählen.</p>
                    )}
                    <div className="space-y-2">
                      {extras.map((ext) => (
                        <div key={ext._id} className="rounded-xl p-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Extra, z. B. Zweiter Fotograf"
                              className="flex-1 px-2 py-1.5 rounded-lg text-[13px] font-medium"
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                              value={ext.title}
                              onChange={e => updateExtra(ext._id, { title: e.target.value })}
                            />
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>+€</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                className="w-20 px-2 py-1.5 rounded-lg text-[13px] text-right"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                value={ext.price}
                                onChange={e => updateExtra(ext._id, { price: e.target.value })}
                              />
                            </div>
                            <button onClick={() => removeExtra(ext._id)} className="p-1 flex-shrink-0 hover:opacity-70" style={{ color: '#EF4444' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Kurze Beschreibung (optional)"
                            className="w-full mt-1 px-2 py-1 text-[12px]"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', outline: 'none' }}
                            value={ext.description}
                            onChange={e => updateExtra(ext._id, { description: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Gallery links + summary ───────────────────────── */}
              {step === 3 && (
                <div className="p-6 space-y-6">

                  {/* Gallery links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Links (Galerie-Beispiele, Instagram…)
                      </label>
                      <button onClick={addLink} className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: '#C4A47C' }}>
                        <Plus className="w-3.5 h-3.5" /> Link hinzufügen
                      </button>
                    </div>
                    <div className="space-y-2">
                      {links.map(lnk => (
                        <div key={lnk._id} className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                            <Link2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <input
                            type="text"
                            placeholder="Bezeichnung"
                            className="w-28 flex-shrink-0 px-3 py-2 rounded-lg text-[13px]"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={lnk.label}
                            onChange={e => updateLink(lnk._id, { label: e.target.value })}
                          />
                          <input
                            type="url"
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 rounded-lg text-[13px]"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={lnk.url}
                            onChange={e => updateLink(lnk._id, { url: e.target.value })}
                          />
                          <button onClick={() => removeLink(lnk._id)} className="p-1 flex-shrink-0 hover:opacity-70" style={{ color: '#EF4444' }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {links.length === 0 && (
                      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Optional — zeige dem Kunden Beispielgalerien oder Social-Links.</p>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Zusammenfassung</p>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{form.title || '–'}</p>
                    {form.clientId && <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{clients.find(c => c.id === form.clientId)?.full_name}</p>}
                    {form.eventDate && <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>📅 {new Date(form.eventDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                    {form.basePrice && <p className="text-[20px] font-black mt-2" style={{ color: '#C4A47C' }}>€ {parseFloat(form.basePrice).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>}
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {services.filter(s => s.title.trim()).length} Leistungen · {extras.filter(e => e.title.trim()).length} Extras · {links.filter(l => l.url.trim()).length} Links
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Builder footer */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : setShowBuilder(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 1 ? 'Abbrechen' : 'Zurück'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !form.title.trim()) { toast.error('Bitte Titel eingeben'); return }
                    setStep((step + 1) as 2 | 3)
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #C4A47C, #B8956A)' }}
                >
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #C4A47C, #B8956A)' }}
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Speichern…' : (editingOffer ? 'Speichern' : 'Angebot erstellen')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
