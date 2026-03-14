'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Images, Clock, Plus, ArrowLeft, Pencil, Check, X } from 'lucide-react'
import ContractTab from './ContractTab'
import GalleryTab from './GalleryTab'
import TimelineBuilder from './TimelineBuilder'
import type { Contract, Timeline, Plan } from '@/types/database'
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

interface Props {
  project: { id: string; title: string; client_url: string; photographer_id: string; [key: string]: unknown }
  contracts: Contract[]
  galleries: GalleryItem[]
  timeline: Timeline | null
  plan: Plan
}

const TABS = [
  { key: 'contract', label: 'Vertrag', icon: FileText },
  { key: 'gallery', label: 'Galerie', icon: Images },
  { key: 'timeline', label: 'Zeitplan', icon: Clock },
]

export default function ProjectTabs({ project, contracts, galleries: initialGalleries, timeline, plan }: Props) {
  const [activeTab, setActiveTab] = useState('contract')
  const [galleries, setGalleries] = useState<GalleryItem[]>(initialGalleries)
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null)
  const [creatingGallery, setCreatingGallery] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const supabase = createClient()
  const client = project.client as { full_name?: string; email?: string } | null

  // Extract timeline data
  const timelineId = timeline?.id ?? null
  const timelineEvents = (timeline?.events as { id: string; time: string; title: string; location?: string; duration_minutes?: number; phase: 'preparation' | 'shoot' | 'wrap' | 'other'; notes?: string; photographer_note?: string }[]) ?? []

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

  // Gallery list view (when no gallery is selected)
  const GalleryListView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
          Galerien ({galleries.length})
        </h3>
        <button
          onClick={createGallery}
          disabled={creatingGallery}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg text-white transition-colors disabled:opacity-50"
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
            onClick={createGallery}
            disabled={creatingGallery}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {creatingGallery ? 'Erstelle...' : 'Erste Galerie erstellen'}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {galleries.map(g => {
            const coverPhoto = g.photos?.[0]
            const photoCount = g.photos?.length ?? 0
            const isActive = g.status === 'active'

            return (
              <div
                key={g.id}
                className="group rounded-xl overflow-hidden cursor-pointer transition-all"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,164,124,0.4)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
                onClick={() => setSelectedGalleryId(g.id)}
              >
                {/* Cover */}
                <div className="relative h-32 overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  {coverPhoto ? (
                    <img
                      src={coverPhoto.thumbnail_url || coverPhoto.storage_url}
                      alt={g.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-8 h-8" style={{ color: 'var(--border-strong)' }} />
                    </div>
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: isActive ? 'rgba(42,155,104,0.85)' : 'rgba(107,114,128,0.75)',
                        color: '#fff',
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      {isActive ? 'Aktiv' : 'Entwurf'}
                    </span>
                  </div>
                  {photoCount > 0 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[11px] font-semibold text-white/90">{photoCount} Fotos</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-3 flex items-center justify-between gap-2">
                  {editingTitleId === g.id ? (
                    <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
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
                    <>
                      <span className="font-medium text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>{g.title}</span>
                      <button
                        onClick={e => { e.stopPropagation(); startRenaming(g) }}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                        title="Umbenennen"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </>
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
          />
        )}

        {activeTab === 'gallery' && (
          <>
            {selectedGallery ? (
              <div>
                {/* Back button */}
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

        {activeTab === 'timeline' && (
          <TimelineBuilder
            projectId={project.id}
            timelineId={timelineId}
            initialEvents={timelineEvents}
          />
        )}
      </div>
    </div>
  )
}
