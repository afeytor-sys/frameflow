'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Images, CalendarDays, Plus, ArrowLeft, Pencil, Check, X } from 'lucide-react'
import ContractTab from './ContractTab'
import GalleryTab from './GalleryTab'
import BookingDetailsTab from './BookingDetailsTab'
import type { Contract, Plan } from '@/types/database'
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
}

const TABS = [
  { key: 'contract', label: 'Vertrag',          icon: FileText },
  { key: 'gallery',  label: 'Galerie',           icon: Images },
  { key: 'booking',  label: 'Booking Details',   icon: CalendarDays },
]

export default function ProjectTabs({ project, contracts, galleries: initialGalleries, plan }: Props) {
  const [activeTab, setActiveTab] = useState('contract')
  const [galleries, setGalleries] = useState<GalleryItem[]>(initialGalleries)
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null)
  const [creatingGallery, setCreatingGallery] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

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
                {/* Cover — 4:3 landscape ratio (Pixiset style) */}
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
                  {/* subtle overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
                </div>

                {/* Body — Pixiset style: title + meta below image */}
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
      </div>
    </div>
  )
}
