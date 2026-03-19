'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Images, CalendarDays, Plus, ArrowLeft, Pencil, Check, X, Receipt, Percent, Clock, Share2, Trash2, Sparkles, Lock, GripHorizontal, Eye, ClipboardList, Send, Printer, Copy, Mail, Loader2 } from 'lucide-react'
import ContractTab from './ContractTab'
import GalleryTab from './GalleryTab'
import GalleryShareModal from './GalleryShareModal'
import BookingDetailsTab from './BookingDetailsTab'
import PortalSettingsTab from './PortalSettingsTab'
import QuestionnaireTab from './QuestionnaireTab'
import InternalNotesTab from './InternalNotesTab'
import EmailTab from './EmailTab'
import type { Contract, Plan } from '@/types/database'
import { GALLERY_THEMES } from '@/lib/galleryThemes'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeModal from './UpgradeModal'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'
import { dashboardT } from '@/lib/dashboardTranslations'

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

interface MessageTemplate {
  label: string
  text: string
}

interface Props {
  project: {
    id: string
    title: string
    client_url: string
    client_token?: string | null
    photographer_id: string
    shoot_date?: string | null
    location?: string | null
    meeting_point?: string | null
    project_type?: string | null
    notes?: string | null
    status?: string
    portal_sections?: Record<string, boolean> | null
    portal_message?: string | null
    portal_password?: string | null
    portal_links?: { label: string; url: string }[] | null
    project_steps_override?: Record<string, boolean> | null
    internal_notes?: string | null
    [key: string]: unknown
  }
  contracts: Contract[]
  galleries: GalleryItem[]
  plan: Plan
  userTemplates?: UserTemplate[]
  photographerName?: string | null
  photographerMessageTemplates?: MessageTemplate[] | null
}

// TABS is now built inside the component using translations

const MWST_RATE = 0.19
const SET_SUGGESTIONS = ['Getting Ready', 'Ceremony', 'Reception', 'Portraits', 'Details', 'Highlights', 'Moments']

export default function ProjectTabs({ project, contracts, galleries: initialGalleries, plan, userTemplates = [], photographerName, photographerMessageTemplates }: Props) {
  const locale = useLocale()
  const t = dashboardT(locale)
  const [activeTab, setActiveTab] = useState('contract')
  const [galleries, setGalleries] = useState<GalleryItem[]>(initialGalleries)
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null)

  // Full create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingGallery, setCreatingGallery] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    password: '',
    theme: 'classic-white',
    download_enabled: true,
    comments_enabled: true,
    tags_enabled: true,
  })
  const [sets, setSets] = useState<string[]>([])
  const [newSetName, setNewSetName] = useState('')

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // Invoice state
  const [invoiceForm, setInvoiceForm] = useState({
    amount: '',
    description: '',
    due_date: '',
    include_mwst: false,
    notes: '',
  })
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [invoiceCreated, setInvoiceCreated] = useState(false)
  const [projectInvoices, setProjectInvoices] = useState<ProjectInvoice[]>([])
  const [invoicesLoaded, setInvoicesLoaded] = useState(false)

  const supabase = createClient()
  const client = project.client as { full_name?: string; email?: string } | null
  const selectedGallery = galleries.find(g => g.id === selectedGalleryId) ?? null

  // Storage limits
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const planLimits = usePlanLimits()

  const openCreateModal = () => {
    setCreateForm({ title: '', password: '', theme: 'classic-white', download_enabled: true, comments_enabled: true, tags_enabled: true })
    setSets([])
    setNewSetName('')
    setShowCreateModal(true)
  }

  const addSet = (name?: string) => {
    const n = (name || newSetName).trim()
    if (!n || sets.includes(n)) return
    setSets(prev => [...prev, n])
    setNewSetName('')
  }

  const removeSet = (name: string) => setSets(prev => prev.filter(s => s !== name))

  const TABS = [
    {
      key: 'contract',
      label: t.tabs.contract,
      icon: FileText,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.10)',
      desc: (contracts: Contract[], _galleries: GalleryItem[], _project: Props['project']) =>
        contracts.length > 0 ? t.tabDesc.contract(contracts.length) : t.tabDesc.noContract,
    },
    {
      key: 'gallery',
      label: t.tabs.gallery,
      icon: Images,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.10)',
      desc: (_c: Contract[], galleries: GalleryItem[], _project: Props['project']) => {
        const total = galleries.reduce((s, g) => s + (g.photos?.length ?? 0), 0)
        return galleries.length > 0
          ? t.tabDesc.gallery(galleries.length, total)
          : t.tabDesc.noGallery
      },
    },
    {
      key: 'booking',
      label: t.tabs.booking,
      icon: CalendarDays,
      color: '#C4A47C',
      bg: 'rgba(196,164,124,0.12)',
      desc: (_c: Contract[], _g: GalleryItem[], project: Props['project']) => {
        const parts: string[] = []
        if (project.shoot_date) {
          const d = new Date(project.shoot_date as string)
          parts.push(d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }))
        }
        if (project.location) parts.push(project.location as string)
        return parts.length > 0 ? parts.join(' · ') : t.tabDesc.noDate
      },
    },
    {
      key: 'invoice',
      label: t.tabs.invoice,
      icon: Receipt,
      color: '#F97316',
      bg: 'rgba(249,115,22,0.10)',
      desc: () => t.tabDesc.manageInvoices,
    },
    {
      key: 'portal',
      label: t.tabs.portal,
      icon: Eye,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.10)',
      desc: () => t.tabDesc.visibilityMsg,
    },
    {
      key: 'questionnaire',
      label: t.tabs.questionnaire,
      icon: ClipboardList,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.10)',
      desc: () => t.tabDesc.sendQuestions,
    },
    {
      key: 'notes',
      label: locale === 'de' ? 'Notizen' : 'Notes',
      icon: FileText,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.10)',
      desc: () => project.internal_notes
        ? (locale === 'de' ? 'Interne Notizen vorhanden' : 'Internal notes saved')
        : (locale === 'de' ? 'Keine Notizen' : 'No notes yet'),
    },
    {
      key: 'email',
      label: locale === 'de' ? 'Emails' : 'Emails',
      icon: Mail,
      color: '#F97316',
      bg: 'rgba(249,115,22,0.10)',
      desc: () => locale === 'de' ? 'Emails senden & planen' : 'Send & schedule emails',
    },
  ]

  const createGallery = async () => {
    if (!createForm.title.trim()) { toast.error(t.gallery.toastTitleRequired); return }
    setCreatingGallery(true)

    const { data, error } = await supabase
      .from('galleries')
      .insert({
        project_id: project.id,
        photographer_id: project.photographer_id,
        title: createForm.title.trim(),
        status: 'active',
        watermark: false,
        download_enabled: createForm.download_enabled,
        comments_enabled: createForm.comments_enabled,
        view_count: 0,
        download_count: 0,
        design_theme: createForm.theme,
        tags_enabled: createForm.tags_enabled ? ['green', 'yellow', 'red'] : [],
        ...(createForm.password ? { password: createForm.password } : {}),
      })
      .select()
      .single()

    if (error) { toast.error(t.gallery.toastCreateError); setCreatingGallery(false); return }

    // Create sets
    if (sets.length > 0) {
      await Promise.all(sets.map((title, i) =>
        supabase.from('gallery_sections').insert({ gallery_id: data.id, title, display_order: i })
      ))
    }

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
    toast.success(t.gallery.toastCreated)
  }

  const startRenaming = (g: GalleryItem) => {
    setEditingTitleId(g.id)
    setEditingTitle(g.title)
  }

  const saveRename = async (id: string) => {
    if (!editingTitle.trim()) { setEditingTitleId(null); return }
    const { error } = await supabase.from('galleries').update({ title: editingTitle.trim() }).eq('id', id)
    if (error) { toast.error(t.gallery.toastRenameError); return }
    setGalleries(prev => prev.map(g => g.id === id ? { ...g, title: editingTitle.trim() } : g))
    setEditingTitleId(null)
    toast.success(t.gallery.toastRenamed)
  }

  const deleteGallery = async (id: string) => {
    if (!confirm('Really delete gallery? All photos will also be deleted.')) return
    const { error } = await supabase.from('galleries').delete().eq('id', id)
    if (error) { toast.error('Error deleting'); return }
    setGalleries(prev => prev.filter(g => g.id !== id))
    toast.success('Gallery deleted')
  }

  // ── Share Modal state ──────────────────────────────────────────────────────
  const [shareModal, setShareModal] = useState<{ galleryId: string; url: string; password: string | null; title: string } | null>(null)

  const openShareModal = (g: GalleryItem) => {
    const token = (project.client_token as string | null) ?? project.client_url.split('/client/')[1]
    const url = `${window.location.origin}/gallery/${token}`
    setShareModal({ galleryId: g.id, url, password: g.password || null, title: g.title })
  }

  const shareGallery = (g: GalleryItem) => openShareModal(g)

  // ── Gallery list view ──────────────────────────────────────────────────────
  const GalleryListView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
          {t.gallery.title(galleries.length)}
        </h3>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg text-white transition-colors"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t.gallery.newGallery}
        </button>
      </div>

      {galleries.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
          <Images className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{t.gallery.noGallery}</p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            {t.gallery.createFirst}
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
                    title="Delete gallery"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

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
                            {isActive ? t.gallery.active : t.gallery.draft}
                          </span>
                          {photoCount > 0 && (
                            <>
                              <span style={{ color: 'var(--border-strong)' }}>·</span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.gallery.photos(photoCount)}</span>
                            </>
                          )}
                          {g.view_count > 0 && (
                            <>
                              <span style={{ color: 'var(--border-strong)' }}>·</span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.gallery.views(g.view_count)}</span>
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
      {/* ── Upgrade Modal ───────────────────────────────────────────────── */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={planLimits.plan}
      />

      {/* ── Share Gallery Modal ──────────────────────────────────────────── */}
      <GalleryShareModal
        open={!!shareModal}
        onClose={() => setShareModal(null)}
        galleryTitle={shareModal?.title || ''}
        galleryUrl={shareModal?.url || ''}
        galleryPassword={shareModal?.password || null}
        galleryId={shareModal?.galleryId}
        clientEmail={client?.email}
        clientName={client?.full_name}
        studioName={photographerName || undefined}
      />

      {/* ── Full Create Gallery Modal ────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)', maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[18px]" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{t.gallery.createTitle}</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.gallery.createSubtitle}</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Name + Password */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {t.gallery.galleryName}
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={t.gallery.galleryNamePlaceholder}
                    className="input-base w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Lock className="w-3 h-3 inline mr-1" />{t.gallery.password}
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={t.gallery.noPassword}
                    className="input-base w-full"
                  />
                </div>
              </div>

              {/* Project — pre-filled, read-only */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Project *
                </label>
                <div className="input-base w-full flex items-center justify-between" style={{ opacity: 0.7 }}>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {project.title}{client?.full_name ? ` — ${client.full_name}` : ''}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {t.gallery.currentProject}
                  </span>
                </div>
              </div>

              {/* Sets */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <GripHorizontal className="w-3 h-3 inline mr-1" />{t.gallery.sets}
                </label>
                <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                  {t.gallery.setsHint}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SET_SUGGESTIONS.filter(s => !sets.includes(s)).map(s => (
                    <button key={s} onClick={() => addSet(s)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                      + {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSet() } }}
                    placeholder={t.gallery.customSetPlaceholder}
                    className="input-base flex-1"
                  />
                  <button onClick={() => addSet()} disabled={!newSetName.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {sets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sets.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.25)' }}>
                        <span className="text-[10px] font-bold opacity-50">{i + 1}</span>
                        {s}
                        <button onClick={() => removeSet(s)} className="w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-5 flex-wrap">
                {[
                  { label: t.gallery.allowDownload, key: 'download_enabled' as const, color: 'var(--accent)' },
                  { label: t.gallery.allowComments, key: 'comments_enabled' as const, color: 'var(--accent)' },
                  { label: t.gallery.tagSelection, key: 'tags_enabled' as const, color: '#22C55E' },
                ].map(({ label, key, color }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setCreateForm(f => ({ ...f, [key]: !f[key] }))}
                      className="relative cursor-pointer rounded-full"
                      style={{ width: '36px', height: '20px', background: createForm[key] ? color : 'var(--border-strong)', transition: 'background 150ms' }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                        style={{ left: createForm[key] ? '16px' : '2px', transition: 'left 150ms' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Design / Theme */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Sparkles className="w-3 h-3 inline mr-1" />Layout / Design
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {GALLERY_THEMES.map(theme => (
                    <button key={theme.key} onClick={() => setCreateForm(f => ({ ...f, theme: theme.key }))}
                      className="relative rounded-xl overflow-hidden text-left transition-all"
                      style={{
                        border: createForm.theme === theme.key ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                        boxShadow: createForm.theme === theme.key ? '0 0 0 3px rgba(196,164,124,0.2)' : 'none',
                      }}>
                      <div className="h-10 flex flex-col justify-between p-1.5" style={{ background: theme.bg }}>
                        <div className="flex gap-0.5">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex-1 rounded-sm" style={{ height: '12px', background: theme.surface, border: `1px solid ${theme.border}` }} />
                          ))}
                        </div>
                        <div className="h-0.5 rounded-full w-1/2" style={{ background: theme.accent, opacity: 0.7 }} />
                      </div>
                      <div className="px-1.5 py-1" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
                        <p className="text-[9px] font-semibold truncate" style={{ color: theme.text }}>{theme.name}</p>
                      </div>
                      {createForm.theme === theme.key && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">{t.gallery.cancel}</button>
              <button
                onClick={createGallery}
                disabled={creatingGallery || !createForm.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: '#10B981', boxShadow: '0 1px 8px rgba(16,185,129,0.25)' }}
              >
                {creatingGallery
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Sparkles className="w-4 h-4" />{t.gallery.create}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6 Navigation Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {TABS.map(({ key, label, icon: Icon, color, bg, desc }, idx) => {
          const isActive = activeTab === key
          const subtitle = desc(contracts, galleries, project)
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); if (key !== 'gallery') setSelectedGalleryId(null) }}
              className="rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: isActive ? bg : 'var(--bg-surface)',
                border: isActive ? `1.5px solid ${color}40` : '1px solid var(--border-color)',
                boxShadow: isActive ? `0 4px 20px ${color}18` : 'var(--card-shadow)',
                animation: `fadeSlideUp 0.3s ease both`,
                animationDelay: `${idx * 50}ms`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all"
                style={{ background: isActive ? bg : 'var(--bg-hover)' }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: isActive ? color : 'var(--text-muted)', width: '18px', height: '18px' }} />
              </div>
              <p className="text-[13px] font-bold leading-tight mb-0.5" style={{ color: isActive ? color : 'var(--text-primary)' }}>
                {label}
              </p>
              <p className="text-[11px] leading-snug truncate" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
              {isActive && (
                <div className="mt-2 h-0.5 rounded-full w-8" style={{ background: color }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content card ────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div className="p-6">
          {activeTab === 'contract' && (
            <ContractTab
              projectId={project.id}
              contracts={contracts}
              clientEmail={client?.email}
              clientName={client?.full_name}
              photographerName={photographerName}
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
                    {t.gallery.allGalleries}
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
                    canUploadFile={planLimits.canUploadFile}
                    maxStorageBytes={planLimits.limits.maxStorageBytes}
                    storageUsedBytes={planLimits.storageUsedBytes}
                    onStorageLimitReached={() => setShowUpgradeModal(true)}
                    clientEmail={client?.email}
                    clientName={client?.full_name}
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
                shoot_time: (project.shoot_time as string | null) ?? null,
                location: (project.location as string | null) ?? null,
                meeting_point: (project.meeting_point as string | null) ?? null,
                project_type: (project.project_type as string | null) ?? null,
                notes: (project.notes as string | null) ?? null,
                status: (project.status as string) ?? 'inquiry',
                shoot_duration: (project.shoot_duration as string | null) ?? null,
                num_persons: (project.num_persons as number | null) ?? null,
                price: (project.price as string | null) ?? null,
                custom_type_label: (project.custom_type_label as string | null) ?? null,
                custom_type_color: (project.custom_type_color as string | null) ?? null,
                custom_status_label: (project.custom_status_label as string | null) ?? null,
                custom_status_color: (project.custom_status_color as string | null) ?? null,
              }}
            />
          )}

          {activeTab === 'invoice' && (
            <InvoiceTab
              projectId={project.id}
              photographerId={project.photographer_id}
              projectTitle={project.title}
              clientName={client?.full_name}
              clientEmail={client?.email}
              form={invoiceForm}
              setForm={setInvoiceForm}
              saving={savingInvoice}
              setSaving={setSavingInvoice}
              created={invoiceCreated}
              setCreated={setInvoiceCreated}
              invoices={projectInvoices}
              setInvoices={setProjectInvoices}
              invoicesLoaded={invoicesLoaded}
              setInvoicesLoaded={setInvoicesLoaded}
            />
          )}

          {activeTab === 'portal' && (
            <PortalSettingsTab
              projectId={project.id}
              clientToken={(project.client_token as string | null) ?? null}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              initialSections={(project.portal_sections as any) ?? null}
              initialMessage={(project.portal_message as string | null) ?? null}
              initialPassword={(project.portal_password as string | null) ?? null}
              initialLinks={(project.portal_links as { label: string; url: string }[] | null) ?? null}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              initialStepsOverride={(project.project_steps_override as any) ?? null}
              initialMessageTemplates={photographerMessageTemplates ?? null}
              photographerId={project.photographer_id}
            />
          )}

          {activeTab === 'questionnaire' && (
            <QuestionnaireTab
              projectId={project.id}
              photographerId={project.photographer_id}
              clientEmail={(project.client as { email?: string } | null)?.email}
              clientName={(project.client as { full_name?: string } | null)?.full_name}
              clientToken={(project.client_token as string | null) ?? null}
            />
          )}

          {activeTab === 'notes' && (
            <InternalNotesTab
              projectId={project.id}
              initialNotes={(project.internal_notes as string | null) ?? null}
            />
          )}

          {activeTab === 'email' && (
            <EmailTab
              projectId={project.id}
              projectTitle={project.title}
              clientEmail={client?.email}
              clientName={client?.full_name}
              studioName={photographerName}
              portalUrl={project.client_url}
            />
          )}
        </div>
      </div>
    </>
  )
}

// ── Invoice types & component ──────────────────────────────────────────────
interface ProjectInvoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: string
  description: string | null
  due_date: string | null
  created_at: string
}

interface InvoiceTabProps {
  projectId: string
  photographerId: string
  projectTitle: string
  clientName?: string
  clientEmail?: string
  form: { amount: string; description: string; due_date: string; include_mwst: boolean; notes: string }
  setForm: React.Dispatch<React.SetStateAction<{ amount: string; description: string; due_date: string; include_mwst: boolean; notes: string }>>
  saving: boolean
  setSaving: (v: boolean) => void
  created: boolean
  setCreated: (v: boolean) => void
  invoices: ProjectInvoice[]
  setInvoices: React.Dispatch<React.SetStateAction<ProjectInvoice[]>>
  invoicesLoaded: boolean
  setInvoicesLoaded: (v: boolean) => void
}

function InvoiceTab({ projectId, photographerId, projectTitle, clientName, clientEmail, form, setForm, saving, setSaving, created, setCreated, invoices, setInvoices, invoicesLoaded, setInvoicesLoaded }: InvoiceTabProps) {
  const supabase = createClient()
  const locale = useLocale()
  const ti = dashboardT(locale)
  const inv_t = ti.invoice
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Load invoices on first render
  useEffect(() => {
    if (invoicesLoaded) return
    supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, status, description, due_date, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setInvoices(data as ProjectInvoice[])
        setInvoicesLoaded(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const net = parseFloat(form.amount.replace(',', '.')) || 0
  const mwst = form.include_mwst ? net * MWST_RATE : 0
  const gross = net + mwst

  const fmt = (cents: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const statusLabel = (s: string) => {
    if (s === 'paid') return { label: inv_t.status.paid, color: '#3DBA6F', bg: 'rgba(61,186,111,0.10)' }
    if (s === 'sent') return { label: inv_t.status.sent, color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' }
    return { label: inv_t.status.draft, color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' }
  }

  const handleSend = async (inv: ProjectInvoice) => {
    if (!clientEmail) { toast.error(inv_t.toastNoEmail); return }
    setSendingId(inv.id)
    const res = await fetch('/api/invoices/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: inv.id, clientEmail, clientName }),
    })
    if (!res.ok) { toast.error(inv_t.toastSendError); setSendingId(null); return }
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'sent' } : i))
    setSendingId(null)
    toast.success(inv_t.toastSent(clientEmail))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount) { toast.error(inv_t.toastAmountRequired); return }
    setSaving(true)

    const amountCents = Math.round(gross * 100)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
    const descParts: string[] = []
    if (form.description) descParts.push(form.description)
    if (form.include_mwst) descParts.push(`incl. 19% VAT (Netto: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(net)})`)
    const finalDescription = descParts.join(' · ') || null

    const { data, error } = await supabase.from('invoices').insert({
      project_id: projectId,
      photographer_id: photographerId,
      amount: amountCents,
      currency: 'eur',
      status: 'draft',
      description: finalDescription,
      due_date: form.due_date || null,
      invoice_number: invoiceNumber,
      notes: form.notes.trim() || null,
    }).select('id, invoice_number, amount, currency, status, description, due_date, created_at').single()

    if (error) { console.error('Invoice error:', error); toast.error(inv_t.toastError(error.message)); setSaving(false); return }

    // Add to list immediately
    if (data) setInvoices(prev => [data as ProjectInvoice, ...prev])
    setSaving(false)
    setCreated(true)
    setShowForm(false)
    setForm({ amount: '', description: '', due_date: '', include_mwst: false, notes: '' })
    toast.success(inv_t.toastCreated)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.10)' }}>
            <Receipt className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <div>
            <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{inv_t.title}</h3>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{projectTitle}{clientName ? ` · ${clientName}` : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setCreated(false) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: '#F97316' }}
        >
          <Plus className="w-4 h-4" />
          {inv_t.newInvoice}
        </button>
      </div>

      {/* Create form (collapsible) */}
      {showForm && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(249,115,22,0.25)', background: 'var(--bg-surface)' }}>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)' }} />
          <div className="p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{inv_t.amount}</label>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                  <span className="flex-shrink-0 px-3 text-[14px] font-bold select-none" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>€</span>
                  <input type="text" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0,00"
                    className="flex-1 px-3 py-2.5 bg-transparent text-[14px] outline-none" style={{ color: 'var(--text-primary)' }} autoFocus />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ background: form.include_mwst ? 'rgba(196,164,124,0.10)' : 'var(--bg-hover)', border: `1px solid ${form.include_mwst ? 'var(--accent)' : 'var(--border-color)'}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: form.include_mwst ? 'var(--accent-muted)' : 'var(--border-color)' }}>
                    <Percent className="w-3.5 h-3.5" style={{ color: form.include_mwst ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{inv_t.vat}</p>
                    {form.include_mwst && net > 0 && (
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(net)} + {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(mwst)} = <strong style={{ color: 'var(--accent)' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gross)}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, include_mwst: !f.include_mwst }))}
                  style={{ background: form.include_mwst ? 'var(--accent)' : 'var(--border-strong)', width: '40px', height: '22px', borderRadius: '999px', position: 'relative', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s', left: form.include_mwst ? '21px' : '3px' }} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{inv_t.description}</label>
                  <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={inv_t.descriptionPlaceholder} className="input-base w-full" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3 inline mr-1" />Due date
                  </label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input-base w-full" />
                </div>
              </div>

              {/* Notes / Anmerkungen */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {inv_t.notes}
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={inv_t.notesPlaceholder}
                  rows={3}
                  className="input-base w-full resize-none text-[13px]"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {inv_t.notesHint}
                </p>
              </div>

              {net > 0 && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#F97316' }}>{inv_t.preview}</p>
                  <p className="text-[22px] font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gross)}
                  </p>
                  {form.include_mwst && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{inv_t.inclVat}</p>}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-4">{inv_t.cancel}</button>
                <button type="submit" disabled={saving || !form.amount}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.25)' }}>
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" />{inv_t.createInvoice}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {!invoicesLoaded ? (
        <div className="space-y-2">
          <div className="h-16 rounded-xl shimmer" />
          <div className="h-16 rounded-xl shimmer" />
        </div>
      ) : invoices.length === 0 && !showForm ? (
        <div className="text-center py-14 rounded-2xl" style={{ border: '2px dashed var(--border-color)' }}>
          <Receipt className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="font-bold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>{inv_t.noInvoices}</p>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>{inv_t.noInvoicesDesc}</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white mx-auto transition-all hover:opacity-90"
            style={{ background: '#F97316' }}
          >
            <Plus className="w-4 h-4" />
            {inv_t.createInvoice}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const st = statusLabel(inv.status)
            const isSending = sendingId === inv.id
            return (
              <div key={inv.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.10)' }}>
                  <Receipt className="w-4.5 h-4.5" style={{ color: '#F97316', width: '18px', height: '18px' }} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>
                      {projectTitle}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{inv.invoice_number}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {inv.description && (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{inv.description}</span>
                    )}
                    {inv.due_date && (
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        · Due: {new Date(inv.due_date).toLocaleDateString('en-US')}
                      </span>
                    )}
                  </div>
                </div>
                {/* Amount + status */}
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {fmt(inv.amount)}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold mt-0.5"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {inv.status === 'draft' && clientEmail && (
                    <button
                      onClick={() => handleSend(inv)}
                      disabled={isSending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                      style={{ background: '#F97316' }}
                      title="Senden"
                    >
                      {isSending
                        ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Send className="w-3.5 h-3.5" />{inv_t.send}</>
                      }
                    </button>
                  )}
                  <a
                    href="/dashboard/invoices"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                    title={inv_t.allInvoices}
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
