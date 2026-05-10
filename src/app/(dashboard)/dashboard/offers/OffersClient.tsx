'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Plus, Send, CheckCircle2, Clock, XCircle, FileEdit, Trash2,
  Copy, ExternalLink, Eye, X, Check, Sparkles, Link2, ChevronDown,
  ArrowLeft, BookOpen, ToggleRight, ToggleLeft, Save, AlignLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'
import { OFFER_TEMPLATES, OfferTemplate } from '@/lib/offerTemplates'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client { id: string; full_name: string; email: string | null }

interface ServicePreset { id: string; title: string; description: string | null; price: number | null }

interface UserTemplate {
  id: string; name: string; intro_text: string | null; base_price: number | null
  services: { title: string; description?: string | null; included: boolean; price?: number | null }[]
  extras: { title: string; description?: string | null; price: number }[]
}

interface OfferService {
  id?: string; title: string; description?: string | null
  included: boolean; price?: number | null; sort_order: number
}
interface OfferExtra {
  id?: string; title: string; description?: string | null
  price: number; selectable: boolean; sort_order: number
}

// gallery_links holds both link-blocks and text-blocks as mixed JSONB
type GalleryItem =
  | { type: 'link'; label: string; description?: string; url: string; image_url?: string }
  | { type: 'text'; heading: string; content: string }
  // legacy items without type field
  | { label: string; url: string; description?: string; image_url?: string }

interface Offer {
  id: string; title: string; slug: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired' | 'declined'
  event_date: string | null; valid_until: string | null
  base_price: number; currency: string; deposit_amount: number | null
  intro_text: string | null; notes: string | null
  gallery_links: GalleryItem[]; created_at: string
  client?: { id: string; full_name: string; email: string | null } | { id: string; full_name: string; email: string | null }[] | null
  services?: OfferService[]; extras?: OfferExtra[]
}

interface Photographer {
  id: string; full_name: string | null; studio_name: string | null
  logo_url: string | null; email: string | null
}

interface Props {
  initialOffers: Offer[]; clients: Client[]
  photographer: Photographer | null
  initialServicePresets: ServicePreset[]
  initialExtraPresets: ServicePreset[]
  initialUserTemplates: UserTemplate[]
}

// ── Builder item types ────────────────────────────────────────────────────────

interface BService { _id: string; title: string; description: string; included: boolean; price: string }
interface BExtra  { _id: string; title: string; description: string; price: string }
interface BLink   { _id: string; label: string; description: string; url: string; image_url: string }
interface BTextBlock { _id: string; heading: string; content: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10)
const formatEur = (c: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(c / 100)
const parseCents = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 100) }
const getClientName = (o: Offer) => { if (!o.client) return null; const c = Array.isArray(o.client) ? o.client[0] : o.client; return c?.full_name || null }
const getSiteUrl = () => typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')

const STATUS_CFG = {
  draft:    { label: 'Entwurf',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', Icon: FileEdit },
  sent:     { label: 'Versendet',  color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  Icon: Send },
  viewed:   { label: 'Angesehen',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  Icon: Eye },
  accepted: { label: 'Angenommen', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  Icon: CheckCircle2 },
  expired:  { label: 'Abgelaufen', color: '#F97316', bg: 'rgba(249,115,22,0.12)',  Icon: Clock },
  declined: { label: 'Abgelehnt',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   Icon: XCircle },
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ label, count, actions, children, defaultOpen = true }: {
  label: string; count?: number; actions?: React.ReactNode
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E8E4DC', overflow: 'hidden', marginBottom: '10px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <ChevronDown style={{ width: 15, height: 15, color: '#B5ADA3', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B5ADA3' }}>{label}</span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#C4A47C', background: 'rgba(196,164,124,0.12)', borderRadius: '100px', padding: '1px 7px' }}>{count}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      </div>
      {open && <div style={{ padding: '2px 20px 20px' }}>{children}</div>}
    </div>
  )
}

// ── Inline action button ──────────────────────────────────────────────────────

function ActBtn({ onClick, children, color }: { onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '4px 10px', borderRadius: '8px', border: 'none',
        background: 'transparent', cursor: 'pointer', fontSize: '12px',
        fontWeight: 600, color: color || '#B5ADA3',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OffersClient({ initialOffers, clients, photographer, initialServicePresets, initialExtraPresets, initialUserTemplates }: Props) {
  useLocale()
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const [tab, setTab] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'expired'>('all')
  const [view, setView] = useState<'list' | 'builder'>('list')
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [servicePresets, setServicePresets] = useState<ServicePreset[]>(initialServicePresets)
  const [extraPresets, setExtraPresets] = useState<ServicePreset[]>(initialExtraPresets)
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)

  // ── Builder form state ─────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [introText, setIntroText] = useState('')
  const [services, setServices] = useState<BService[]>([])
  const [extras, setExtras] = useState<BExtra[]>([])
  const [links, setLinks] = useState<BLink[]>([])
  const [textBlocks, setTextBlocks] = useState<BTextBlock[]>([])

  // ── Builder UI state ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  // Services
  const [showLibrary, setShowLibrary] = useState(false)
  const [addingSvc, setAddingSvc] = useState(false)
  const [newSvc, setNewSvc] = useState({ title: '', description: '', price: '', saveToLib: false })
  // Extras
  const [showExtraLibrary, setShowExtraLibrary] = useState(false)
  const [addingExtra, setAddingExtra] = useState(false)
  const [newExtra, setNewExtra] = useState({ title: '', description: '', price: '', saveToLib: false })
  // Save as template
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isFirstRender = useRef(true)

  // ── Autosave for existing offers ───────────────────────────────────────────
  const formSnapshot = JSON.stringify({ title, clientId, eventDate, validUntil, basePrice, depositAmount, introText, services, extras, links, textBlocks })

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!editingOffer) return
    setSaveStatus('unsaved')
    clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      doSave(editingOffer.id)
    }, 2500)
    return () => clearTimeout(autosaveTimer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSnapshot])

  // ── Open builder ───────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingOffer(null)
    setTitle(''); setClientId(''); setEventDate(''); setValidUntil('')
    setBasePrice(''); setDepositAmount(''); setIntroText('')
    setServices([]); setExtras([]); setLinks([]); setTextBlocks([])
    setSaveStatus('saved')
    setShowLibrary(false); setAddingSvc(false)
    setShowExtraLibrary(false); setAddingExtra(false)
    setShowSaveTemplate(false); setTemplateName('')
    setNewSvc({ title: '', description: '', price: '', saveToLib: false })
    setNewExtra({ title: '', description: '', price: '', saveToLib: false })
    isFirstRender.current = true
    setView('builder')
  }

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer)
    const cId = offer.client ? (Array.isArray(offer.client) ? offer.client[0]?.id : offer.client?.id) || '' : ''
    setTitle(offer.title)
    setClientId(cId)
    setEventDate(offer.event_date || '')
    setValidUntil(offer.valid_until || '')
    setBasePrice(offer.base_price ? (offer.base_price / 100).toFixed(2) : '')
    setDepositAmount(offer.deposit_amount ? (offer.deposit_amount / 100).toFixed(2) : '')
    setIntroText(offer.intro_text || '')
    setServices((offer.services || []).map(s => ({ _id: uid(), title: s.title, description: s.description || '', included: s.included, price: s.price ? (s.price / 100).toFixed(2) : '' })))
    setExtras((offer.extras || []).map(e => ({ _id: uid(), title: e.title, description: e.description || '', price: e.price ? (e.price / 100).toFixed(2) : '' })))
    // Separate gallery_links into link-blocks and text-blocks
    const allItems = offer.gallery_links || []
    setLinks(
      allItems
        .filter((b): b is Extract<GalleryItem, { url: string }> => !('type' in b) || (b as { type: string }).type === 'link')
        .map(l => ({ _id: uid(), label: (l as { label?: string }).label || '', description: (l as { description?: string }).description || '', url: (l as { url: string }).url, image_url: (l as { image_url?: string }).image_url || '' }))
    )
    setTextBlocks(
      allItems
        .filter((b): b is Extract<GalleryItem, { heading: string }> => ('type' in b) && (b as { type: string }).type === 'text')
        .map(t => ({ _id: uid(), heading: (t as { heading: string }).heading || '', content: (t as { content: string }).content || '' }))
    )
    setSaveStatus('saved')
    setShowLibrary(false); setAddingSvc(false)
    setShowExtraLibrary(false); setAddingExtra(false)
    setShowSaveTemplate(false); setTemplateName('')
    setNewSvc({ title: '', description: '', price: '', saveToLib: false })
    setNewExtra({ title: '', description: '', price: '', saveToLib: false })
    isFirstRender.current = true
    setView('builder')
  }

  // ── Apply template ─────────────────────────────────────────────────────────
  const applyBuiltinTemplate = useCallback((tpl: OfferTemplate) => {
    if (introText.trim() === '') setIntroText(tpl.introText)
    if (basePrice === '') setBasePrice((tpl.basePrice / 100).toFixed(2))
    setServices(tpl.services.map(s => ({ _id: uid(), title: s.title, description: s.description || '', included: s.included, price: '' })))
    setExtras(tpl.extras.map(e => ({ _id: uid(), title: e.title, description: '', price: e.price ? (e.price / 100).toFixed(2) : '' })))
  }, [introText, basePrice])

  const applyUserTemplate = useCallback((tpl: UserTemplate) => {
    if (introText.trim() === '') setIntroText(tpl.intro_text || '')
    if (basePrice === '') setBasePrice(tpl.base_price ? (tpl.base_price / 100).toFixed(2) : '')
    setServices(tpl.services.map(s => ({ _id: uid(), title: s.title, description: s.description || '', included: s.included, price: s.price ? (s.price / 100).toFixed(2) : '' })))
    setExtras(tpl.extras.map(e => ({ _id: uid(), title: e.title, description: e.description || '', price: e.price ? (e.price / 100).toFixed(2) : '' })))
  }, [introText, basePrice])

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    try {
      const payload = buildPayload()
      const res = await fetch('/api/offers/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          intro_text: payload.intro_text,
          base_price: payload.base_price || null,
          services: payload.services,
          extras: payload.extras,
        }),
      })
      if (res.ok) {
        const tpl = await res.json()
        setUserTemplates(prev => [tpl, ...prev])
        toast.success('Als Vorlage gespeichert')
        setShowSaveTemplate(false)
        setTemplateName('')
      }
    } finally { setSavingTemplate(false) }
  }

  const deleteUserTemplate = async (id: string) => {
    setUserTemplates(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/offers/templates/${id}`, { method: 'DELETE' })
  }

  // ── Service helpers ────────────────────────────────────────────────────────
  const addSvcFromPreset = (p: ServicePreset) => {
    setServices(prev => [...prev, { _id: uid(), title: p.title, description: p.description || '', included: true, price: p.price ? (p.price / 100).toFixed(2) : '' }])
    setShowLibrary(false)
  }

  const commitNewSvc = async () => {
    if (!newSvc.title.trim()) return
    setServices(prev => [...prev, { _id: uid(), title: newSvc.title.trim(), description: newSvc.description.trim(), included: true, price: newSvc.price }])
    if (newSvc.saveToLib) {
      try {
        const res = await fetch('/api/offers/service-presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newSvc.title.trim(), description: newSvc.description.trim() || null, price: newSvc.price ? parseCents(newSvc.price) : null, preset_type: 'service' }),
        })
        if (res.ok) {
          const preset = await res.json()
          setServicePresets(prev => [...prev, preset])
          toast.success('In Bibliothek gespeichert')
        }
      } catch { /* non-critical */ }
    }
    setNewSvc({ title: '', description: '', price: '', saveToLib: false })
    setAddingSvc(false)
  }

  const deletePreset = async (id: string) => {
    setServicePresets(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/offers/service-presets/${id}`, { method: 'DELETE' })
  }

  const updateSvc = useCallback((id: string, patch: Partial<BService>) =>
    setServices(prev => prev.map(s => s._id === id ? { ...s, ...patch } : s)), [])
  const removeSvc = (id: string) => setServices(prev => prev.filter(s => s._id !== id))

  // ── Extra helpers ──────────────────────────────────────────────────────────
  const addExtraFromPreset = (p: ServicePreset) => {
    setExtras(prev => [...prev, { _id: uid(), title: p.title, description: p.description || '', price: p.price ? (p.price / 100).toFixed(2) : '' }])
    setShowExtraLibrary(false)
  }

  const commitNewExtra = async () => {
    if (!newExtra.title.trim()) return
    setExtras(prev => [...prev, { _id: uid(), title: newExtra.title.trim(), description: newExtra.description.trim(), price: newExtra.price }])
    if (newExtra.saveToLib) {
      try {
        const res = await fetch('/api/offers/service-presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newExtra.title.trim(), description: newExtra.description.trim() || null, price: newExtra.price ? parseCents(newExtra.price) : null, preset_type: 'extra' }),
        })
        if (res.ok) {
          const preset = await res.json()
          setExtraPresets(prev => [...prev, preset])
          toast.success('In Bibliothek gespeichert')
        }
      } catch { /* non-critical */ }
    }
    setNewExtra({ title: '', description: '', price: '', saveToLib: false })
    setAddingExtra(false)
  }

  const deleteExtraPreset = async (id: string) => {
    setExtraPresets(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/offers/service-presets/${id}`, { method: 'DELETE' })
  }

  const updateExtra = useCallback((id: string, patch: Partial<BExtra>) =>
    setExtras(prev => prev.map(e => e._id === id ? { ...e, ...patch } : e)), [])
  const removeExtra = (id: string) => setExtras(prev => prev.filter(e => e._id !== id))

  // ── Link + text block helpers ──────────────────────────────────────────────
  const addLink = () => setLinks(prev => [...prev, { _id: uid(), label: '', description: '', url: '', image_url: '' }])
  const updateLink = useCallback((id: string, patch: Partial<BLink>) =>
    setLinks(prev => prev.map(l => l._id === id ? { ...l, ...patch } : l)), [])
  const removeLink = (id: string) => setLinks(prev => prev.filter(l => l._id !== id))

  const addTextBlock = () => setTextBlocks(prev => [...prev, { _id: uid(), heading: '', content: '' }])
  const updateTextBlock = useCallback((id: string, patch: Partial<BTextBlock>) =>
    setTextBlocks(prev => prev.map(t => t._id === id ? { ...t, ...patch } : t)), [])
  const removeTextBlock = (id: string) => setTextBlocks(prev => prev.filter(t => t._id !== id))

  // ── Build payload ──────────────────────────────────────────────────────────
  const buildPayload = () => ({
    title: title.trim(),
    client_id: clientId || null,
    event_date: eventDate || null,
    valid_until: validUntil || null,
    base_price: parseCents(basePrice),
    deposit_amount: depositAmount ? parseCents(depositAmount) : null,
    intro_text: introText.trim() || null,
    gallery_links: [
      ...links.filter(l => l.url.trim()).map(l => ({ type: 'link' as const, label: l.label, description: l.description || undefined, url: l.url, image_url: l.image_url || undefined })),
      ...textBlocks.filter(t => t.content.trim() || t.heading.trim()).map(t => ({ type: 'text' as const, heading: t.heading, content: t.content })),
    ],
    services: services.filter(s => s.title.trim()).map(s => ({ title: s.title.trim(), description: s.description.trim() || null, included: s.included, price: s.price ? parseCents(s.price) : null })),
    extras: extras.filter(e => e.title.trim()).map(e => ({ title: e.title.trim(), description: e.description.trim() || null, price: parseCents(e.price), selectable: true })),
  })

  // ── Save ───────────────────────────────────────────────────────────────────
  const doSave = async (id: string) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) { setSaveStatus('unsaved'); return }
      const payload = buildPayload()
      setOffers(prev => prev.map(o => o.id !== id ? o : {
        ...o, ...payload,
        client: clients.find(c => c.id === payload.client_id) || o.client,
        services: payload.services.map((s, i) => ({ ...s, sort_order: i })),
        extras: payload.extras.map((e, i) => ({ ...e, sort_order: i })),
      }))
      setSaveStatus('saved')
    } catch { setSaveStatus('unsaved') }
  }

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('Bitte Titel eingeben'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) { toast.error('Fehler beim Erstellen'); return }
      const { id, slug } = await res.json()
      const payload = buildPayload()
      const newOffer: Offer = {
        id, slug, status: 'draft', currency: 'EUR', notes: null,
        created_at: new Date().toISOString(), ...payload,
        client: clients.find(c => c.id === payload.client_id) || null,
        services: payload.services.map((s, i) => ({ ...s, sort_order: i })),
        extras: payload.extras.map((e, i) => ({ ...e, sort_order: i })),
      }
      setOffers(prev => [newOffer, ...prev])
      setEditingOffer(newOffer)
      toast.success('Angebot erstellt')
      setSaveStatus('saved')
    } finally { setSaving(false) }
  }

  const handleManualSave = () => {
    if (!title.trim()) { toast.error('Bitte Titel eingeben'); return }
    if (editingOffer) {
      clearTimeout(autosaveTimer.current)
      doSave(editingOffer.id)
    } else {
      handleCreate()
    }
  }

  // ── List actions ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Angebot löschen?')) return
    const res = await fetch(`/api/offers/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Fehler'); return }
    setOffers(prev => prev.filter(o => o.id !== id))
    toast.success('Gelöscht')
  }

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/offers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Fehler'); return }
    setOffers(prev => prev.map(o => o.id === id ? { ...o, status: status as Offer['status'] } : o))
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${getSiteUrl()}/a/${slug}`)
    toast.success('Link kopiert')
  }

  // ── Filtered offers ────────────────────────────────────────────────────────
  const filtered = offers.filter(o =>
    tab === 'all' ? true :
    tab === 'sent' ? (o.status === 'sent' || o.status === 'viewed') :
    o.status === tab
  )

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'all', label: 'Alle' }, { key: 'draft', label: 'Entwurf' },
    { key: 'sent', label: 'Versendet' }, { key: 'accepted', label: 'Angenommen' },
    { key: 'expired', label: 'Abgelaufen' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // ── BUILDER VIEW ──────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'builder') {
    const saveLabel = saveStatus === 'saving' ? 'Speichert…' : saveStatus === 'unsaved' ? 'Speichern *' : 'Gespeichert'
    const saveLabelColor = saveStatus === 'unsaved' ? '#C4A47C' : saveStatus === 'saving' ? '#9CA3AF' : '#10B981'

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F8F5F1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Sticky top bar ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'rgba(248,245,241,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EDE9E3', flexShrink: 0, zIndex: 10 }}>
          <button
            onClick={() => { clearTimeout(autosaveTimer.current); setView('list') }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9A9188', fontSize: '13px', fontWeight: 600 }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
            Angebote
          </button>

          <div style={{ width: '1px', height: '20px', background: '#E8E4DC' }} />

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Angebot benennen…"
            autoFocus={!editingOffer}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', fontWeight: 700, color: '#1C1C1A', minWidth: 0 }}
          />

          {/* Autosave / status */}
          {editingOffer && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: saveLabelColor, flexShrink: 0 }}>{saveLabel}</span>
          )}

          {/* Als Vorlage speichern */}
          <button
            onClick={() => setShowSaveTemplate(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '10px', background: showSaveTemplate ? 'rgba(196,164,124,0.12)' : 'transparent', border: '1px solid #E8E4DC', color: '#9A9188', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            <BookOpen style={{ width: 13, height: 13 }} />
            Vorlage
          </button>

          {/* Preview */}
          {editingOffer && (
            <a
              href={`/a/${editingOffer.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '10px', background: 'transparent', border: '1px solid #E8E4DC', color: '#7A7468', fontSize: '12px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
            >
              <ExternalLink style={{ width: 13, height: 13 }} />
              Vorschau
            </a>
          )}

          {/* Save / Create button */}
          <button
            onClick={handleManualSave}
            disabled={saving || !title.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 18px', borderRadius: '10px', background: 'linear-gradient(135deg,#C4A47C,#B8956A)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', opacity: title.trim() ? 1 : 0.4, flexShrink: 0 }}
          >
            {saving ? '…' : <Save style={{ width: 13, height: 13 }} />}
            {editingOffer ? 'Speichern' : 'Erstellen'}
          </button>
        </div>

        {/* ── Save as template panel ──────────────────────────────────────── */}
        {showSaveTemplate && (
          <div style={{ padding: '12px 24px', background: 'rgba(196,164,124,0.06)', borderBottom: '1px solid #EDE9E3', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: '#9A9188', fontWeight: 600, whiteSpace: 'nowrap' }}>Vorlage speichern als:</span>
            <input
              autoFocus
              type="text"
              placeholder="z. B. Hochzeit Komplett, Branding Standard…"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveAsTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false) }}
              style={{ flex: 1, padding: '7px 12px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#fff', fontSize: '13px', color: '#1C1C1A', outline: 'none' }}
            />
            <button
              onClick={saveAsTemplate}
              disabled={savingTemplate || !templateName.trim()}
              style={{ padding: '7px 16px', borderRadius: '8px', background: '#C4A47C', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: templateName.trim() ? 'pointer' : 'default', opacity: templateName.trim() ? 1 : 0.4, whiteSpace: 'nowrap' }}
            >
              {savingTemplate ? '…' : 'Speichern'}
            </button>
            <button
              onClick={() => setShowSaveTemplate(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0B8AE', padding: '4px' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
            {/* Saved templates list */}
            {userTemplates.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderLeft: '1px solid #E8E4DC', paddingLeft: '12px' }}>
                {userTemplates.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <button
                      onClick={() => { applyUserTemplate(t); setShowSaveTemplate(false) }}
                      style={{ padding: '4px 10px', borderRadius: '100px', background: '#fff', border: '1px solid #E8E4DC', fontSize: '12px', fontWeight: 600, color: '#5A534E', cursor: 'pointer' }}
                    >
                      {t.name}
                    </button>
                    <button
                      onClick={() => deleteUserTemplate(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px' }}
                    >
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 80px' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>

            {/* ── GRUNDINFO ──────────────────────────────────────────────── */}
            <Section label="Grundinfo" actions={
              <div style={{ display: 'flex', gap: '4px' }}>
                <select
                  onChange={e => {
                    const val = e.target.value
                    if (!val) return
                    e.target.value = ''
                    if (val.startsWith('user:')) {
                      const tpl = userTemplates.find(t => t.id === val.slice(5))
                      if (tpl) applyUserTemplate(tpl)
                    } else {
                      const tpl = OFFER_TEMPLATES.find(t => t.id === val)
                      if (tpl) applyBuiltinTemplate(tpl)
                    }
                  }}
                  defaultValue=""
                  style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#FAF8F5', fontSize: '12px', color: '#7A7468', cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value="">✦ Vorlage</option>
                  {userTemplates.length > 0 && (
                    <optgroup label="Meine Vorlagen">
                      {userTemplates.map(t => <option key={t.id} value={`user:${t.id}`}>{t.name}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Standard-Vorlagen">
                    {OFFER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </optgroup>
                </select>
              </div>
            }>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Client */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE', marginBottom: '5px' }}>Kunde</label>
                  <select
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8E4DC', background: '#FAF8F5', fontSize: '14px', color: '#1C1C1A' }}
                  >
                    <option value="">— Kein Kunde verknüpft —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                {/* Event date */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE', marginBottom: '5px' }}>Termin / Event</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8E4DC', background: '#FAF8F5', fontSize: '14px', color: '#1C1C1A', boxSizing: 'border-box' }} />
                </div>
                {/* Valid until */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE', marginBottom: '5px' }}>Gültig bis</label>
                  <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8E4DC', background: '#FAF8F5', fontSize: '14px', color: '#1C1C1A', boxSizing: 'border-box' }} />
                </div>
                {/* Price */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE', marginBottom: '5px' }}>Basispreis (€)</label>
                  <input type="number" min="0" step="0.01" placeholder="0,00" value={basePrice} onChange={e => setBasePrice(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8E4DC', background: '#FAF8F5', fontSize: '14px', color: '#1C1C1A', boxSizing: 'border-box' }} />
                </div>
                {/* Deposit */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE', marginBottom: '5px' }}>Anzahlung (€)</label>
                  <input type="number" min="0" step="0.01" placeholder="Optional" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8E4DC', background: '#FAF8F5', fontSize: '14px', color: '#1C1C1A', boxSizing: 'border-box' }} />
                </div>
              </div>
            </Section>

            {/* ── EINLEITUNG ─────────────────────────────────────────────── */}
            <Section label="Einleitung">
              <textarea
                rows={5}
                placeholder="Persönliche Ansprache — direkt und warm. Erzähle dem Kunden kurz, worum es geht und was dich daran freut…"
                value={introText}
                onChange={e => setIntroText(e.target.value)}
                style={{ width: '100%', padding: '12px 0', border: 'none', outline: 'none', resize: 'none', fontSize: '15px', color: '#1C1C1A', background: 'transparent', lineHeight: 1.7, boxSizing: 'border-box' }}
              />
            </Section>

            {/* ── LEISTUNGEN ─────────────────────────────────────────────── */}
            <Section
              label="Leistungen"
              count={services.filter(s => s.title.trim()).length}
              actions={
                <>
                  <ActBtn onClick={() => setShowLibrary(v => !v)} color={showLibrary ? '#C4A47C' : '#B5ADA3'}>
                    <BookOpen style={{ width: 13, height: 13 }} />
                    Bibliothek
                  </ActBtn>
                  <ActBtn onClick={() => { setAddingSvc(true); setShowLibrary(false) }} color="#C4A47C">
                    <Plus style={{ width: 13, height: 13 }} />
                    Hinzufügen
                  </ActBtn>
                </>
              }
            >
              {/* Library panel */}
              {showLibrary && (
                <div style={{ marginBottom: '14px', padding: '14px 16px', background: '#FAF8F5', borderRadius: '12px', border: '1px solid #EDE9E3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE' }}>Leistungs-Bibliothek</span>
                    <button onClick={() => setShowLibrary(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0B8AE', lineHeight: 1 }}>
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                  {servicePresets.length === 0 && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#B5ADA3' }}>Noch keine gespeicherten Leistungen. Füge eine hinzu und aktiviere "In Bibliothek speichern".</p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {servicePresets.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => addSvcFromPreset(p)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#fff', border: '1px solid #E8E4DC', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#1C1C1A', transition: 'all 0.12s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4A47C'; e.currentTarget.style.color = '#C4A47C' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E4DC'; e.currentTarget.style.color = '#1C1C1A' }}
                        >
                          <Plus style={{ width: 11, height: 11 }} />
                          {p.title}
                          {p.price != null && <span style={{ fontWeight: 400, color: '#9A9188' }}> · {formatEur(p.price)}</span>}
                        </button>
                        <button onClick={() => deletePreset(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px' }}>
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {services.map(svc => (
                  <div key={svc._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: '#FAF8F5', border: '1px solid #EDE9E3' }}>
                    <button
                      onClick={() => updateSvc(svc._id, { included: !svc.included })}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', marginTop: '1px', padding: 0 }}
                      title={svc.included ? 'Enthalten' : 'Nicht enthalten'}
                    >
                      {svc.included
                        ? <ToggleRight style={{ width: 20, height: 20, color: '#10B981' }} />
                        : <ToggleLeft style={{ width: 20, height: 20, color: '#C0B8AE' }} />
                      }
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        value={svc.title}
                        onChange={e => updateSvc(svc._id, { title: e.target.value })}
                        placeholder="Leistung…"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#1C1C1A', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={svc.description}
                        onChange={e => updateSvc(svc._id, { description: e.target.value })}
                        placeholder="Kurze Beschreibung (optional)"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#9A9188', padding: 0, marginTop: '2px' }}
                      />
                    </div>
                    <button
                      onClick={() => removeSvc(svc._id)}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px', marginTop: '1px' }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new service form */}
              {addingSvc && (
                <div style={{ marginTop: '10px', padding: '14px 16px', background: '#fff', borderRadius: '12px', border: '1.5px solid #C4A47C' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Leistungsbezeichnung *"
                    value={newSvc.title}
                    onChange={e => setNewSvc(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#1C1C1A', marginBottom: '6px', padding: 0 }}
                  />
                  <input
                    type="text"
                    placeholder="Beschreibung (optional)"
                    value={newSvc.description}
                    onChange={e => setNewSvc(p => ({ ...p, description: e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#7A7468', marginBottom: '10px', padding: 0 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#9A9188', fontWeight: 600 }}>Preis (€)</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0"
                      value={newSvc.price}
                      onChange={e => setNewSvc(p => ({ ...p, price: e.target.value }))}
                      style={{ width: '90px', padding: '5px 10px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#FAF8F5', fontSize: '13px', color: '#1C1C1A' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      checked={newSvc.saveToLib}
                      onChange={e => setNewSvc(p => ({ ...p, saveToLib: e.target.checked }))}
                      style={{ width: '14px', height: '14px', accentColor: '#C4A47C' }}
                    />
                    <span style={{ fontSize: '12px', color: '#7A7468', fontWeight: 500 }}>In Bibliothek speichern — wiederverwendbar in zukünftigen Angeboten</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={commitNewSvc}
                      disabled={!newSvc.title.trim()}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#C4A47C', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: newSvc.title.trim() ? 'pointer' : 'default', opacity: newSvc.title.trim() ? 1 : 0.4 }}>
                      + Hinzufügen
                    </button>
                    <button onClick={() => { setAddingSvc(false); setNewSvc({ title: '', description: '', price: '', saveToLib: false }) }}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: '#F5F2EE', color: '#7A7468', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {services.length === 0 && !addingSvc && (
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#C0B8AE' }}>Noch keine Leistungen — wähle aus der Bibliothek oder füge eine neue hinzu.</p>
              )}
            </Section>

            {/* ── EXTRAS ─────────────────────────────────────────────────── */}
            <Section
              label="Extras"
              count={extras.filter(e => e.title.trim()).length}
              actions={
                <>
                  <ActBtn onClick={() => setShowExtraLibrary(v => !v)} color={showExtraLibrary ? '#C4A47C' : '#B5ADA3'}>
                    <BookOpen style={{ width: 13, height: 13 }} />
                    Bibliothek
                  </ActBtn>
                  <ActBtn onClick={() => { setAddingExtra(true); setShowExtraLibrary(false) }} color="#C4A47C">
                    <Plus style={{ width: 13, height: 13 }} />
                    Hinzufügen
                  </ActBtn>
                </>
              }
            >
              {/* Extra library panel */}
              {showExtraLibrary && (
                <div style={{ marginBottom: '14px', padding: '14px 16px', background: '#FAF8F5', borderRadius: '12px', border: '1px solid #EDE9E3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C0B8AE' }}>Extras-Bibliothek</span>
                    <button onClick={() => setShowExtraLibrary(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0B8AE', lineHeight: 1 }}>
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                  {extraPresets.length === 0 && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#B5ADA3' }}>Noch keine gespeicherten Extras. Füge eines hinzu und aktiviere "In Bibliothek speichern".</p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {extraPresets.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => addExtraFromPreset(p)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#fff', border: '1px solid #E8E4DC', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#1C1C1A', transition: 'all 0.12s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4A47C'; e.currentTarget.style.color = '#C4A47C' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E4DC'; e.currentTarget.style.color = '#1C1C1A' }}
                        >
                          <Plus style={{ width: 11, height: 11 }} />
                          {p.title}
                          {p.price != null && <span style={{ fontWeight: 400, color: '#9A9188' }}> · +{formatEur(p.price)}</span>}
                        </button>
                        <button onClick={() => deleteExtraPreset(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px' }}>
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {extras.map(ext => (
                  <div key={ext._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: '#FAF8F5', border: '1px solid #EDE9E3' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        value={ext.title}
                        onChange={e => updateExtra(ext._id, { title: e.target.value })}
                        placeholder="Extra, z. B. Zweiter Fotograf"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#1C1C1A', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={ext.description}
                        onChange={e => updateExtra(ext._id, { description: e.target.value })}
                        placeholder="Kurze Beschreibung (optional)"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#9A9188', padding: 0, marginTop: '2px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#9A9188', fontWeight: 600 }}>+€</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={ext.price}
                        onChange={e => updateExtra(ext._id, { price: e.target.value })}
                        placeholder="0"
                        style={{ width: '72px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#fff', fontSize: '13px', color: '#1C1C1A', textAlign: 'right' }}
                      />
                    </div>
                    <button onClick={() => removeExtra(ext._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px', flexShrink: 0 }}>
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new extra form */}
              {addingExtra && (
                <div style={{ marginTop: '10px', padding: '14px 16px', background: '#fff', borderRadius: '12px', border: '1.5px solid #C4A47C' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Extra-Bezeichnung *"
                    value={newExtra.title}
                    onChange={e => setNewExtra(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#1C1C1A', marginBottom: '6px', padding: 0 }}
                  />
                  <input
                    type="text"
                    placeholder="Beschreibung (optional)"
                    value={newExtra.description}
                    onChange={e => setNewExtra(p => ({ ...p, description: e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#7A7468', marginBottom: '10px', padding: 0 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#9A9188', fontWeight: 600 }}>Preis (€)</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0"
                      value={newExtra.price}
                      onChange={e => setNewExtra(p => ({ ...p, price: e.target.value }))}
                      style={{ width: '90px', padding: '5px 10px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#FAF8F5', fontSize: '13px', color: '#1C1C1A' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      checked={newExtra.saveToLib}
                      onChange={e => setNewExtra(p => ({ ...p, saveToLib: e.target.checked }))}
                      style={{ width: '14px', height: '14px', accentColor: '#C4A47C' }}
                    />
                    <span style={{ fontSize: '12px', color: '#7A7468', fontWeight: 500 }}>In Bibliothek speichern — wiederverwendbar in zukünftigen Angeboten</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={commitNewExtra}
                      disabled={!newExtra.title.trim()}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#C4A47C', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: newExtra.title.trim() ? 'pointer' : 'default', opacity: newExtra.title.trim() ? 1 : 0.4 }}>
                      + Hinzufügen
                    </button>
                    <button onClick={() => { setAddingExtra(false); setNewExtra({ title: '', description: '', price: '', saveToLib: false }) }}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: '#F5F2EE', color: '#7A7468', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {extras.length === 0 && !addingExtra && (
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#C0B8AE' }}>Keine Extras — der Kunde kann keine Zusatzleistungen wählen.</p>
              )}
            </Section>

            {/* ── LINKS & REFERENZEN ──────────────────────────────────────── */}
            <Section
              label="Links & Referenzen"
              count={links.filter(l => l.url.trim()).length + textBlocks.filter(t => t.content.trim() || t.heading.trim()).length}
              actions={
                <>
                  <ActBtn onClick={addTextBlock} color="#B5ADA3">
                    <AlignLeft style={{ width: 13, height: 13 }} />
                    Textblock
                  </ActBtn>
                  <ActBtn onClick={addLink} color="#C4A47C">
                    <Link2 style={{ width: 13, height: 13 }} />
                    Link-Block
                  </ActBtn>
                </>
              }
              defaultOpen={links.length > 0 || textBlocks.length > 0}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Link blocks */}
                {links.map(lnk => (
                  <div key={lnk._id} style={{ background: '#FAF8F5', borderRadius: '12px', border: '1px solid #EDE9E3', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #EDE9E3' }}>
                      <Link2 style={{ width: 14, height: 14, color: '#C4A47C', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={lnk.label}
                        onChange={e => updateLink(lnk._id, { label: e.target.value })}
                        placeholder="TITEL DES BLOCKS (z. B. SCHLOSS WULKOW HOCHZEIT)"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1C1C1A', padding: 0 }}
                      />
                      <button onClick={() => removeLink(lnk._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px', flexShrink: 0 }}>
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <input
                        type="text"
                        value={lnk.description}
                        onChange={e => updateLink(lnk._id, { description: e.target.value })}
                        placeholder="Kurze Beschreibung (z. B. Hochzeitsreportage in ähnlichem Stil…)"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#7A7468', padding: 0 }}
                      />
                      <input
                        type="url"
                        value={lnk.url}
                        onChange={e => updateLink(lnk._id, { url: e.target.value })}
                        placeholder="https://fotonizer.com/g/example-gallery"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#fff', fontSize: '13px', color: '#1C1C1A', boxSizing: 'border-box' }}
                      />
                      <input
                        type="url"
                        value={lnk.image_url}
                        onChange={e => updateLink(lnk._id, { image_url: e.target.value })}
                        placeholder="Vorschau-Bild URL (optional — für Cover-Thumbnail)"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E8E4DC', background: '#fff', fontSize: '13px', color: '#9A9188', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                ))}

                {/* Text blocks */}
                {textBlocks.map(tb => (
                  <div key={tb._id} style={{ background: '#FAF8F5', borderRadius: '12px', border: '1px solid #EDE9E3', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #EDE9E3' }}>
                      <AlignLeft style={{ width: 14, height: 14, color: '#B5ADA3', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={tb.heading}
                        onChange={e => updateTextBlock(tb._id, { heading: e.target.value })}
                        placeholder="ÜBERSCHRIFT (z. B. KONDITIONEN, HINWEISE, FAQ)"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1C1C1A', padding: 0 }}
                      />
                      <button onClick={() => removeTextBlock(tb._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C9C0', padding: '2px', flexShrink: 0 }}>
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <textarea
                        rows={4}
                        value={tb.content}
                        onChange={e => updateTextBlock(tb._id, { content: e.target.value })}
                        placeholder="Freitext — z. B. Konditionen, Ablauf, Hinweise, häufige Fragen…"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: '13px', color: '#1C1C1A', lineHeight: 1.65, padding: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                ))}

                {links.length === 0 && textBlocks.length === 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#C0B8AE' }}>Füge Link-Blöcke (Galerien, Instagram, Videos) oder Textblöcke (Konditionen, FAQ, Hinweise) hinzu.</p>
                )}
              </div>
            </Section>

          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Angebote</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Interaktive Proposals für deine Kunden</p>
        </div>
        <button
          onClick={openNew}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '12px', background: 'linear-gradient(135deg,#C4A47C,#B8956A)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Neues Angebot
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px', background: 'var(--bg-hover)', borderRadius: '12px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
              background: tab === t.key ? 'var(--bg-card)' : 'transparent',
              color: tab === t.key ? '#C4A47C' : 'var(--text-muted)',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
            {t.key !== 'all' && (
              <span style={{ marginLeft: '5px', opacity: 0.6 }}>
                {offers.filter(o => t.key === 'sent' ? o.status === 'sent' || o.status === 'viewed' : o.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(196,164,124,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Sparkles style={{ width: 22, height: 22, color: '#C4A47C' }} />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {tab === 'all' ? 'Noch keine Angebote' : 'Keine Angebote hier'}
          </p>
          {tab === 'all' && (
            <button onClick={openNew} style={{ marginTop: '16px', padding: '10px 22px', borderRadius: '12px', background: 'linear-gradient(135deg,#C4A47C,#B8956A)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              + Neues Angebot erstellen
            </button>
          )}
        </div>
      )}

      {/* Offer cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(offer => {
          const cfg = STATUS_CFG[offer.status] || STATUS_CFG.draft
          const StatusIcon = cfg.Icon
          const clientName = getClientName(offer)
          return (
            <div key={offer.id} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '16px 20px', border: '1px solid var(--border-color)', transition: 'box-shadow 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: '7px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.title}</p>
                      {clientName && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{clientName}</p>}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
                      <StatusIcon style={{ width: 11, height: 11 }} />
                      {cfg.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                    {offer.event_date && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {new Date(offer.event_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                    {offer.base_price > 0 && <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatEur(offer.base_price)}</span>}
                    {offer.valid_until && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gültig bis {new Date(offer.valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { label: 'Bearbeiten', icon: FileEdit, onClick: () => openEdit(offer), color: undefined },
                      { label: 'Link kopieren', icon: Copy, onClick: () => copyLink(offer.slug), color: undefined },
                      offer.status === 'draft' ? { label: 'Versenden', icon: Send, onClick: () => setStatus(offer.id, 'sent'), color: '#6366F1' } : null,
                    ].filter(Boolean).map((a, i) => a && (
                      <button key={i} onClick={a.onClick}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: a.color || 'var(--text-muted)' }}
                      >
                        <a.icon style={{ width: 13, height: 13 }} />
                        {a.label}
                      </button>
                    ))}
                    <a href={`/a/${offer.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: 'var(--bg-hover)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}
                    >
                      <ExternalLink style={{ width: 13, height: 13 }} />
                      Vorschau
                    </a>
                    <button onClick={() => handleDelete(offer.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#EF4444' }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Link to old quotes */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
        <a href="/dashboard/quotes" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          → Kostenvoranschläge (klassisch)
        </a>
      </div>
    </div>
  )
}
