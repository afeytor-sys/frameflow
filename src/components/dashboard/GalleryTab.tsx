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
import { Images, Settings, Share2, Trash2, Heart, GripVertical, Lock, Plus, Palette, ChevronDown, ChevronRight, Pencil, Check, X, GripHorizontal, Sparkles, Download, Loader2, Eye, MessageSquare, EyeOff, Star, Image as ImageIcon } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils'
import GalleryShareModal from './GalleryShareModal'
import { cn } from '@/lib/utils'
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
  is_private?: boolean
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
  guest_password?: string | null
  cover_photo_id?: string | null
  watermark: boolean
  download_enabled: boolean
  comments_enabled: boolean
  expires_at: string | null
  view_count: number
  download_count: number
  photo_download_count?: number
  design_theme?: string | null
  tags_enabled?: string[] | null
}

interface Props {
  projectId: string
  photographerId: string
  clientUrl: string
  publicGalleryUrl?: string
  gallery: Gallery | null
  photos: Photo[]
  showWatermark: boolean
  // Storage limit props (from usePlanLimits)
  canUploadFile?: (fileSizeBytes: number) => boolean
  maxStorageBytes?: number | null
  storageUsedBytes?: number
  onStorageLimitReached?: () => void
  clientEmail?: string | null
  clientName?: string | null
}

// Sortable photo item
function SortablePhoto({
  photo,
  selected,
  isCover,
  onSelect,
  onDelete,
  onTogglePrivate,
  onSetCover,
}: {
  photo: Photo
  selected: boolean
  isCover: boolean
  onSelect: (id: string, shiftKey?: boolean) => void
  onDelete: (id: string) => void
  onTogglePrivate: (id: string) => void
  onSetCover: (id: string) => void
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
        selected ? 'border-[#C8A882]' : isCover ? 'border-[#F59E0B]' : 'border-transparent'
      )}
    >
      <img
        src={getPhotoUrl(photo.thumbnail_url || photo.storage_url, 400, 75, 'cover')}
        alt={photo.filename}
        className={cn('w-full aspect-square object-cover', photo.is_private && 'opacity-60')}
        loading="lazy"
        decoding="async"
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
      {/* Bottom-left indicators */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        {photo.is_favorite && <Heart className="w-3.5 h-3.5 text-white fill-white drop-shadow" />}
        {photo.is_private && <EyeOff className="w-3.5 h-3.5 text-white drop-shadow" />}
        {isCover && <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B] drop-shadow" />}
      </div>
      {/* Bottom-right actions */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {/* Set as cover */}
        <button
          onClick={() => onSetCover(photo.id)}
          title={isCover ? 'Ist Titelbild' : 'Als Titelbild setzen'}
          className={cn('w-6 h-6 rounded flex items-center justify-center transition-all', isCover ? 'bg-[#F59E0B]' : 'bg-black/50')}
        >
          <Star className={cn('w-3 h-3', isCover ? 'text-white fill-white' : 'text-white')} />
        </button>
        {/* Toggle private */}
        <button
          onClick={() => onTogglePrivate(photo.id)}
          title={photo.is_private ? 'Privat (nur Kunden-PW)' : 'Öffentlich machen'}
          className={cn('w-6 h-6 rounded flex items-center justify-center transition-all', photo.is_private ? 'bg-[#8B5CF6]' : 'bg-black/50')}
        >
          {photo.is_private ? <EyeOff className="w-3 h-3 text-white" /> : <Eye className="w-3 h-3 text-white" />}
        </button>
        {/* Delete */}
        <button
          onClick={() => onDelete(photo.id)}
          className="w-6 h-6 bg-[#E84C1A]/80 rounded flex items-center justify-center"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  )
}

export default function GalleryTab({ projectId, photographerId, clientUrl, publicGalleryUrl, gallery: initialGallery, photos: initialPhotos, showWatermark, canUploadFile, maxStorageBytes, storageUsedBytes, onStorageLimitReached, clientEmail, clientName }: Props) {
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
  // Client favorites list
  const [favoriteListName, setFavoriteListName] = useState<string | null>(null)
  const [downloadingFavorites, setDownloadingFavorites] = useState(false)
  const [favDownloadProgress, setFavDownloadProgress] = useState(0)
  // Comment count
  const [commentCount, setCommentCount] = useState(0)

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState(gallery?.title || 'Galerie')
  const [settingsDesc, setSettingsDesc] = useState(gallery?.description || '')
  const [settingsDownload, setSettingsDownload] = useState(gallery?.download_enabled ?? true)
  const [settingsComments, setSettingsComments] = useState(gallery?.comments_enabled ?? true)
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsGuestPassword, setSettingsGuestPassword] = useState('')
  const [settingsExpiry, setSettingsExpiry] = useState(gallery?.expires_at?.split('T')[0] || '')
  const [selectedTheme, setSelectedTheme] = useState(gallery?.design_theme || 'classic-white')
  // Tags enabled: default all enabled if not set
  const defaultTags = gallery?.tags_enabled ?? ['green', 'yellow', 'red']
  const [enabledTags, setEnabledTags] = useState<string[]>(defaultTags)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const supabase = createClient()

  // Load photos via API (service client, bypasses RLS) when component mounts
  // This ensures photos are always loaded regardless of RLS policies
  useEffect(() => {
    if (!gallery) return
    fetch(`/api/photos/by-gallery?galleryId=${gallery.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.photos && Array.isArray(data.photos)) {
          setPhotos(data.photos)
        }
      })
      .catch(() => {})
  }, [gallery?.id])

  // Load sections + favorite list name + comment count
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
    supabase
      .from('galleries')
      .select('favorite_list_name')
      .eq('id', gallery.id)
      .single()
      .then(({ data }) => {
        if (data?.favorite_list_name) setFavoriteListName(data.favorite_list_name)
      })
    // Count comments across all photos in this gallery
    supabase
      .from('photo_comments')
      .select('id', { count: 'exact', head: true })
      .in('photo_id', initialPhotos.map(p => p.id))
      .then(({ count }) => {
        if (count !== null) setCommentCount(count)
      })
  }, [gallery?.id])

  // Download favorites as ZIP
  const downloadFavorites = async () => {
    const favoritePhotos = photos.filter(p => p.is_favorite)
    if (favoritePhotos.length === 0) return
    setDownloadingFavorites(true)
    setFavDownloadProgress(0)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const total = favoritePhotos.length
      let done = 0
      for (let i = 0; i < favoritePhotos.length; i += 5) {
        const batch = favoritePhotos.slice(i, i + 5)
        await Promise.all(batch.map(async (photo) => {
          try { const r = await fetch(photo.storage_url); zip.file(photo.filename, await r.blob()) } catch {}
          done++
          setFavDownloadProgress(Math.round((done / total) * 100))
        }))
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${favoriteListName || 'Favoriten'}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${total} Favoriten heruntergeladen!`)
    } catch {
      toast.error('Download fehlgeschlagen')
    } finally {
      setDownloadingFavorites(false)
      setFavDownloadProgress(0)
    }
  }

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
    if (!confirm(`Really delete ${selected.size} ${selected.size === 1 ? 'photo' : 'photos'}?`)) return
    const ids = Array.from(selected)
    await Promise.all(ids.map(async (id) => {
      const photo = photos.find((p) => p.id === id)
      try {
        await fetch(`/api/photos/${id}/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageUrl: photo?.storage_url || '' }),
        })
      } catch {}
    }))
    setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)))
    setSelected(new Set())
    toast.success(`${ids.length} ${ids.length === 1 ? 'photo' : 'photos'} deleted`)
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Really delete this photo?')) return
    const photo = photos.find((p) => p.id === id)
    try {
      await fetch(`/api/photos/${id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageUrl: photo?.storage_url || '' }),
      })
    } catch {}
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    toast.success('Photo deleted')
  }

  const createGallery = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/galleries/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: 'Galerie',
          status: 'active',
          watermark: showWatermark,
          download_enabled: true,
          comments_enabled: true,
          view_count: 0,
          download_count: 0,
          design_theme: createTheme,
          tags_enabled: ['green', 'yellow', 'red'],
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Fehler beim Erstellen'); setCreating(false); return }
      setGallery(json.gallery)
      setSelectedTheme(createTheme)
      setShowCreateModal(false)
      setShowUploader(true)
      toast.success('Galerie erstellt!')
    } catch {
      toast.error('Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  const togglePhotoPrivate = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    const newVal = !photo.is_private
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_private: newVal } : p))
    await supabase.from('photos').update({ is_private: newVal }).eq('id', photoId)
    toast.success(newVal ? 'Foto privat (nur Kunden-PW)' : 'Foto öffentlich')
  }

  const setCoverPhoto = async (photoId: string) => {
    if (!gallery) return
    const newCoverId = gallery.cover_photo_id === photoId ? null : photoId
    await supabase.from('galleries').update({ cover_photo_id: newCoverId }).eq('id', gallery.id)
    setGallery(prev => prev ? { ...prev, cover_photo_id: newCoverId } : prev)
    toast.success(newCoverId ? 'Titelbild gesetzt' : 'Titelbild entfernt')
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
    if (settingsGuestPassword !== '') updates.guest_password = settingsGuestPassword || null
    const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
    if (error) { toast.error('Error saving') } else {
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

  // ── Progressive loading (dashboard grid) ─────────────────────────────────
  const DASH_LIMIT = 50
  const [visibleCount, setVisibleCount] = useState(DASH_LIMIT)

  // ── Share Modal state ──────────────────────────────────────────────────────
  const [shareModal, setShareModal] = useState(false)

  const getGalleryUrl = () => {
    if (publicGalleryUrl) return publicGalleryUrl
    // Extract token from clientUrl: /client/[token]
    const token = clientUrl.split('/client/')[1]?.split('/')[0]
    return token ? `${window.location.origin}/gallery/${token}` : `${clientUrl}/gallery`
  }

  const shareGallery = () => setShareModal(true)

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
    if (!confirm('Delete set? Photos will be kept.')) return
    await supabase.from('gallery_sections').delete().eq('id', id)
    // Unassign photos from this section
    await supabase.from('photos').update({ section_id: null }).eq('section_id', id)
    setSections(prev => prev.filter(s => s.id !== id))
    setPhotos(prev => prev.map(p => p.section_id === id ? { ...p, section_id: null } : p))
    toast.success('Set deleted')
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
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No gallery for this project yet</p>
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
                  <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>New gallery</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose a design template</p>
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
                <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
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
      {/* ── Share Gallery Modal ──────────────────────────────────────────── */}
      <GalleryShareModal
        open={shareModal}
        onClose={() => setShareModal(false)}
        galleryTitle={gallery.title}
        galleryUrl={getGalleryUrl()}
        galleryPassword={gallery.password}
        galleryGuestPassword={gallery.guest_password ?? null}
        galleryId={gallery.id}
        clientEmail={clientEmail}
        clientName={clientName || undefined}
      />

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
            {gallery.status === 'active' ? 'Aktiv' : 'Draft'}
          </button>
          {/* ── Stats pills ── */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { icon: Images, label: 'Fotos', value: photos.length, color: 'var(--text-muted)' },
              { icon: Eye, label: 'Aufrufe', value: gallery.view_count, color: 'var(--text-muted)' },
              { icon: Download, label: 'Foto-DL', value: gallery.photo_download_count ?? 0, color: '#3B82F6', title: 'Einzelfoto-Downloads' },
              { icon: Download, label: 'Galerie-DL', value: gallery.download_count, color: '#8B5CF6', title: 'Galerie-Downloads (ZIP)' },
              { icon: Heart, label: 'Favoriten', value: photos.filter(p => p.is_favorite).length, color: '#EF4444' },
              { icon: EyeOff, label: 'Privat', value: photos.filter(p => p.is_private).length, color: '#8B5CF6', title: 'Private Fotos (nur Kunden-PW)' },
              { icon: MessageSquare, label: 'Kommentare', value: commentCount, color: '#F59E0B' },
            ].map(({ icon: Icon, label, value, color, title }) => (
              <div
                key={label}
                title={title}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
              >
                <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
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
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Kunden-Passwort (voller Zugriff)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input type="password" value={settingsPassword} onChange={(e) => setSettingsPassword(e.target.value)} placeholder={gallery.password ? '••••••••' : 'Kein Passwort'} className="input-base" style={{ paddingLeft: '2.25rem' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Gast-Passwort <span className="font-normal opacity-60">(ohne private Fotos)</span>
                  </label>
                  <div className="relative">
                    <EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input type="password" value={settingsGuestPassword} onChange={(e) => setSettingsGuestPassword(e.target.value)} placeholder={gallery.guest_password ? '••••••••' : 'Kein Gast-Passwort'} className="input-base" style={{ paddingLeft: '2.25rem' }} />
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Gäste sehen keine 🔒 privaten Fotos</p>
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose a layout for the client gallery</p>
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
              {savingSettings ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>Cancel</button>
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
            canUploadFile={canUploadFile}
            maxStorageBytes={maxStorageBytes}
            storageUsedBytes={storageUsedBytes}
            onStorageLimitReached={onStorageLimitReached}
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
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.size} selected</span>
          <button onClick={clearSelection} className="text-xs" style={{ color: 'var(--text-muted)' }}>Auswahl aufheben</button>
          <button onClick={selectAll} className="text-xs" style={{ color: 'var(--text-muted)' }}>Select all</button>
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
            <Trash2 className="w-3 h-3" />Delete
          </button>
        </div>
      )}

      {/* ── Client Favorites List ── */}
      {(() => {
        const favoritePhotos = photos.filter(p => p.is_favorite)
        if (favoritePhotos.length === 0) return null
        return (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {favoriteListName || 'Favoritenliste des Kunden'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {favoritePhotos.length} {favoritePhotos.length === 1 ? 'Foto' : 'Fotos'} ausgewählt
                  </p>
                </div>
              </div>
              <button
                onClick={downloadFavorites}
                disabled={downloadingFavorites}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg text-white disabled:opacity-50 transition-all"
                style={{ background: '#111110' }}
              >
                {downloadingFavorites
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{favDownloadProgress > 0 ? `${favDownloadProgress}%` : '...'}</>
                  : <><Download className="w-3.5 h-3.5" />ZIP herunterladen</>
                }
              </button>
            </div>
            {/* Download progress bar */}
            {downloadingFavorites && favDownloadProgress > 0 && (
              <div className="w-full rounded-full h-1 overflow-hidden" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${favDownloadProgress}%`, background: '#EF4444' }} />
              </div>
            )}
            {/* Thumbnails */}
            <div className="flex flex-wrap gap-1.5">
              {favoritePhotos.slice(0, 12).map(photo => (
                <div key={photo.id} className="relative rounded-md overflow-hidden flex-shrink-0" style={{ width: 52, height: 52 }}>
                  <img
                    src={getPhotoUrl(photo.thumbnail_url || photo.storage_url, 120, 70, 'cover')}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
              {favoritePhotos.length > 12 && (
                <div className="w-[52px] h-[52px] rounded-md flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                  +{favoritePhotos.length - 12}
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
                          {sectionPhotos.slice(0, visibleCount).map(photo => (
                            <SortablePhoto key={photo.id} photo={photo} selected={selected.has(photo.id)} isCover={gallery.cover_photo_id === photo.id} onSelect={(id, shift) => toggleSelect(id, shift)} onDelete={deletePhoto} onTogglePrivate={togglePhotoPrivate} onSetCover={setCoverPhoto} />
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
                    {unsectionedPhotos.slice(0, visibleCount).map(photo => (
                      <SortablePhoto key={photo.id} photo={photo} selected={selected.has(photo.id)} isCover={gallery.cover_photo_id === photo.id} onSelect={(id, shift) => toggleSelect(id, shift)} onDelete={deletePhoto} onTogglePrivate={togglePhotoPrivate} onSetCover={setCoverPhoto} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* ── Load More (dashboard) ── */}
          {visibleCount < photos.length && (
            <div className="flex flex-col items-center gap-1.5 pt-2">
              <button
                onClick={() => {
                  setVisibleCount(prev => Math.min(prev + 50, photos.length))
                  window.scrollBy({ top: 300, behavior: 'smooth' })
                }}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
              >
                <Plus className="w-4 h-4" />
                Mehr laden ({photos.length - visibleCount} weitere)
              </button>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {Math.min(visibleCount, photos.length)} von {photos.length} Fotos
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
