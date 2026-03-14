'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PhotoUploader from './PhotoUploader'
import { Images, Settings, Share2, Trash2, Heart, GripVertical, Lock, Plus, Palette, ChevronDown, ChevronRight, Pencil, Check, X, GripHorizontal, Sparkles } from 'lucide-react'
import { cn, copyToClipboard } from '@/lib/utils'
import { GALLERY_THEMES, getTheme } from '@/lib/galleryThemes'
import toast from 'react-hot-toast'

// Creative set name suggestions
const SET_NAME_SUGGESTIONS = [
  'Augenblicke', 'Momente', 'Highlights', 'Impressionen', 'Erinnerungen',
  'Stimmungen', 'Facetten', 'Einblicke', 'Begegnungen', 'Emotionen',
  'Getting Ready', 'Trauung', 'Feier', 'Portraits', 'Details',
]

interface Photo {
  id: string
  storage_url: string
  thumbnail_url: string | null
  filename: string
  file_size: number
  display_order: number
  is_favorite: boolean
  section_id?: string | null
}

interface Section {
  id: string
  title: string
  display_order: number
}

interface Gallery {
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
  design_theme?: string | null
  tags_enabled?: string[] | null
}

interface Props {
  projectId: string
  photographerId: string
  clientUrl: string
  gallery: Gallery | null
  photos: Photo[]
  showWatermark: boolean
}

// Sortable photo item
function SortablePhoto({
  photo,
  selected,
  onSelect,
  onDelete,
}: {
  photo: Photo
  selected: boolean
  onSelect: (id: string, shiftKey?: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all',
        selected ? 'border-[#C8A882]' : 'border-transparent'
      )}
    >
      <img
        src={photo.thumbnail_url || photo.storage_url}
        alt={photo.filename}
        className="w-full aspect-square object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
      <button
        onClick={(e) => onSelect(photo.id, e.shiftKey)}
        className={cn(
          'absolute top-2 left-2 w-5 h-5 rounded border-2 transition-all',
          selected ? 'bg-[#C8A882] border-[#C8A882]' : 'bg-white/80 border-white opacity-0 group-hover:opacity-100'
        )}
      >
        {selected && (
          <svg className="w-3 h-3 text-white mx-auto" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 w-6 h-6 bg-black/40 rounded flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-all"
      >
        <GripVertical className="w-3.5 h-3.5 text-white" />
      </div>
      {photo.is_favorite && (
        <div className="absolute bottom-2 left-2">
          <Heart className="w-3.5 h-3.5 text-white fill-white" />
        </div>
      )}
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute bottom-2 right-2 w-6 h-6 bg-[#E84C1A]/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3 h-3 text-white" />
      </button>
    </div>
  )
}

export default function GalleryTab({ projectId, photographerId, clientUrl, gallery: initialGallery, photos: initialPhotos, showWatermark }: Props) {
  const [gallery, setGallery] = useState<Gallery | null>(initialGallery)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [sections, setSections] = useState<Section[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'design' | 'sections'>('general')
  const [uploadSectionId, setUploadSectionId] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  // Gallery creation modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTheme, setCreateTheme] = useState('classic-white')
  const [creating, setCreating] = useState(false)
  // Shift-click selection
  const lastSelectedRef = useRef<string | null>(null)

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState(gallery?.title || 'Galerie')
  const [settingsDesc, setSettingsDesc] = useState(gallery?.description || '')
  const [settingsDownload, setSettingsDownload] = useState(gallery?.download_enabled ?? true)
  const [settingsComments, setSettingsComments] = useState(gallery?.comments_enabled ?? true)
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsExpiry, setSettingsExpiry] = useState(gallery?.expires_at?.split('T')[0] || '')
  const [selectedTheme, setSelectedTheme] = useState(gallery?.design_theme || 'classic-white')
  // Tags enabled: default all enabled if not set
  const defaultTags = gallery?.tags_enabled ?? ['green', 'yellow', 'red']
  const [enabledTags, setEnabledTags] = useState<string[]>(defaultTags)

  const toggleTag = (tag: string) => {
    setEnabledTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const supabase = createClient()

  // Load sections
  useEffect(() => {
    if (!gallery) return
    supabase
      .from('gallery_sections')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('display_order')
      .then(({ data }) => {
        if (data) setSections(data)
      })
  }, [gallery?.id])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({ ...p, display_order: i }))
    setPhotos(reordered)
    await Promise.all(reordered.map((p) => supabase.from('photos').update({ display_order: p.display_order }).eq('id', p.id)))
  }

  const toggleSelect = (id: string, shiftKey?: boolean) => {
    if (shiftKey && lastSelectedRef.current) {
      // Find all visible photos in order (sections + unsectioned)
      const allVisible: string[] = []
      sections.forEach(s => {
        photos.filter(p => p.section_id === s.id).forEach(p => allVisible.push(p.id))
      })
      photos.filter(p => !p.section_id).forEach(p => allVisible.push(p.id))

      const lastIdx = allVisible.indexOf(lastSelectedRef.current)
      const currIdx = allVisible.indexOf(id)
      if (lastIdx !== -1 && currIdx !== -1) {
        const [from, to] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx]
        const rangeIds = allVisible.slice(from, to + 1)
        setSelected(prev => {
          const next = new Set(prev)
          rangeIds.forEach(rid => next.add(rid))
          return next
        })
        lastSelectedRef.current = id
        return
      }
    }
    lastSelectedRef.current = id
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const selectAll = () => setSelected(new Set(photos.map((p) => p.id)))
  const clearSelection = () => setSelected(new Set())

  const deleteSelected = async () => {
    if (!confirm(`${selected.size} ${selected.size === 1 ? 'Foto' : 'Fotos'} wirklich löschen?`)) return
    const ids = Array.from(selected)
    for (const id of ids) {
      const photo = photos.find((p) => p.id === id)
      if (photo) {
        try { const url = new URL(photo.storage_url); const path = url.pathname.split('/photos/')[1]; if (path) await supabase.storage.from('photos').remove([path]) } catch {}
      }
      await supabase.from('photos').delete().eq('id', id)
    }
    setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)))
    setSelected(new Set())
    toast.success(`${ids.length} ${ids.length === 1 ? 'Foto' : 'Fotos'} gelöscht`)
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Foto wirklich löschen?')) return
    const photo = photos.find((p) => p.id === id)
    if (photo) {
      try { const url = new URL(photo.storage_url); const path = url.pathname.split('/photos/')[1]; if (path) await supabase.storage.from('photos').remove([path]) } catch {}
    }
    await supabase.from('photos').delete().eq('id', id)
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    toast.success('Foto gelöscht')
  }

  const createGallery = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('galleries')
      .insert({
        project_id: projectId,
        title: 'Galerie',
        status: 'active',
        watermark: showWatermark,
        download_enabled: true,
        view_count: 0,
        download_count: 0,
        design_theme: createTheme,
      })
      .select().single()
    if (error) { toast.error('Fehler beim Erstellen der Galerie'); setCreating(false); return }
    setGallery(data)
    setSelectedTheme(createTheme)
    setShowCreateModal(false)
    setShowUploader(true)
    setCreating(false)
    toast.success('Galerie erstellt!')
  }

  const saveSettings = async () => {
    if (!gallery) return
    setSavingSettings(true)
    const updates: Record<string, unknown> = {
      title: settingsTitle,
      description: settingsDesc || null,
      download_enabled: settingsDownload,
      comments_enabled: settingsComments,
      expires_at: settingsExpiry ? new Date(settingsExpiry).toISOString() : null,
      design_theme: selectedTheme,
      tags_enabled: enabledTags,
    }
    if (settingsPassword) updates.password = settingsPassword
    const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
    if (error) { toast.error('Fehler beim Speichern') } else {
      setGallery((prev) => prev ? { ...prev, ...updates as Partial<Gallery> } : prev)
      setShowSettings(false)
      toast.success('Einstellungen gespeichert')
    }
    setSavingSettings(false)
  }

  const toggleGalleryStatus = async () => {
    if (!gallery) return
    const newStatus = gallery.status === 'active' ? 'draft' : 'active'
    await supabase.from('galleries').update({ status: newStatus }).eq('id', gallery.id)
    setGallery((prev) => prev ? { ...prev, status: newStatus } : prev)
    toast.success(newStatus === 'active' ? 'Galerie aktiviert' : 'Galerie deaktiviert')
  }

  const shareGallery = async () => {
    const url = `${clientUrl}/gallery`
    const ok = await copyToClipboard(url)
    if (ok) toast.success('Link kopiert!')
  }

  // Section management
  const addSection = async (customTitle?: string) => {
    if (!gallery) return
    const order = sections.length
    const title = customTitle || SET_NAME_SUGGESTIONS[order % SET_NAME_SUGGESTIONS.length]
    const { data, error } = await supabase
      .from('gallery_sections')
      .insert({ gallery_id: gallery.id, title, display_order: order })
      .select().single()
    if (error) { toast.error('Fehler'); return }
    setSections(prev => [...prev, data])
    toast.success(`Set "${title}" erstellt`)
  }

  const renameSection = async (id: string) => {
    if (!editingSectionTitle.trim()) { setEditingSectionId(null); return }
    const { error } = await supabase.from('gallery_sections').update({ title: editingSectionTitle.trim() }).eq('id', id)
    if (error) { toast.error('Fehler'); return }
    setSections(prev => prev.map(s => s.id === id ? { ...s, title: editingSectionTitle.trim() } : s))
    setEditingSectionId(null)
    toast.success('Set umbenannt')
  }

  const deleteSection = async (id: string) => {
    if (!confirm('Set löschen? Fotos bleiben erhalten.')) return
    await supabase.from('gallery_sections').delete().eq('id', id)
    // Unassign photos from this section
    await supabase.from('photos').update({ section_id: null }).eq('section_id', id)
    setSections(prev => prev.filter(s => s.id !== id))
    setPhotos(prev => prev.map(p => p.section_id === id ? { ...p, section_id: null } : p))
    toast.success('Set gelöscht')
  }

  const assignPhotosToSection = async (sectionId: string | null) => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    await Promise.all(ids.map(id => supabase.from('photos').update({ section_id: sectionId }).eq('id', id)))
    setPhotos(prev => prev.map(p => ids.includes(p.id) ? { ...p, section_id: sectionId } : p))
    setSelected(new Set())
    toast.success(`${ids.length} Fotos zugewiesen`)
  }

  const toggleCollapseSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!gallery) {
    return (
      <>
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-hover)' }}>
            <Images className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Noch keine Galerie für dieses Projekt</p>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors" style={{ background: 'var(--text-primary)' }}>
            Galerie erstellen
          </button>
        </div>

        {/* Gallery creation modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Neue Galerie</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Wähle ein Design-Template</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GALLERY_THEMES.map(theme => (
                    <button
                      key={theme.key}
                      onClick={() => setCreateTheme(theme.key)}
                      className="relative rounded-xl overflow-hidden text-left transition-all"
                      style={{
                        border: createTheme === theme.key ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                        boxShadow: createTheme === theme.key ? '0 0 0 3px rgba(196,164,124,0.2)' : 'none',
                      }}
                    >
                      <div className="h-14 flex flex-col justify-between p-2" style={{ background: theme.bg }}>
                        <div className="flex gap-1">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex-1 rounded" style={{ height: '18px', background: theme.surface, border: `1px solid ${theme.border}` }} />
                          ))}
                        </div>
                        <div className="h-1 rounded-full w-1/2" style={{ background: theme.accent, opacity: 0.7 }} />
                      </div>
                      <div className="px-2 py-1.5" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
                        <p className="text-[11px] font-semibold truncate" style={{ color: theme.text }}>{theme.name}</p>
                      </div>
                      {createTheme === theme.key && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Abbrechen</button>
                <button
                  onClick={createGallery}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {creating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles className="w-4 h-4" />Galerie erstellen</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const unsectionedPhotos = photos.filter(p => !p.section_id)
  const currentTheme = getTheme(selectedTheme)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{gallery.title}</h3>
          <button
            onClick={toggleGalleryStatus}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer"
            style={{
              background: gallery.status === 'active' ? 'rgba(61,186,111,0.12)' : 'rgba(107,114,128,0.10)',
              color: gallery.status === 'active' ? '#3DBA6F' : 'var(--text-muted)',
              border: `1px solid ${gallery.status === 'active' ? 'rgba(61,186,111,0.25)' : 'var(--border-color)'}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block" style={{ background: gallery.status === 'active' ? '#3DBA6F' : 'var(--text-muted)' }} />
            {gallery.status === 'active' ? 'Aktiv' : 'Entwurf'}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{photos.length} Fotos · {gallery.view_count} Aufrufe</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={shareGallery} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Share2 className="w-3.5 h-3.5" />Teilen
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Settings className="w-3.5 h-3.5" />Einstellungen
          </button>
          <button onClick={() => { setUploadSectionId(null); setShowUploader(!showUploader) }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-white" style={{ background: 'var(--text-primary)' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            + Fotos hochladen
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
          {/* Settings tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
            {[
              { key: 'general', label: 'Allgemein', icon: Settings },
              { key: 'design', label: 'Design', icon: Palette },
              { key: 'sections', label: 'Sets', icon: GripHorizontal },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSettingsTab(key as 'general' | 'design' | 'sections')}
                className="flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 text-[13px] font-medium rounded-md transition-all"
                style={{
                  background: activeSettingsTab === key ? 'var(--bg-surface)' : 'transparent',
                  color: activeSettingsTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: activeSettingsTab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* General tab */}
          {activeSettingsTab === 'general' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Titel</label>
                  <input type="text" value={settingsTitle} onChange={(e) => setSettingsTitle(e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Passwort (optional)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input type="password" value={settingsPassword} onChange={(e) => setSettingsPassword(e.target.value)} placeholder={gallery.password ? '••••••••' : 'Kein Passwort'} className="input-base pl-9" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Beschreibung</label>
                  <input type="text" value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} placeholder="Optional" className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Ablaufdatum (optional)</label>
                  <input type="date" value={settingsExpiry} onChange={(e) => setSettingsExpiry(e.target.value)} className="input-base" />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { label: 'Download erlauben', value: settingsDownload, onChange: () => setSettingsDownload(!settingsDownload), color: 'var(--accent)' },
                  { label: 'Galerie aktiv', value: gallery.status === 'active', onChange: toggleGalleryStatus, color: '#3DBA6F' },
                  { label: 'Kommentare erlauben', value: settingsComments, onChange: () => setSettingsComments(!settingsComments), color: 'var(--accent)' },
                ].map(({ label, value, onChange, color }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <div onClick={onChange} className="relative cursor-pointer rounded-full transition-all" style={{ width: '36px', height: '20px', background: value ? color : 'var(--border-strong)' }}>
                      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: value ? '16px' : '2px' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  </label>
                ))}
                {/* Single tag toggle */}
                {(() => {
                  const tagsOn = enabledTags.length > 0
                  return (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setEnabledTags(tagsOn ? [] : ['green', 'yellow', 'red'])}
                        className="relative cursor-pointer rounded-full transition-all"
                        style={{ width: '36px', height: '20px', background: tagsOn ? '#22C55E' : 'var(--border-strong)' }}
                      >
                        <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: tagsOn ? '16px' : '2px' }} />
                      </div>
                      <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                        <span className="flex gap-0.5">
                          {['#22C55E','#EAB308','#EF4444'].map(c => (
                            <span key={c} className="w-2 h-2 rounded-full inline-block" style={{ background: c, opacity: tagsOn ? 1 : 0.3 }} />
                          ))}
                        </span>
                        Tag Auswahl
                      </span>
                    </label>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Design tab — 10 themes */}
          {activeSettingsTab === 'design' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Wähle ein Layout für die Kunden-Galerie</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GALLERY_THEMES.map(theme => (
                  <button
                    key={theme.key}
                    onClick={() => setSelectedTheme(theme.key)}
                    className="relative rounded-xl overflow-hidden transition-all text-left"
                    style={{
                      border: selectedTheme === theme.key ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                      boxShadow: selectedTheme === theme.key ? '0 0 0 3px rgba(196,164,124,0.2)' : 'none',
                    }}
                  >
                    {/* Theme preview */}
                    <div className="h-16 flex flex-col justify-between p-2" style={{ background: theme.bg }}>
                      <div className="flex gap-1">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex-1 rounded" style={{ height: '20px', background: theme.surface, border: `1px solid ${theme.border}` }} />
                        ))}
                      </div>
                      <div className="h-1.5 rounded-full w-2/3" style={{ background: theme.accent, opacity: 0.6 }} />
                    </div>
                    <div className="px-2 py-1.5" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
                      <p className="text-[11px] font-semibold truncate" style={{ color: theme.text, fontFamily: theme.fontFamily }}>{theme.name}</p>
                      <p className="text-[10px]" style={{ color: theme.textMuted }}>{theme.grid === '2col' ? '2 Spalten' : theme.grid === '3col' ? '3 Spalten' : theme.grid === '4col' ? '4 Spalten' : 'Masonry'}</p>
                    </div>
                    {selectedTheme === theme.key && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-lg text-[12px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                Aktuell: <strong style={{ color: 'var(--text-primary)' }}>{currentTheme.name}</strong> · {currentTheme.grid === '2col' ? '2 Spalten' : currentTheme.grid === '3col' ? '3 Spalten' : currentTheme.grid === '4col' ? '4 Spalten' : 'Masonry'} · {currentTheme.fontFamily.split(',')[0].replace(/"/g, '')}
              </div>
            </div>
          )}

          {/* Sections tab */}
          {activeSettingsTab === 'sections' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Teile deine Galerie in Sets auf (z.B. Getting Ready, Trauung)</p>
                <button onClick={() => addSection()} className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg text-white" style={{ background: 'var(--accent)' }}>
                  <Plus className="w-3 h-3" />Set
                </button>
              </div>
              {sections.length === 0 ? (
                <div className="text-center py-6 rounded-lg" style={{ border: '2px dashed var(--border-color)' }}>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Noch keine Sets. Erstelle Sets um Fotos zu gruppieren.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map(section => (
                    <div key={section.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                      <GripHorizontal className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      {editingSectionId === section.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input autoFocus value={editingSectionTitle} onChange={e => setEditingSectionTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameSection(section.id); if (e.key === 'Escape') setEditingSectionId(null) }} className="input-base py-1 text-[13px] flex-1" />
                          <button onClick={() => renameSection(section.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditingSectionId(null)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{section.title}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{photos.filter(p => p.section_id === section.id).length} Fotos</span>
                          <button onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title) }} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => deleteSection(section.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(232,76,26,0.1)', color: '#E84C1A' }}><Trash2 className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button onClick={saveSettings} disabled={savingSettings} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--text-primary)' }}>
              {savingSettings ? 'Speichern...' : 'Speichern'}
            </button>
            <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Uploader */}
      {showUploader && (
        <div className="space-y-2">
          {sections.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Hochladen in:</span>
              <select value={uploadSectionId || ''} onChange={e => setUploadSectionId(e.target.value || null)} className="input-base py-1 text-[13px]" style={{ width: 'auto' }}>
                <option value="">Kein Set (allgemein)</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}
          <PhotoUploader
            galleryId={gallery.id}
            photographerId={photographerId}
            sectionId={uploadSectionId}
            onUploadComplete={(newPhotos) => {
              setPhotos((prev) => [...prev, ...newPhotos.map((p) => ({ ...p, is_favorite: false, section_id: uploadSectionId }))])
              setShowUploader(false)
            }}
          />
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg flex-wrap" style={{ background: 'rgba(200,168,130,0.10)', border: '1px solid rgba(200,168,130,0.20)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.size} ausgewählt</span>
          <button onClick={clearSelection} className="text-xs" style={{ color: 'var(--text-muted)' }}>Auswahl aufheben</button>
          <button onClick={selectAll} className="text-xs" style={{ color: 'var(--text-muted)' }}>Alle auswählen</button>
          {sections.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Zuweisen zu:</span>
              <select onChange={e => assignPhotosToSection(e.target.value || null)} className="text-xs rounded px-2 py-1" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                <option value="">Kein Set</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}
          <button onClick={deleteSelected} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg" style={{ background: '#E84C1A' }}>
            <Trash2 className="w-3 h-3" />Löschen
          </button>
        </div>
      )}

      {/* Photo grid — grouped by sections */}
      {photos.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
          <Images className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Noch keine Fotos. Lade deine ersten Fotos hoch.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sections with photos */}
          {sections.map(section => {
            const sectionPhotos = photos.filter(p => p.section_id === section.id)
            const isCollapsed = collapsedSections.has(section.id)
            return (
              <div key={section.id}>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => toggleCollapseSection(section.id)} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {section.title}
                  </button>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{sectionPhotos.length}</span>
                  <button onClick={() => { setUploadSectionId(section.id); setShowUploader(true) }} className="ml-auto flex items-center gap-1 text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    <Plus className="w-3 h-3" />Fotos
                  </button>
                </div>
                {!isCollapsed && (
                  sectionPhotos.length === 0 ? (
                    <div className="text-center py-6 rounded-lg" style={{ border: '2px dashed var(--border-color)' }}>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Keine Fotos in diesem Set</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={sectionPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {sectionPhotos.map(photo => (
                            <SortablePhoto key={photo.id} photo={photo} selected={selected.has(photo.id)} onSelect={(id, shift) => toggleSelect(id, shift)} onDelete={deletePhoto} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )
                )}
              </div>
            )
          })}

          {/* Unsectioned photos */}
          {(unsectionedPhotos.length > 0 || sections.length === 0) && (
            <div>
              {sections.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Ohne Set</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{unsectionedPhotos.length}</span>
                </div>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={unsectionedPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {unsectionedPhotos.map(photo => (
                      <SortablePhoto key={photo.id} photo={photo} selected={selected.has(photo.id)} onSelect={(id, shift) => toggleSelect(id, shift)} onDelete={deletePhoto} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
