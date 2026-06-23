'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
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
import { Images, Settings, Share2, Trash2, Heart, GripVertical, Lock, Plus, Palette, ChevronDown, Pencil, Check, X, GripHorizontal, Sparkles, Download, Loader2, Eye, MessageSquare, EyeOff, Star, LayoutGrid, List, Upload, ImageIcon } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils'
import GalleryShareModal from './GalleryShareModal'
import { cn } from '@/lib/utils'
import { GALLERY_THEMES, TYPOGRAPHY_PRESETS, SPACING_DENSITIES, getTheme, getTypographyPreset } from '@/lib/galleryThemes'
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
  media_type?: 'image' | 'video'
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
  cover_focal_x?: number | null
  cover_focal_y?: number | null
  cover_focal_x_mobile?: number | null
  cover_focal_y_mobile?: number | null
  hero_style?: string | null
  spacing_density?: string | null
  typography_preset?: string | null
}

interface Props {
  projectId: string | null
  photographerId: string
  clientUrl: string | null
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
  currentSlug?: string | null
  clientToken?: string | null
  studioName?: string | null
  // Own share fields for project-less galleries
  galleryShareToken?: string | null
  galleryCustomSlug?: string | null
}

// Focal point crosshair — shared by desktop and mobile pickers
function FocalCrosshair({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Dimmed quadrant overlay — keeps focus on the clicked point */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.18)' }} />
      {/* Crosshair lines */}
      <div className="absolute top-0 bottom-0 w-px" style={{ left: `${x}%`, background: 'rgba(255,255,255,0.6)' }} />
      <div className="absolute left-0 right-0 h-px" style={{ top: `${y}%`, background: 'rgba(255,255,255,0.6)' }} />
      {/* Center dot */}
      <div
        className="absolute"
        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-4 h-4 rounded-full border-2 border-white shadow-md" style={{ background: 'rgba(255,255,255,0.3)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }} />
      </div>
    </div>
  )
}

// Sortable photo item — wrapped in memo so only the photos whose props actually changed re-render
const SortablePhoto = memo(function SortablePhoto({
  photo,
  selected,
  isCover,
  sectionLabel,
  onSelect,
  onContextMenu,
  onPaintSelect,
  onDragStartSection,
  onDragEndSection,
}: {
  photo: Photo
  selected: boolean
  isCover: boolean
  sectionLabel?: string
  onSelect: (id: string, shiftKey?: boolean) => void
  onContextMenu: (id: string, x: number, y: number) => void
  onPaintSelect: (id: string) => void
  onDragStartSection?: (id: string) => void
  onDragEndSection?: () => void
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
      draggable={true}
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStartSection?.(photo.id) }}
      onDragEnd={() => onDragEndSection?.()}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault() // blocks the click event so there's no toggle conflict
          onPaintSelect(photo.id)
        }
      }}
      onMouseEnter={(e) => {
        // only paint-select while mouse button is held — never during scroll or plain hover
        if (e.buttons > 0 && (e.ctrlKey || e.metaKey)) onPaintSelect(photo.id)
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        if (e.ctrlKey || e.metaKey) return // handled by onMouseDown
        onSelect(photo.id, e.shiftKey)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(photo.id, e.clientX, e.clientY)
      }}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
        selected ? 'border-[#C8A882]' : isCover ? 'border-[#F59E0B]' : 'border-transparent'
      )}
    >
      {photo.media_type === 'video' ? (
        <>
          <video
            src={photo.storage_url}
            className={cn('w-full aspect-square object-cover', photo.is_private && 'opacity-60')}
            preload="metadata"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </>
      ) : (
        <img
          src={getPhotoUrl(photo.thumbnail_url || photo.storage_url, 200, 75, 'cover')}
          alt={photo.filename}
          className={cn('w-full aspect-square object-cover', photo.is_private && 'opacity-60')}
          loading="lazy"
          decoding="async"
        />
      )}
      {/* Set label badge — shown in "Alle" view */}
      {sectionLabel && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold leading-none max-w-[80%] truncate pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
          {sectionLabel}
        </div>
      )}
    </div>
  )
}, (prev, next) =>
  prev.photo === next.photo &&
  prev.selected === next.selected &&
  prev.isCover === next.isCover &&
  prev.sectionLabel === next.sectionLabel
)

export default function GalleryTab({ projectId, photographerId, clientUrl, publicGalleryUrl, gallery: initialGallery, photos: initialPhotos, showWatermark, canUploadFile, maxStorageBytes, storageUsedBytes, onStorageLimitReached, clientEmail, clientName, currentSlug, clientToken, studioName, galleryShareToken, galleryCustomSlug }: Props) {
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
  // Download jobs (for email list)
  interface DownloadJob { id: string; email: string; created_at: string; status: string; parts: unknown[] | null }
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([])
  const [showDownloadList, setShowDownloadList] = useState(false)
  // Gallery UX
  const [activeSection, setActiveSection] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dashSortOrder, setDashSortOrder] = useState<'name-asc' | 'name-desc' | 'manual'>('name-asc')
  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const [sectionDragOver, setSectionDragOver] = useState<string | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showMoveToSet, setShowMoveToSet] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [showFocalModal, setShowFocalModal] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverUploadRef = useRef<HTMLInputElement>(null)
  const globalDragCounter = useRef(0)
  const draggingPhotoRef = useRef<string | null>(null)
  const draggingSectionRef = useRef<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState(gallery?.title || 'Galerie')
  const [settingsDesc, setSettingsDesc] = useState(gallery?.description || '')
  const [settingsDownload, setSettingsDownload] = useState(gallery?.download_enabled ?? true)
  const [settingsComments, setSettingsComments] = useState(gallery?.comments_enabled ?? true)
  const [settingsPassword, setSettingsPassword] = useState(gallery?.password || '')
  const [showClientPassword, setShowClientPassword] = useState(false)
  const [settingsGuestPassword, setSettingsGuestPassword] = useState(gallery?.guest_password || '')
  const [showGuestPassword, setShowGuestPassword] = useState(false)
  const [settingsExpiry, setSettingsExpiry] = useState(gallery?.expires_at?.split('T')[0] || '')
  const [selectedTheme, setSelectedTheme] = useState(gallery?.design_theme || 'classic-white')
  const [focalX, setFocalX] = useState(gallery?.cover_focal_x ?? 50)
  const [focalY, setFocalY] = useState(gallery?.cover_focal_y ?? 50)
  const [heroStyle, setHeroStyle] = useState(gallery?.hero_style || 'cinematic')
  const [spacingDensity, setSpacingDensity] = useState(gallery?.spacing_density || 'balanced')
  const [typographyPreset, setTypographyPreset] = useState(gallery?.typography_preset || 'editorial-serif')
  // Tags enabled: default all enabled if not set
  const defaultTags = gallery?.tags_enabled ?? ['green', 'yellow', 'red']
  const [enabledTags, setEnabledTags] = useState<string[]>(defaultTags)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const supabase = createClient()
  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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
    // Fetch download jobs (email list)
    supabase
      .from('gallery_download_jobs')
      .select('id, email, created_at, status, parts')
      .eq('gallery_id', gallery.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setDownloadJobs(data as DownloadJob[])
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

  // Stable drag handlers so SortablePhoto memo comparator works
  const handleDragStartSection = useCallback((id: string) => { draggingPhotoRef.current = id }, [])
  const handleDragEndSection = useCallback(() => { draggingPhotoRef.current = null }, [])

  // Right-click context menu: if photo not in current selection, switch to just that photo
  const handlePhotoContextMenu = useCallback((id: string, x: number, y: number) => {
    setSelected(prev => {
      if (prev.has(id)) return prev
      lastSelectedRef.current = id
      return new Set([id])
    })
    setContextMenu({ x, y })
  }, [])

  // Paint-select: add photo to selection (called from mousedown+Cmd or mouseenter while dragging+Cmd)
  const handlePhotoPaintSelect = useCallback((id: string) => {
    setSelected(prev => { const next = new Set(prev); next.add(id); return next })
  }, [])

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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !gallery) return
    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('galleryId', gallery.id)
      formData.append('filename', file.name)
      formData.append('contentType', file.type)
      const res = await fetch('/api/photos/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { toast.error('Upload fehlgeschlagen'); return }
      const { data: newPhoto } = await supabase
        .from('photos')
        .insert({ gallery_id: gallery.id, storage_url: json.publicUrl, thumbnail_url: json.publicUrl, filename: file.name, file_size: file.size, display_order: photos.length })
        .select()
        .single()
      if (newPhoto) {
        setPhotos(prev => [...prev, newPhoto as Photo])
        await supabase.from('galleries').update({ cover_photo_id: newPhoto.id }).eq('id', gallery.id)
        setGallery(prev => prev ? { ...prev, cover_photo_id: newPhoto.id } : prev)
        toast.success('Titelbild gesetzt')
      }
    } catch {
      toast.error('Upload fehlgeschlagen')
    } finally {
      setUploadingCover(false)
      if (coverUploadRef.current) coverUploadRef.current.value = ''
    }
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
      cover_focal_x: focalX,
      cover_focal_y: focalY,
      hero_style: heroStyle,
      spacing_density: spacingDensity,
      typography_preset: typographyPreset,
    }
    if (settingsPassword) updates.password = settingsPassword
    if (settingsGuestPassword !== '') updates.guest_password = settingsGuestPassword || null

    // Save all fields in a single update.
    // hero_style / spacing_density / typography_preset are included directly —
    // they've been in the schema since migrations 095–096 and must save reliably.
    const coreFields = ['title', 'description', 'download_enabled', 'comments_enabled',
      'expires_at', 'design_theme', 'tags_enabled', 'password', 'guest_password',
      'cover_photo_id', 'cover_focal_x', 'cover_focal_y',
      'hero_style', 'spacing_density', 'typography_preset']
    const coreUpdate: Record<string, unknown> = {}
    for (const k of coreFields) if (k in updates) coreUpdate[k] = updates[k]

    const { error: coreError } = await supabase.from('galleries').update(coreUpdate).eq('id', gallery.id)
    if (coreError) {
      console.error('[saveSettings core]', JSON.stringify(coreError))
      toast.error(`Error saving: ${coreError.message ?? coreError.code}`)
      setSavingSettings(false)
      return
    }

    // Save optional newer columns — silently skip if not yet in schema.
    const newCols: Record<string, unknown> = {
      cover_focal_x_mobile: focalX,
      cover_focal_y_mobile: focalY,
    }
    for (const [col, val] of Object.entries(newCols)) {
      const { error: colError } = await supabase.from('galleries').update({ [col]: val }).eq('id', gallery.id)
      if (colError) console.warn(`[saveSettings] column ${col} not saved:`, colError.message)
    }

    setGallery((prev) => prev ? { ...prev, ...updates as Partial<Gallery> } : prev)
    setShowSettings(false)
    toast.success('Einstellungen gespeichert')
    setSavingSettings(false)

    // Purge ISR cache for the public gallery URL so changes are visible immediately
    fetch('/api/galleries/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientToken, customSlug: currentSlug }),
    }).catch(() => {}) // fire-and-forget, non-critical
  }

  const toggleGalleryStatus = async () => {
    if (!gallery) return
    const newStatus = gallery.status === 'active' ? 'draft' : 'active'
    await supabase.from('galleries').update({ status: newStatus }).eq('id', gallery.id)
    setGallery((prev) => prev ? { ...prev, status: newStatus } : prev)
    toast.success(newStatus === 'active' ? 'Galerie aktiviert' : 'Galerie deaktiviert')
    // Purge ISR cache on status change (active↔draft is time-sensitive)
    fetch('/api/galleries/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientToken, customSlug: currentSlug }),
    }).catch(() => {})
  }

  // ── Progressive loading (dashboard grid) ─────────────────────────────────
  const DASH_LIMIT = 50
  const [visibleCount, setVisibleCount] = useState(DASH_LIMIT)

  // ── Share Modal state ──────────────────────────────────────────────────────
  const [shareModal, setShareModal] = useState(false)

  const getGalleryUrl = () => {
    if (publicGalleryUrl) return publicGalleryUrl
    // Project-linked: prefer custom slug, then client_token
    const projectToken = currentSlug || clientToken
    if (projectToken) return `${window.location.origin}/gallery/${projectToken}`
    // Project-less gallery: use gallery's own slug / share_token
    const galleryToken = galleryCustomSlug || galleryShareToken
    if (galleryToken) return `${window.location.origin}/gallery/${galleryToken}`
    return window.location.origin
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

  const reorderSection = async (fromId: string, toId: string) => {
    const fromIdx = sections.findIndex(s => s.id === fromId)
    const toIdx = sections.findIndex(s => s.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
    const reordered = [...sections]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = reordered.map((s, i) => ({ ...s, display_order: i }))
    setSections(updated)
    await Promise.all(updated.map(s =>
      supabase.from('gallery_sections').update({ display_order: s.display_order }).eq('id', s.id)
    ))
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
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors" style={{ background: 'var(--cta-bg)' }}>
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
                        <p className="text-[11px] font-semibold truncate" style={{ color: theme.text }}>{theme.moodName}</p>
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
                  style={{ background: 'var(--cta-bg)' }}
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
  const sortPhotos = (arr: Photo[]) => {
    if (dashSortOrder === 'manual') return arr
    return [...arr].sort((a, b) => {
      const na = a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' })
      return dashSortOrder === 'name-asc' ? na : -na
    })
  }
  const activePhotos = sortPhotos(
    activeSection === 'all'
      ? photos
      : activeSection === 'unsectioned'
        ? unsectionedPhotos
        : photos.filter(p => p.section_id === activeSection)
  )
  const currentTheme = getTheme(selectedTheme)
  const currentTypo = getTypographyPreset(typographyPreset)

  return (
    <div
      className="space-y-4 relative"
      onDragEnter={e => {
        if (e.dataTransfer.types.includes('Files')) {
          globalDragCounter.current++
          if (globalDragCounter.current === 1) setGlobalDragOver(true)
        }
      }}
      onDragLeave={() => {
        globalDragCounter.current--
        if (globalDragCounter.current === 0) setGlobalDragOver(false)
      }}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }}
      onDrop={e => {
        e.preventDefault()
        globalDragCounter.current = 0
        setGlobalDragOver(false)
        setUploadSectionId(null)
        setShowUploader(true)
      }}
    >
      {globalDragOver && photos.length > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl pointer-events-none" style={{ background: 'rgba(196,164,124,0.06)', border: '2px dashed var(--accent)' }}>
          <div className="text-center">
            <Images className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Fotos zum Hochladen ablegen</p>
          </div>
        </div>
      )}
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
        projectId={projectId}
        currentSlug={currentSlug}
        clientToken={clientToken}
        galleryShareToken={galleryShareToken}
        galleryCustomSlug={galleryCustomSlug}
        studioName={studioName || undefined}
        coverPhotoUrl={(() => {
          const cover = gallery.cover_photo_id ? photos.find(p => p.id === gallery.cover_photo_id) : null
          return (cover ?? photos[0])?.storage_url ?? undefined
        })()}
      />

      {/* Header */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Identity */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-display text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{gallery.title}</h3>
            <button
              onClick={toggleGalleryStatus}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer flex-shrink-0"
              style={{
                background: gallery.status === 'active' ? 'rgba(61,186,111,0.12)' : 'rgba(107,114,128,0.10)',
                color: gallery.status === 'active' ? '#3DBA6F' : 'var(--text-muted)',
                border: `1px solid ${gallery.status === 'active' ? 'rgba(61,186,111,0.25)' : 'var(--border-color)'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block" style={{ background: gallery.status === 'active' ? '#3DBA6F' : 'var(--text-muted)' }} />
              {gallery.status === 'active' ? 'Aktiv' : 'Draft'}
            </button>
          </div>
          {/* Row 2: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={shareGallery}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Teilen</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Einstellungen</span>
            </button>
            <button
              onClick={() => { setUploadSectionId(null); setShowUploader(!showUploader) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-white"
              style={{ background: 'var(--cta-bg)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              + <span className="hidden sm:inline ml-0.5">Fotos hochladen</span><span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>

        {/* Row 3: Light info + Details dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Always-visible stats */}
          <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <Images className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{photos.length}</span>
            <span>Fotos</span>
          </div>

          {/* Downloads — clickable to show email list */}
          <button
            onClick={() => setShowDownloadList(v => !v)}
            className="flex items-center gap-1 text-[12px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            title="Galerie-Downloads (ZIP) — klicken für E-Mail-Liste"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{gallery.download_count}</span>
            <span>Downloads</span>
            <ChevronDown className="w-3 h-3 ml-0.5 transition-transform" style={{ transform: showDownloadList ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center gap-1 text-[12px] font-medium transition-colors"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Details
            <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {/* Expanded detail stats */}
          {showDetails && (
            <div className="flex items-center gap-3">
              {[
                { icon: Download, value: gallery.photo_download_count ?? 0, label: 'Foto-DL', color: '#3B82F6', title: 'Einzelfoto-Downloads' },
                { icon: Heart, value: photos.filter(p => p.is_favorite).length, label: 'Favoriten', color: '#EF4444' },
                { icon: EyeOff, value: photos.filter(p => p.is_private).length, label: 'Privat', color: '#8B5CF6', title: 'Private Fotos' },
                { icon: MessageSquare, value: commentCount, label: 'Kommentare', color: '#F59E0B' },
              ].map(({ icon: Icon, value, label, color, title }) => (
                <div key={label} title={title} className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Download email list */}
        {showDownloadList && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
              <Download className="w-3.5 h-3.5" style={{ color: '#8B5CF6' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Download-Anfragen</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                {downloadJobs.filter(j => j.status === 'ready').length} abgeschlossen
              </span>
            </div>
            {downloadJobs.length === 0 ? (
              <p className="text-[12px] text-center py-4" style={{ color: 'var(--text-muted)' }}>Noch keine Downloads</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {downloadJobs.map(job => {
                  const partCount = Array.isArray(job.parts) ? job.parts.length : 1
                  const date = new Date(job.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  const statusColor = job.status === 'ready' ? '#22C55E' : job.status === 'failed' ? '#EF4444' : '#F59E0B'
                  const statusLabel = job.status === 'ready' ? 'Fertig' : job.status === 'failed' ? 'Fehler' : 'Läuft'
                  return (
                    <div key={job.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                      <span className="text-[12px] font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{job.email}</span>
                      {job.status === 'ready' && partCount > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          {partCount} Teile
                        </span>
                      )}
                      <span className="text-[10px] font-medium" style={{ color: statusColor }}>{statusLabel}</span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{date}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
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
                    <input type={showClientPassword ? 'text' : 'password'} value={settingsPassword} onChange={(e) => setSettingsPassword(e.target.value)} placeholder={gallery.password ? '••••••••' : 'Kein Passwort'} className="input-base" style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }} />
                    <button
                      type="button"
                      onClick={() => setShowClientPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showClientPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Gast-Passwort <span className="font-normal opacity-60">(ohne private Fotos)</span>
                  </label>
                  <div className="relative">
                    <EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input type={showGuestPassword ? 'text' : 'password'} value={settingsGuestPassword} onChange={(e) => setSettingsGuestPassword(e.target.value)} placeholder={gallery.guest_password ? '••••••••' : 'Kein Gast-Passwort'} className="input-base" style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }} />
                    <button
                      type="button"
                      onClick={() => setShowGuestPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showGuestPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
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

          {/* Design tab */}
          {activeSettingsTab === 'design' && (
            <div className="space-y-5">

              {/* ── LIVE PREVIEW — side-by-side desktop + mobile ── */}
              {(() => {
                const previewCover = photos.find(p => p.id === gallery?.cover_photo_id)
                const coverSrc = previewCover ? getPhotoUrl(previewCover.storage_url, 600, 75, 'cover') : null
                const galleryLabel = gallery?.title || 'Galerie-Titel'
                const showImg = !!coverSrc && heroStyle !== 'minimal'
                const isFullscreen = ['cinematic', 'frame', 'luxury'].includes(heroStyle)
                const isSplit = heroStyle === 'editorial'
                const isJournal = heroStyle === 'journal'
                const isClassic = heroStyle === 'classic'
                const isMinimal = heroStyle === 'minimal'

                // Desktop hero content
                const DesktopHero = () => {
                  if (isSplit && showImg) return (
                    <div className="absolute inset-0 grid grid-cols-2">
                      <img src={coverSrc!} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} />
                      <div style={{ background: currentTheme.bg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10% 8% 12%' }}>
                        <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.58rem', letterSpacing: currentTypo.titleTracking, lineHeight: 1.2 }}>{galleryLabel}</p>
                      </div>
                    </div>
                  )
                  if (isJournal) return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: currentTheme.bg, padding: '8% 10%', gap: 6 }}>
                      {showImg && <div style={{ width: '52%', aspectRatio: '3/2', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}><img src={coverSrc!} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} /></div>}
                      <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.62rem', letterSpacing: currentTypo.titleTracking, textAlign: 'center', marginTop: showImg ? 4 : 0 }}>{galleryLabel}</p>
                      <div style={{ width: 20, height: 1, background: currentTheme.accent, opacity: 0.4 }} />
                    </div>
                  )
                  if (isClassic) return (
                    <>
                      {showImg && <img src={coverSrc!} alt="" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '64%', width: '100%', objectFit: 'cover', objectPosition: `${focalX}% ${focalY}%` }} />}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '36%', background: currentTheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${currentTheme.border}` }}>
                        <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.52rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                      </div>
                    </>
                  )
                  if (isMinimal) return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" style={{ background: currentTheme.bg }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${currentTheme.border}`, opacity: 0.5 }} />
                      <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.6rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                    </div>
                  )
                  // cinematic / frame / luxury — fullscreen image
                  return (
                    <>
                      {showImg && <img src={coverSrc!} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} />}
                      {heroStyle === 'frame'
                        ? <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.52) 100%)' }} />
                        : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 28%, rgba(0,0,0,0.55) 100%)' }} />
                      }
                      {heroStyle === 'frame' && <div style={{ position: 'absolute', inset: '5%', border: '1px solid rgba(255,255,255,0.18)', pointerEvents: 'none' }} />}
                      {heroStyle === 'frame' ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 10%', gap: 2 }}>
                          <p style={{ color: 'rgba(255,255,255,0.93)', fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.56rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                        </div>
                      ) : heroStyle === 'luxury' ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10% 12%', textAlign: 'center', gap: 3 }}>
                          <p style={{ color: 'rgba(255,255,255,0.9)', fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.56rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 2 }}>
                            <div style={{ width: 8, height: 0.5, background: 'rgba(255,255,255,0.22)' }} />
                            <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
                            <div style={{ width: 8, height: 0.5, background: 'rgba(255,255,255,0.22)' }} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
                          <p style={{ color: 'rgba(255,255,255,0.9)', fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.56rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)', borderRadius: 5, padding: '1.5px 6px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.52rem', fontWeight: 500, letterSpacing: '0.08em' }}>{currentTheme.moodName}</p>
                      </div>
                    </>
                  )
                }

                // Mobile hero content
                const MobileHero = () => {
                  if (isMinimal) return (
                    <div style={{ height: '28%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', background: currentTheme.bg }}>
                      <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.32rem', letterSpacing: currentTypo.titleTracking, textAlign: 'center' }}>{galleryLabel}</p>
                    </div>
                  )
                  if (isClassic) return (
                    <>
                      {showImg && <div style={{ height: '38%', overflow: 'hidden' }}><img src={coverSrc!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focalX}% ${focalY}%` }} /></div>}
                      <div style={{ padding: '3px 6px', textAlign: 'center', borderBottom: `0.5px solid ${currentTheme.border}`, background: currentTheme.bg }}>
                        <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.3rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                      </div>
                    </>
                  )
                  if (isSplit) return (
                    <div style={{ height: '42%', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      {showImg && <img src={coverSrc!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focalX}% ${focalY}%` }} />}
                      <div style={{ background: currentTheme.bg, display: 'flex', alignItems: 'flex-end', padding: '4px 5px' }}>
                        <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.28rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                      </div>
                    </div>
                  )
                  if (isJournal) return (
                    <div style={{ height: '44%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: currentTheme.bg, gap: 3, padding: '4px' }}>
                      {showImg && <div style={{ width: '55%', aspectRatio: '3/2', overflow: 'hidden' }}><img src={coverSrc!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focalX}% ${focalY}%` }} /></div>}
                      <p style={{ color: currentTheme.text, fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.28rem', letterSpacing: currentTypo.titleTracking, textAlign: 'center' }}>{galleryLabel}</p>
                    </div>
                  )
                  // cinematic / frame / luxury
                  return (
                    <div style={{ height: '46%', position: 'relative' }}>
                      {showImg && <img src={coverSrc!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focalX}% ${focalY}%` }} />}
                      {heroStyle === 'frame'
                        ? <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.52) 100%)' }} />
                        : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />
                      }
                      {heroStyle === 'frame' && <div style={{ position: 'absolute', inset: 3, border: '0.5px solid rgba(255,255,255,0.2)' }} />}
                      {heroStyle === 'frame' ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8%' }}>
                          <p style={{ color: 'rgba(255,255,255,0.93)', fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.32rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                        </div>
                      ) : heroStyle === 'luxury' ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, gap: 2 }}>
                          <p style={{ color: 'rgba(255,255,255,0.88)', fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.32rem', letterSpacing: currentTypo.titleTracking, textAlign: 'center' }}>{galleryLabel}</p>
                          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <div style={{ width: 5, height: 0.5, background: 'rgba(255,255,255,0.2)' }} /><div style={{ width: 1.5, height: 1.5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} /><div style={{ width: 5, height: 0.5, background: 'rgba(255,255,255,0.2)' }} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: 'absolute', bottom: 5, left: 6, right: 6 }}>
                          <p style={{ color: 'rgba(255,255,255,0.88)', fontFamily: currentTypo.fontFamily, fontWeight: currentTypo.titleWeight, fontSize: '0.32rem', letterSpacing: currentTypo.titleTracking }}>{galleryLabel}</p>
                        </div>
                      )}
                    </div>
                  )
                }

                // Gap from spacing density
                const previewGap = spacingDensity === 'compact' ? 1 : spacingDensity === 'airy' ? 3 : 1.5

                return (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Live-Vorschau</p>
                    <div className="flex items-start gap-2.5">
                      {/* Desktop */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Desktop</p>
                        <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', background: isFullscreen ? '#0C0C0B' : currentTheme.bg }}>
                          <DesktopHero />
                        </div>
                      </div>
                      {/* Mobile phone frame */}
                      <div style={{ flexShrink: 0, width: 132 }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Mobile</p>
                        <div style={{ width: '100%', aspectRatio: '9/19.5', border: '2.5px solid var(--border-color)', borderRadius: 18, overflow: 'hidden', background: currentTheme.bg, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
                          {/* Status bar */}
                          <div style={{ height: 8, background: isFullscreen ? '#0C0C0B' : currentTheme.bg }} />
                          <MobileHero />
                          {/* Photo grid */}
                          <div style={{ padding: '3px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: previewGap, flex: 1 }}>
                            {photos.length > 0
                              ? photos.slice(0, 9).map((p, i) => (
                                  <div key={i} style={{ aspectRatio: '1', borderRadius: 1.5, overflow: 'hidden', background: currentTheme.surface }}>
                                    <img src={getPhotoUrl(p.storage_url, 80, 70, 'cover')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                  </div>
                                ))
                              : Array.from({ length: 6 }).map((_, i) => (
                                  <div key={i} style={{ aspectRatio: '1', borderRadius: 1.5, background: currentTheme.surface }} />
                                ))
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="h-px" style={{ background: 'var(--border-color)' }} />

              {/* ── Cover photo ── */}
              {(() => {
                const coverPhoto = photos.find(p => p.id === gallery?.cover_photo_id)
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Titelbild (Hero)</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowCoverPicker(v => !v)}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                          style={{ background: showCoverPicker ? 'var(--accent)' : 'var(--bg-hover)', color: showCoverPicker ? '#fff' : 'var(--text-primary)' }}
                        >
                          <Images className="w-3 h-3" />Aus Galerie
                        </button>
                        <label className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg cursor-pointer transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                          {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Upload className="w-3 h-3" />Hochladen</>}
                          <input ref={coverUploadRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                        </label>
                      </div>
                    </div>

                    {coverPhoto ? (
                      <div className="space-y-2">
                        {/* Compact focal point card */}
                        <div
                          className="relative rounded-lg overflow-hidden cursor-pointer group"
                          style={{ height: 72, background: '#111' }}
                          onClick={() => setShowFocalModal(true)}
                        >
                          <img
                            src={getPhotoUrl(coverPhoto.thumbnail_url || coverPhoto.storage_url, 600, 80, 'cover')}
                            alt="" className="w-full h-full object-cover"
                            style={{ objectPosition: `${focalX}% ${focalY}%` }}
                          />
                          {/* Crosshair dot */}
                          <div className="absolute pointer-events-none" style={{ left: `${focalX}%`, top: `${focalY}%`, transform: 'translate(-50%, -50%)' }}>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow" style={{ background: 'rgba(255,255,255,0.25)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }} />
                          </div>
                          {/* Hover overlay */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                            <span className="text-white text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>Fokuspunkt ändern</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] truncate flex-1 mr-2" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{coverPhoto.filename}</span>
                            {' '}· <span className="font-mono" style={{ color: 'var(--accent)' }}>{focalX}% / {focalY}%</span>
                          </p>
                          <button
                            onClick={() => setCoverPhoto(gallery!.cover_photo_id!)}
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg flex-shrink-0 transition-colors"
                            style={{ background: 'rgba(232,76,26,0.08)', color: '#E84C1A' }}
                          >
                            <X className="w-3 h-3" />Entfernen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-xl" style={{ height: 64, border: '2px dashed var(--border-color)', background: 'var(--bg-hover)' }}>
                        <ImageIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Kein Titelbild gewählt</p>
                      </div>
                    )}

                    {/* Cover picker modal */}
                    {showCoverPicker && (
                      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
                        <div className="w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', maxHeight: '90vh' }}>
                          <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                              <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Titelbild wählen</p>
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{photos.length} Fotos</p>
                            </div>
                            <button onClick={() => setShowCoverPicker(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {photos.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Noch keine Fotos in dieser Galerie</p>
                            </div>
                          ) : (
                            <div className="overflow-y-auto p-3">
                              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                {photos.map(photo => (
                                  <button
                                    key={photo.id}
                                    onClick={() => { setCoverPhoto(photo.id); setShowCoverPicker(false) }}
                                    className="relative rounded-lg overflow-hidden aspect-square flex-shrink-0 transition-all"
                                    style={{ outline: gallery?.cover_photo_id === photo.id ? '2px solid var(--accent)' : '2px solid transparent', outlineOffset: 1 }}
                                  >
                                    <img src={getPhotoUrl(photo.thumbnail_url || photo.storage_url, 240, 75, 'cover')} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    {gallery?.cover_photo_id === photo.id && (
                                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(196,164,124,0.4)' }}>
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="h-px" style={{ background: 'var(--border-color)' }} />

              {/* ── Typografie ── */}
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Typografie</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPOGRAPHY_PRESETS.map(preset => {
                  if (preset.fontImport) {
                    const existingLink = typeof document !== 'undefined' && document.querySelector(`link[href="${preset.fontImport}"]`)
                    if (!existingLink && typeof document !== 'undefined') {
                      const link = document.createElement('link')
                      link.rel = 'stylesheet'
                      link.href = preset.fontImport
                      document.head.appendChild(link)
                    }
                  }
                  const active = typographyPreset === preset.key
                  return (
                    <button
                      key={preset.key}
                      onClick={() => setTypographyPreset(preset.key)}
                      className="relative rounded-xl text-left transition-all overflow-hidden"
                      style={{
                        border: active ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                        boxShadow: active ? '0 0 0 3px rgba(196,164,124,0.18)' : 'none',
                      }}
                    >
                      <div className="px-3 pt-3 pb-2.5" style={{ background: active ? 'rgba(196,164,124,0.04)' : 'var(--bg-surface)' }}>
                        <p style={{ fontFamily: preset.fontFamily, fontWeight: preset.titleWeight, letterSpacing: preset.titleTracking, fontSize: '1.05rem', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 6 }}>
                          Galerie
                        </p>
                        <p className="text-[10px] font-semibold" style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{preset.name}</p>
                        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{preset.description}</p>
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="h-px" style={{ background: 'var(--border-color)' }} />

              {/* ── Farbpalette ── */}
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Farbpalette</p>
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
                    <div className="h-14 flex flex-col justify-between p-2" style={{ background: theme.bg }}>
                      <div className="flex gap-1">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex-1 rounded" style={{ height: '18px', background: theme.surface, border: `1px solid ${theme.border}` }} />
                        ))}
                      </div>
                      <div className="h-1.5 rounded-full w-2/3" style={{ background: theme.accent, opacity: 0.65 }} />
                    </div>
                    <div className="px-2 py-1.5" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
                      <p className="text-[11px] font-semibold truncate" style={{ color: theme.text }}>{theme.moodName}</p>
                    </div>
                    {selectedTheme === theme.key && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="h-px" style={{ background: 'var(--border-color)' }} />

              {/* ── Hero-Stil — 7 visual cards ── */}
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Hero-Stil</p>
              {(() => {
                // Use cover photo if set, otherwise first gallery photo as fallback
                const heroPreview = photos.find(p => p.id === gallery?.cover_photo_id) ?? photos[0] ?? null
                const img = heroPreview ? getPhotoUrl(heroPreview.storage_url, 400, 75, 'cover') : null
                const imgEl = (op = 0.85) => img
                  ? <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: op }} />
                  : null

                return (
              <div className="grid grid-cols-2 gap-2">
                {([
                  {
                    key: 'cinematic', label: 'Cinematic',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#1B1814', position: 'relative' }}>
                        {imgEl(0.85)}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.72) 100%)' }} />
                        <div style={{ position: 'absolute', bottom: '18%', left: '12%', width: '52%', height: 4, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
                        <div style={{ position: 'absolute', bottom: '9%', left: '12%', width: '32%', height: 2.5, background: 'rgba(255,255,255,0.22)', borderRadius: 2 }} />
                      </div>
                    ),
                  },
                  {
                    key: 'classic', label: 'Classic',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '62%', background: '#1B1814', position: 'relative', overflow: 'hidden' }}>
                          {imgEl(0.9)}
                        </div>
                        <div style={{ height: '38%', background: currentTheme.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: '0 12%', gap: 4, borderTop: `1px solid ${currentTheme.border}` }}>
                          <div style={{ width: '52%', height: 3.5, background: currentTheme.text, borderRadius: 2, opacity: 0.35 }} />
                          <div style={{ width: '32%', height: 2.5, background: currentTheme.text, borderRadius: 2, opacity: 0.18 }} />
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'minimal', label: 'Minimal',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: currentTheme.bg, border: `1px solid ${currentTheme.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${currentTheme.border}`, opacity: 0.6 }} />
                        <div style={{ width: '44%', height: 3.5, background: currentTheme.text, borderRadius: 2, opacity: 0.3 }} />
                        <div style={{ width: '26%', height: 2, background: currentTheme.text, borderRadius: 2, opacity: 0.15 }} />
                      </div>
                    ),
                  },
                  {
                    key: 'editorial', label: 'Split',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div style={{ background: '#1B1814', position: 'relative', overflow: 'hidden' }}>
                          {imgEl(0.9)}
                        </div>
                        <div style={{ background: currentTheme.bg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 10% 12%', gap: 4, borderTop: `1px solid ${currentTheme.border}` }}>
                          <div style={{ width: '70%', height: 3.5, background: currentTheme.text, borderRadius: 2, opacity: 0.4 }} />
                          <div style={{ width: '46%', height: 2.5, background: currentTheme.text, borderRadius: 2, opacity: 0.2 }} />
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'frame', label: 'Frame',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#0E0C0A', position: 'relative', padding: 6 }}>
                        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                          {imgEl(0.8)}
                          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)' }} />
                          <div style={{ position: 'relative', width: '46%', height: 3.5, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
                          <div style={{ position: 'relative', width: '28%', height: 2.5, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
                          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'journal', label: 'Journal',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: currentTheme.bg, border: `1px solid ${currentTheme.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 12px' }}>
                        <div style={{ width: '45%', aspectRatio: '4/3', background: '#2A2520', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                          {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />}
                        </div>
                        <div style={{ width: '54%', height: 3.5, background: currentTheme.text, borderRadius: 2, opacity: 0.35 }} />
                        <div style={{ width: '32%', height: 2.5, background: currentTheme.accent, borderRadius: 2, opacity: 0.45 }} />
                      </div>
                    ),
                  },
                  {
                    key: 'luxury', label: 'Luxury',
                    preview: (
                      <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#080604', position: 'relative' }}>
                        {imgEl(0.75)}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55) 100%)' }} />
                        <div style={{ position: 'absolute', top: '16%', left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,0.28)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '12%', gap: 4 }}>
                          <div style={{ width: '42%', height: 3.5, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            <div style={{ width: 10, height: 0.5, background: 'rgba(255,255,255,0.2)' }} />
                            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                            <div style={{ width: 10, height: 0.5, background: 'rgba(255,255,255,0.2)' }} />
                          </div>
                        </div>
                      </div>
                    ),
                  },
                ] as Array<{ key: string; label: string; preview: React.ReactNode }>).map(style => {
                  const active = heroStyle === style.key
                  return (
                    <button
                      key={style.key}
                      onClick={() => setHeroStyle(style.key)}
                      className="relative rounded-xl overflow-hidden transition-all text-left"
                      style={{
                        border: active ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                        boxShadow: active ? '0 0 0 3px rgba(196,164,124,0.18)' : 'none',
                      }}
                    >
                      <div className="p-2" style={{ background: active ? 'rgba(196,164,124,0.04)' : 'var(--bg-surface)' }}>
                        {style.preview}
                        <p className="text-[11px] font-semibold mt-2" style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{style.label}</p>
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
                )
              })()}

              <div className="h-px" style={{ background: 'var(--border-color)' }} />

              {/* ── Abstände ── */}
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Abstände</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'compact',  label: 'Compact',  cols: 4, rows: 3, gap: 1   },
                  { key: 'balanced', label: 'Balanced', cols: 3, rows: 3, gap: 3   },
                  { key: 'airy',     label: 'Airy',     cols: 2, rows: 2, gap: 7   },
                ] as Array<{ key: string; label: string; cols: number; rows: number; gap: number }>).map(d => {
                  const active = spacingDensity === d.key
                  return (
                    <button
                      key={d.key}
                      onClick={() => setSpacingDensity(d.key)}
                      className="rounded-xl overflow-hidden transition-all text-left"
                      style={{
                        border: active ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                        boxShadow: active ? '0 0 0 3px rgba(196,164,124,0.18)' : 'none',
                      }}
                    >
                      <div className="p-2.5" style={{ background: active ? 'rgba(196,164,124,0.04)' : 'var(--bg-surface)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.cols}, 1fr)`, gap: d.gap, marginBottom: 8 }}>
                          {Array.from({ length: d.cols * d.rows }).map((_, i) => (
                            <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: active ? 'rgba(196,164,124,0.35)' : 'var(--border-strong)', transition: 'background 0.2s' }} />
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold" style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{d.label}</p>
                      </div>
                    </button>
                  )
                })}
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
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => { draggingSectionRef.current = section.id }}
                      onDragEnd={() => { draggingSectionRef.current = null; setDragOverSectionId(null) }}
                      onDragOver={e => { if (!draggingSectionRef.current || draggingPhotoRef.current) return; e.preventDefault(); setDragOverSectionId(section.id) }}
                      onDrop={e => { e.preventDefault(); if (draggingSectionRef.current && draggingSectionRef.current !== section.id) reorderSection(draggingSectionRef.current, section.id); setDragOverSectionId(null) }}
                      className="flex items-center gap-2 p-2.5 rounded-lg transition-all"
                      style={{
                        background: dragOverSectionId === section.id ? 'rgba(196,164,124,0.10)' : 'var(--bg-surface)',
                        border: `1px solid ${dragOverSectionId === section.id ? 'var(--accent)' : 'var(--border-color)'}`,
                        cursor: 'grab',
                      }}
                    >
                      <GripHorizontal className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      {editingSectionId === section.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input autoFocus value={editingSectionTitle} onChange={e => setEditingSectionTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameSection(section.id); if (e.key === 'Escape') setEditingSectionId(null) }} className="input-base py-1 text-[13px] flex-1" />
                          <button onClick={() => renameSection(section.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--cta-bg)', color: '#fff' }}><Check className="w-3 h-3" /></button>
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
            <button onClick={saveSettings} disabled={savingSettings} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--accent)' }}>
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
            galleryTitle={gallery.title}
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

      {/* Floating action bar — appears when photos are selected */}
      {selected.size > 0 && (
        <>
          {/* Backdrop — click outside to dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { clearSelection(); setShowMoveToSet(false) }}
          />
          <div className="fixed bottom-6 left-1/2 z-50 pointer-events-auto" style={{ transform: 'translateX(-50%)' }}>
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              backdropFilter: 'blur(12px)',
              whiteSpace: 'nowrap',
            }}
          >
            {/* X to cancel */}
            <button
              onClick={() => { clearSelection(); setShowMoveToSet(false) }}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,76,26,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              title="Auswahl aufheben"
            >
              <X className="w-3 h-3" />
            </button>
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {selected.size} {selected.size === 1 ? 'Foto' : 'Fotos'}
            </span>
            <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border-color)' }} />
            <button onClick={selectAll} className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Alle</button>
            {sections.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowMoveToSet(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-colors"
                  style={{
                    background: showMoveToSet ? 'var(--accent)' : 'var(--bg-hover)',
                    color: showMoveToSet ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  <GripHorizontal className="w-3.5 h-3.5" />
                  Zu Set
                </button>
                {showMoveToSet && (
                  <div
                    className="absolute bottom-full mb-2 left-0 min-w-[180px] rounded-xl overflow-hidden"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    }}
                  >
                    <button
                      onClick={() => { assignPhotosToSection(null); setShowMoveToSet(false) }}
                      className="w-full text-left px-3 py-2.5 text-[12px] transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Kein Set (allgemein)
                    </button>
                    <div className="h-px mx-2" style={{ background: 'var(--border-color)' }} />
                    {sections.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { assignPhotosToSection(s.id); setShowMoveToSet(false) }}
                        className="w-full text-left px-3 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-between"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span>{s.title}</span>
                        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {photos.filter(p => p.section_id === s.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border-color)' }} />
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold text-white transition-opacity"
              style={{ background: '#E84C1A' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Löschen
            </button>
          </div>
        </div>
        </>
      )}

      {/* ── Right-click context menu ── */}
      {contextMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          />
          <div
            className="fixed z-[9999] rounded-xl overflow-hidden py-1"
            style={{
              left: Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 230),
              top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 320),
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
              minWidth: 210,
            }}
          >
            <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              {selected.size} {selected.size === 1 ? 'Foto' : 'Fotos'} ausgewählt
            </div>
            {sections.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Verschieben zu
                </div>
                <button
                  onClick={() => { assignPhotosToSection(null); setContextMenu(null) }}
                  className="w-full text-left px-3 py-2 text-[13px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Kein Set (allgemein)
                </button>
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { assignPhotosToSection(s.id); setContextMenu(null) }}
                    className="w-full text-left px-3 py-2 text-[13px] font-medium transition-colors flex items-center justify-between"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{s.title}</span>
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{photos.filter(p => p.section_id === s.id).length}</span>
                  </button>
                ))}
                <div className="h-px mx-2 my-1" style={{ background: 'var(--border-color)' }} />
              </>
            )}
            <button
              onClick={() => { setContextMenu(null); deleteSelected() }}
              className="w-full text-left px-3 py-2 text-[13px] font-medium transition-colors flex items-center gap-2"
              style={{ color: '#E84C1A' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,76,26,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Löschen
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── Client Favorites List (compact) ── */}
      {(() => {
        const favoritePhotos = photos.filter(p => p.is_favorite)
        if (favoritePhotos.length === 0) return null
        return (
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
              onClick={() => setFavoritesExpanded(f => !f)}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 flex-shrink-0" />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {favoriteListName || 'Favoriten'}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                {favoritePhotos.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadFavorites() }}
                  disabled={downloadingFavorites}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg text-white disabled:opacity-50"
                  style={{ background: '#111110' }}
                >
                  {downloadingFavorites
                    ? <><Loader2 className="w-3 h-3 animate-spin" />{favDownloadProgress > 0 ? `${favDownloadProgress}%` : '...'}</>
                    : <><Download className="w-3 h-3" />ZIP</>
                  }
                </button>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', favoritesExpanded ? 'rotate-180' : '')} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            {favoritesExpanded && (
              <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(239,68,68,0.12)' }}>
                {downloadingFavorites && favDownloadProgress > 0 && (
                  <div className="w-full rounded-full h-1 overflow-hidden mt-2 mb-2" style={{ background: 'rgba(239,68,68,0.15)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${favDownloadProgress}%`, background: '#EF4444' }} />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {favoritePhotos.slice(0, 20).map(photo => (
                    <div key={photo.id} className="relative rounded-md overflow-hidden flex-shrink-0" style={{ width: 48, height: 48 }}>
                      <img
                        src={getPhotoUrl(photo.thumbnail_url || photo.storage_url, 100, 70, 'cover')}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                  {favoritePhotos.length > 20 && (
                    <div className="rounded-md flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ width: 48, height: 48, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      +{favoritePhotos.length - 20}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Sets tab nav + view toggle ── */}
      {photos.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setActiveSection('all'); setVisibleCount(DASH_LIMIT); setShowMoveToSet(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex-shrink-0"
            style={activeSection === 'all'
              ? { background: 'var(--cta-bg)', color: '#fff' }
              : { background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
          >
            Alle <span className="font-bold tabular-nums">{photos.length}</span>
          </button>
          {sections.map(s => {
            const cnt = photos.filter(p => p.section_id === s.id).length
            const isActive = activeSection === s.id
            const isDragTarget = sectionDragOver === s.id
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setVisibleCount(DASH_LIMIT); setShowMoveToSet(false) }}
                onDragOver={e => { if (draggingPhotoRef.current) { e.preventDefault(); setSectionDragOver(s.id) } }}
                onDragLeave={() => setSectionDragOver(null)}
                onDrop={e => { e.preventDefault(); if (draggingPhotoRef.current) assignPhotosToSection(s.id); setSectionDragOver(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex-shrink-0"
                style={{
                  background: isActive ? 'var(--cta-bg)' : isDragTarget ? 'rgba(196,164,124,0.18)' : 'var(--bg-hover)',
                  color: isActive ? '#fff' : isDragTarget ? 'var(--accent)' : 'var(--text-muted)',
                  border: isDragTarget ? '1px dashed rgba(196,164,124,0.6)' : '1px solid var(--border-color)',
                  transform: isDragTarget ? 'scale(1.04)' : 'none',
                }}
              >
                {s.title} <span className="font-bold tabular-nums">{cnt}</span>
              </button>
            )
          })}
          {sections.length > 0 && unsectionedPhotos.length > 0 && (
            <button
              onClick={() => { setActiveSection('unsectioned'); setVisibleCount(DASH_LIMIT); setShowMoveToSet(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex-shrink-0"
              style={activeSection === 'unsectioned'
                ? { background: 'var(--cta-bg)', color: '#fff' }
                : { background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
            >
              Ohne Set <span className="font-bold tabular-nums">{unsectionedPhotos.length}</span>
            </button>
          )}
          <button
            onClick={() => addSection()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all flex-shrink-0"
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <Plus className="w-3 h-3" />Set
          </button>
          {/* Sort order */}
          <div className="ml-auto flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-hover)' }}>
            {([
              { key: 'name-asc' as const, label: 'A→Z', title: 'Name aufsteigend' },
              { key: 'name-desc' as const, label: 'Z→A', title: 'Name absteigend' },
              { key: 'manual' as const, label: 'Manuell', title: 'Manuelle Reihenfolge' },
            ]).map(({ key, label, title }) => (
              <button
                key={key}
                onClick={() => setDashSortOrder(key)}
                title={title}
                className="px-2 h-6 rounded-md text-[11px] font-semibold transition-all flex-shrink-0"
                style={{
                  background: dashSortOrder === key ? 'var(--bg-surface)' : 'transparent',
                  color: dashSortOrder === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: dashSortOrder === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-hover)' }}>
            {([
              { mode: 'grid' as const, Icon: LayoutGrid, title: 'Rasteransicht' },
              { mode: 'list' as const, Icon: List, title: 'Listenansicht' },
            ]).map(({ mode, Icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                className="p-1.5 rounded-md transition-all"
                style={{
                  background: viewMode === mode ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Unified photo grid — one tab at a time ── */}
      {photos.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl transition-all cursor-pointer"
          style={{ border: globalDragOver ? '2px dashed var(--accent)' : '2px dashed var(--border-color)', background: globalDragOver ? 'rgba(196,164,124,0.04)' : 'transparent' }}
          onClick={() => setShowUploader(true)}
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setGlobalDragOver(true) } }}
          onDragLeave={() => setGlobalDragOver(false)}
          onDrop={e => { e.preventDefault(); setGlobalDragOver(false); setShowUploader(true) }}
        >
          <Images className="w-8 h-8 mx-auto mb-3" style={{ color: globalDragOver ? 'var(--accent)' : 'var(--border-strong)' }} />
          <p className="text-sm font-medium" style={{ color: globalDragOver ? 'var(--accent)' : 'var(--text-muted)' }}>
            {globalDragOver ? 'Loslassen zum Hochladen' : 'Fotos hierher ziehen oder klicken zum Hochladen'}
          </p>
        </div>
      ) : activePhotos.length === 0 && activeSection !== 'all' ? (
        <div className="text-center py-12 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
          <Images className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[13px] mb-2" style={{ color: 'var(--text-muted)' }}>Noch keine Fotos in diesem Set</p>
          <button onClick={() => { setUploadSectionId(activeSection); setShowUploader(true) }} className="text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
            + Fotos hochladen
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-0.5">
          {activePhotos.slice(0, visibleCount).map(photo => {
            const sectionName = activeSection === 'all' ? sections.find(s => s.id === photo.section_id)?.title : undefined
            return (
              <div key={photo.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all cursor-pointer" style={{ background: selected.has(photo.id) ? 'rgba(196,164,124,0.08)' : 'transparent', border: selected.has(photo.id) ? '1px solid rgba(196,164,124,0.2)' : '1px solid transparent' }}
                onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); handlePhotoPaintSelect(photo.id) } }}
                onMouseEnter={(e) => { if (e.buttons > 0 && (e.ctrlKey || e.metaKey)) handlePhotoPaintSelect(photo.id) }}
                onClick={(e) => { if (e.ctrlKey || e.metaKey) return; toggleSelect(photo.id, e.shiftKey) }}
                onContextMenu={(e) => { e.preventDefault(); handlePhotoContextMenu(photo.id, e.clientX, e.clientY) }}
              >
                <img src={getPhotoUrl(photo.thumbnail_url || photo.storage_url, 80, 70, 'cover')} alt={photo.filename} className="w-9 h-9 rounded-md object-cover flex-shrink-0" loading="lazy" />
                <span className="text-[13px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{photo.filename}</span>
                {sectionName && <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{sectionName}</span>}
                <span className="text-[11px] flex-shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatBytes(photo.file_size)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activePhotos.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
              {activePhotos.slice(0, visibleCount).map(photo => (
                <SortablePhoto key={photo.id} photo={photo} selected={selected.has(photo.id)} isCover={gallery.cover_photo_id === photo.id} sectionLabel={activeSection === 'all' && photo.section_id ? sections.find(s => s.id === photo.section_id)?.title : undefined} onSelect={toggleSelect} onContextMenu={handlePhotoContextMenu} onPaintSelect={handlePhotoPaintSelect} onDragStartSection={handleDragStartSection} onDragEndSection={handleDragEndSection} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Load More */}
      {activePhotos.length > 0 && visibleCount < activePhotos.length && (
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + 100, activePhotos.length))}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--accent)', color: '#1A1A18', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          >
            <Plus className="w-4 h-4" />
            Mehr laden ({activePhotos.length - visibleCount} weitere)
          </button>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {Math.min(visibleCount, activePhotos.length)} von {activePhotos.length} Fotos
          </span>
        </div>
      )}

      {/* Focal point modal — rendered via portal so it always escapes any stacking context */}
      {showFocalModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 720, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Fokuspunkt setzen</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Klick auf das Bild um den Fokuspunkt zu setzen</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--accent)' }}>{focalX}% / {focalY}%</span>
                <button onClick={() => setShowFocalModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {gallery?.cover_photo_id && (() => {
              const cp = photos.find(p => p.id === gallery.cover_photo_id)
              if (!cp) return null
              return (
                <div
                  className="relative cursor-crosshair select-none"
                  style={{ aspectRatio: '16/9', background: '#111' }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setFocalX(Math.round(((e.clientX - rect.left) / rect.width) * 100))
                    setFocalY(Math.round(((e.clientY - rect.top) / rect.height) * 100))
                  }}
                >
                  <img
                    src={getPhotoUrl(cp.thumbnail_url || cp.storage_url, 1200, 85, 'cover')}
                    alt="" className="w-full h-full object-cover pointer-events-none"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                  <FocalCrosshair x={focalX} y={focalY} />
                </div>
              )
            })()}
            <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowFocalModal(false)} className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-white" style={{ background: 'var(--accent)' }}>
                Übernehmen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
