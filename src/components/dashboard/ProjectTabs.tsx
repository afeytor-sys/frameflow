'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Images, CalendarDays, Plus, ArrowLeft, Pencil, Check, X, Receipt, Percent, Clock, Share2, Trash2, Sparkles } from 'lucide-react'
import ContractTab from './ContractTab'
import GalleryTab from './GalleryTab'
import BookingDetailsTab from './BookingDetailsTab'
import type { Contract, Plan } from '@/types/database'
import { GALLERY_THEMES } from '@/lib/galleryThemes'
import toast from 'react-hot-toast'

type Photo = { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number; is_favorite: boolean }

type GalleryItem = {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'expired'
  password: string | null
  watermark: boolean
  download_enabled: boolean
  comments_enabled: boolean
  expires_at: string | null
  view_count: number
  download_count: number
  photos?: Photo[]
}

interface UserTemplate {
  id: string
  name: string
  description: string | null
  content: string
}

interface Props {
  project: {
    id: string
    title: string
    client_url: string
    photographer_id: string
    shoot_date?: string | null
    location?: string | null
    project_type?: string | null
    notes?: string | null
    status?: string
    [key: string]: unknown
  }
  contracts: Contract[]
  galleries: GalleryItem[]
  plan: Plan
  userTemplates?: UserTemplate[]
}

const TABS = [
  { key: 'contract', label: 'Vertrag',        icon: FileText },
  { key: 'gallery',  label: 'Galerie',         icon: Images },
  { key: 'booking',  label: 'Booking Details', icon: CalendarDays },
  { key: 'invoice',  label: 'Rechnung',        icon: Receipt },
]

const MWST_RATE = 0.19

export default function ProjectTabs({ project, contracts, galleries: initialGalleries, plan, userTemplates = [] }: Props) {
  const [activeTab, setActiveTab] = useState('contract')
  const [galleries, setGalleries] = useState<GalleryItem[]>(initialGalleries)
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTheme, setCreateTheme] = useState('classic-white')
  const [creatingGallery, setCreatingGallery] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    amount: '',
    description: '',
    due_date: '',
    include_mwst: false,
  })
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [invoiceCreated, setInvoiceCreated] = useState(false)

  const supabase = createClient()
  const client = project.client as { full_name?: string; email?: string } | null
  const selectedGallery = galleries.find(g => g.id === selectedGalleryId) ?? null

  const createGallery = async () => {
    setCreatingGallery(true)
    const newTitle = `Galerie ${galleries.length + 1}`
    const { data, error } = await supabase
      .from('galleries')
      .insert({
        project_id: project.id,
        photographer_id: project.photographer_id,
        title: newTitle,
        status: 'active',
        watermark: false,
        download_enabled: true,
        view_count: 0,
        download_count: 0,
        design_theme: createTheme,
      })
      .select()
      .single()

    if (error) { toast.error('Fehler beim Erstellen'); setCreatingGallery(false); return }
    const newGallery: GalleryItem = {
      id: data.id,
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      password: data.password ?? null,
      watermark: data.watermark,
      download_enabled: data.download_enabled,
      comments_enabled: data.comments_enabled ?? true,
      expires_at: data.expires_at ?? null,
      view_count: 0,
      download_count: 0,
      photos: [],
    }
    setGalleries(prev => [...prev, newGallery])
    setSelectedGalleryId(newGallery.id)
    setCreatingGallery(false)
    setShowCreateModal(false)
    toast.success('Galerie erstellt!')
  }

  const startRenaming = (g: GalleryItem) => {
    setEditingTitleId(g.id)
    setEditingTitle(g.title)
  }

  const saveRename = async (id: string) => {
    if (!editingTitle.trim()) { setEditingTitleId(null); return }
    const { error } = await supabase.from('galleries').update({ title: editingTitle.trim() }).eq('id', id)
    if (error) { toast.error('Fehler beim Umbenennen'); return }
    setGalleries(prev => prev.map(g => g.id === id ? { ...g, title: editingTitle.trim() } : g))
    setEditingTitleId(null)
    toast.success('Galerie umbenannt')
  }

  const deleteGallery = async (id: string) => {
    if (!confirm('Galerie wirklich löschen? Alle Fotos werden ebenfalls gelöscht.')) return
    const { error } = await supabase.from('galleries').delete().eq('id', id)
    if (error) { toast.error('Fehler beim Löschen'); return }
    setGalleries(prev => prev.filter(g => g.id !== id))
    toast.success('Galerie gelöscht')
  }

  const shareGallery = async (_g: GalleryItem) => {
    const url = `${project.client_url}/gallery`
    const ok = await navigator.clipboard.writeText(url).then(() => true).catch(() => false)
    if (ok) toast.success('Link kopiert!')
    else toast.error('Kopieren fehlgeschlagen')
  }

  // ── Gallery list view ──────────────────────────────────────────────────────
  const GalleryListView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
          Galerien ({galleries.length})
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg text-white transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          <Plus className="w-3.5 h-3.5" />
          Neue Galerie
        </button>
      </div>

      {galleries.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
          <Images className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Noch keine Galerie für dieses Projekt</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            Erste Galerie erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {galleries.map(g => {
            const coverPhoto = g.photos?.[0]
            const photoCount = g.photos?.length ?? 0
            const isActive = g.status === 'active'

            return (
              <div
                key={g.id}
                className="group cursor-pointer"
                onClick={() => setSelectedGalleryId(g.id)}
              >
                {/* Cover — 4:3 landscape ratio */}
                <div
                  className="relative overflow-hidden rounded-lg mb-2.5 transition-all duration-200"
                  style={{ aspectRatio: '4/3', background: 'var(--bg-hover)' }}
                >
                  {coverPhoto ? (
                    <img
                      src={coverPhoto.thumbnail_url || coverPhoto.storage_url}
                      alt={g.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-7 h-7" style={{ color: 'var(--border-strong)' }} />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                  {/* Share — top right */}
                  <button
                    onClick={e => { e.stopPropagation(); shareGallery(g) }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.30)' }}
                    title="Link kopieren"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  {/* Delete — bottom right */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteGallery(g.id) }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(232,76,26,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(232,76,26,0.40)' }}
                    title="Galerie löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div>
                  {editingTitleId === g.id ? (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(g.id); if (e.key === 'Escape') setEditingTitleId(null) }}
                        className="input-base py-1 text-[13px] flex-1"
                      />
                      <button onClick={() => saveRename(g.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}>
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingTitleId(null)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-[13px] truncate leading-snug" style={{ color: 'var(--text-primary)' }}>{g.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: isActive ? '#3DBA6F' : 'var(--text-muted)' }}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: isActive ? '#3DBA6F' : 'var(--text-muted)' }} />
                            {isActive ? 'Aktiv' : 'Entwurf'}
                          </span>
                          {photoCount > 0 && (
                            <>
                              <span style={{ color: 'var(--border-strong)' }}>·</span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{photoCount} Fotos</span>
                            </>
                          )}
                          {g.view_count > 0 && (
                            <>
                              <span style={{ color: 'var(--border-strong)' }}>·</span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{g.view_count} Aufrufe</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); startRenaming(g) }}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                        title="Umbenennen"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ── Create Gallery Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 className="font-black text-[16px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Neue Galerie</h2>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Wähle ein Design für deine Galerie</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 max-h-72 overflow-y-auto pr-1">
              {GALLERY_THEMES.map(theme => (
                <button
                  key={theme.key}
                  onClick={() => setCreateTheme(theme.key)}
                  className="relative rounded-xl p-3 text-left transition-all"
                  style={{
                    background: createTheme === theme.key ? 'var(--accent-muted)' : 'var(--bg-hover)',
                    border: `2px solid ${createTheme === theme.key ? 'var(--accent)' : 'var(--border-color)'}`,
                  }}
                >
                  {/* Color swatches */}
                  <div className="flex gap-1 mb-2">
                    {[theme.bg, theme.surface, theme.accent].map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="font-bold text-[12px]" style={{ color: 'var(--text-primary)' }}>{theme.name}</p>
                  {createTheme === theme.key && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={createGallery}
                disabled={creatingGallery}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                {creatingGallery
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Plus className="w-4 h-4" />Galerie erstellen</>
                }
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); if (key !== 'gallery') setSelectedGalleryId(null) }}
              className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px"
              style={{
                borderBottomColor: activeTab === key ? 'var(--accent)' : 'transparent',
                color: activeTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'gallery' && galleries.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {galleries.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'contract' && (
            <ContractTab
              projectId={project.id}
              contracts={contracts}
              clientEmail={client?.email}
              clientName={client?.full_name}
              userTemplates={userTemplates}
            />
          )}

          {activeTab === 'gallery' && (
            <>
              {selectedGallery ? (
                <div>
                  <button
                    onClick={() => setSelectedGalleryId(null)}
                    className="flex items-center gap-1.5 text-[13px] mb-4 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Alle Galerien
                  </button>
                  <GalleryTab
                    projectId={project.id}
                    photographerId={project.photographer_id}
                    clientUrl={project.client_url}
                    gallery={{
                      id: selectedGallery.id,
                      title: selectedGallery.title,
                      description: selectedGallery.description,
                      status: selectedGallery.status,
                      password: selectedGallery.password,
                      watermark: selectedGallery.watermark,
                      download_enabled: selectedGallery.download_enabled,
                      comments_enabled: selectedGallery.comments_enabled,
                      expires_at: selectedGallery.expires_at,
                      view_count: selectedGallery.view_count,
                      download_count: selectedGallery.download_count,
                    }}
                    photos={(selectedGallery.photos ?? []) as Photo[]}
                    showWatermark={false}
                  />
                </div>
              ) : (
                <GalleryListView />
              )}
            </>
          )}

          {activeTab === 'booking' && (
            <BookingDetailsTab
              projectId={project.id}
              initialData={{
                shoot_date: (project.shoot_date as string | null) ?? null,
                location: (project.location as string | null) ?? null,
                project_type: (project.project_type as string | null) ?? null,
                notes: (project.notes as string | null) ?? null,
                status: (project.status as string) ?? 'booked',
              }}
            />
          )}

          {activeTab === 'invoice' && (
            <InvoiceTab
              projectId={project.id}
              photographerId={project.photographer_id}
              projectTitle={project.title}
              clientName={client?.full_name}
              form={invoiceForm}
              setForm={setInvoiceForm}
              saving={savingInvoice}
              setSaving={setSavingInvoice}
              created={invoiceCreated}
              setCreated={setInvoiceCreated}
            />
          )}
        </div>
      </div>
    </>
  )
}

// ── Invoice Tab Component ──────────────────────────────────────────────────
interface InvoiceTabProps {
  projectId: string
  photographerId: string
  projectTitle: string
  clientName?: string
  form: { amount: string; description: string; due_date: string; include_mwst: boolean }
  setForm: React.Dispatch<React.SetStateAction<{ amount: string; description: string; due_date: string; include_mwst: boolean }>>
  saving: boolean
  setSaving: (v: boolean) => void
  created: boolean
  setCreated: (v: boolean) => void
}

function InvoiceTab({ projectId, photographerId, projectTitle, clientName, form, setForm, saving, setSaving, created, setCreated }: InvoiceTabProps) {
  const supabase = createClient()

  const net = parseFloat(form.amount.replace(',', '.')) || 0
  const mwst = form.include_mwst ? net * MWST_RATE : 0
  const gross = net + mwst

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount) { toast.error('Bitte einen Betrag eingeben'); return }
    setSaving(true)

    const amountCents = Math.round(gross * 100)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
    const descParts: string[] = []
    if (form.description) descParts.push(form.description)
    if (form.include_mwst) descParts.push(`inkl. 19% MwSt (Netto: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(net)})`)
    const finalDescription = descParts.join(' · ') || null

    const { error } = await supabase.from('invoices').insert({
      project_id: projectId,
      photographer_id: photographerId,
      amount: amountCents,
      currency: 'eur',
      status: 'draft',
      description: finalDescription,
      due_date: form.due_date || null,
      invoice_number: invoiceNumber,
    })

    if (error) { console.error('Invoice error:', error); toast.error(`Fehler: ${error.message}`); setSaving(false); return }
    setSaving(false)
    setCreated(true)
    toast.success('Rechnung erstellt!')
  }

  if (created) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(61,186,111,0.12)' }}>
          <Check className="w-7 h-7" style={{ color: '#3DBA6F' }} />
        </div>
        <h3 className="font-black text-[17px] mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Rechnung erstellt!
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Die Rechnung wurde als Entwurf gespeichert.
        </p>
        <div className="flex gap-3">
          <a href="/dashboard/invoices"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#F97316' }}>
            <Receipt className="w-4 h-4" />
            Alle Rechnungen
          </a>
          <button
            onClick={() => { setCreated(false); setForm({ amount: '', description: '', due_date: '', include_mwst: false }) }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            Neue Rechnung
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(249,115,22,0.10)' }}>
          <Receipt className="w-5 h-5" style={{ color: '#F97316' }} />
        </div>
        <div>
          <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Rechnung erstellen
          </h3>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {projectTitle}{clientName ? ` · ${clientName}` : ''}
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
            style={{ color: 'var(--text-muted)' }}>
            Betrag (€) *
          </label>
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
            <span className="flex-shrink-0 px-3 text-[14px] font-bold select-none"
              style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>
              €
            </span>
            <input
              type="text"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
              placeholder="0,00"
              className="flex-1 px-3 py-2.5 bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
          </div>
        </div>

        {/* MwSt toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl transition-all"
          style={{
            background: form.include_mwst ? 'rgba(196,164,124,0.10)' : 'var(--bg-hover)',
            border: `1px solid ${form.include_mwst ? 'var(--accent)' : 'var(--border-color)'}`,
          }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: form.include_mwst ? 'var(--accent-muted)' : 'var(--border-color)' }}>
              <Percent className="w-3.5 h-3.5" style={{ color: form.include_mwst ? 'var(--accent)' : 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>MwSt 19%</p>
              {form.include_mwst && net > 0 && (
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(net)} + {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(mwst)} = <strong style={{ color: 'var(--accent)' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gross)}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, include_mwst: !f.include_mwst }))}
            style={{ background: form.include_mwst ? 'var(--accent)' : 'var(--border-strong)', width: '40px', height: '22px', borderRadius: '999px', position: 'relative', flexShrink: 0 }}
          >
            <span style={{
              position: 'absolute', top: '3px', width: '16px', height: '16px',
              background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.15s',
              left: form.include_mwst ? '21px' : '3px',
            }} />
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
            style={{ color: 'var(--text-muted)' }}>
            Beschreibung
          </label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="z.B. Hochzeitsfotografie — 12. April 2026"
            className="input-base w-full"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3 h-3 inline mr-1" />
            Fälligkeitsdatum
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            className="input-base w-full"
          />
        </div>

        {/* Preview */}
        {net > 0 && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#F97316' }}>Vorschau</p>
            <p className="text-[22px] font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gross)}
            </p>
            {form.include_mwst && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                inkl. 19% MwSt
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !form.amount}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.25)' }}
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Plus className="w-4 h-4" />Rechnung erstellen</>
            }
          </button>
          <a href="/dashboard/invoices"
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors flex items-center"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            Alle Rechnungen
          </a>
        </div>
      </form>
    </div>
  )
}
