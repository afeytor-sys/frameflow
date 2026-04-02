'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Heart, Download, X, ChevronLeft, ChevronRight,
  ZoomIn, Loader2, Play, Pause, Maximize2,
  LayoutGrid, Columns2, AlignJustify, SlidersHorizontal, EyeOff,
  Pencil, Trash2, Plus, Check,
} from 'lucide-react'
import { cn, getPhotoUrl } from '@/lib/utils'
import toast from 'react-hot-toast'
import PhotoComments from './PhotoComments'
import type { GalleryTheme } from '@/lib/galleryThemes'

type PhotoTag = 'green' | 'yellow' | 'red' | null
type GalleryLayout = 'masonry' | 'grid' | 'columns'

interface Section {
  id: string
  title: string
  display_order: number
}

interface Photo {
  id: string
  storage_url: string
  thumbnail_url: string | null
  filename: string
  is_favorite: boolean
  is_private?: boolean
  display_order: number
  tag?: PhotoTag
  section_id?: string | null
}

interface Props {
  galleryId: string
  projectId: string
  galleryTitle: string
  clientName: string
  initialPhotos: Photo[]
  initialSections?: Section[]
  downloadEnabled: boolean
  commentsEnabled: boolean
  showWatermark: boolean
  token: string
  theme?: GalleryTheme
  photoCount?: number
  /** Public gallery mode: hides favorites, comments, tags */
  isPublic?: boolean
  /** Kunden-PW access: can mark photos as private (hidden from Gäste) */
  canMarkPrivate?: boolean
  /** Whether color tags are enabled for this gallery (controlled by photographer) */
  tagsEnabled?: boolean
}

// ── Notify photographer helper ───────────────────────────────────────────────
async function notifyPhotographer(
  galleryId: string,
  type: 'photo_downloaded' | 'gallery_downloaded' | 'favorite_marked',
  clientName: string,
  photoName?: string
) {
  try {
    await fetch(`/api/galleries/${galleryId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, clientName, photoName }),
    })
  } catch {
    // silent — never block the user action
  }
}

const TAG_CONFIG = {
  green:  { label: 'Auswahl',    bg: '#22C55E', ring: '#16A34A' },
  yellow: { label: 'Vielleicht', bg: '#EAB308', ring: '#CA8A04' },
  red:    { label: 'Ablehnen',   bg: '#EF4444', ring: '#DC2626' },
}

const LAYOUT_OPTIONS: { key: GalleryLayout; icon: React.ElementType; label: string }[] = [
  { key: 'masonry',  icon: LayoutGrid,    label: 'Masonry' },
  { key: 'grid',     icon: AlignJustify,  label: 'Raster' },
  { key: 'columns',  icon: Columns2,      label: 'Spalten' },
]

// ── Image URL helpers ────────────────────────────────────────────────
// Always use storage_url — thumbnail_url equals storage_url anyway (no
// separate thumbnail generation). getPhotoUrl applies Cloudflare Image
// Resizing for photos.fotonizer.com URLs, delivering WebP at the right size.
// width is driven by the imageSize slider (400–1200px)
function getThumbnailUrl(photo: Photo, width = 800): string {
  return getPhotoUrl(photo.storage_url, width, 82, 'cover', 1)
}

function getLightboxUrl(photo: Photo): string {
  return getPhotoUrl(photo.storage_url, 2400, 90, 'contain', 1)
}

// ── Lazy image component with skeleton ──────────────────────────────
// Uses native <img> to avoid Next.js Image fill/height constraints in masonry
function LazyImage({
  src, alt, className, onLoad, priority = false,
}: {
  src: string; fallbackSrc?: string; alt: string; className?: string; onLoad?: () => void; priority?: boolean
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={cn('relative w-full h-full', className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-white/8 animate-pulse rounded-sm" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => { setLoaded(true); onLoad?.() }}
      />
    </div>
  )
}

export default function GalleryViewer({
  galleryId,
  projectId,
  galleryTitle,
  clientName,
  initialPhotos,
  initialSections = [],
  downloadEnabled,
  commentsEnabled,
  token,
  theme,
  photoCount,
  isPublic = false,
  canMarkPrivate = false,
  tagsEnabled = true,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)

  // ── Sets / sections state ────────────────────────────────────────
  const [sections, setSections]             = useState<Section[]>(initialSections)
  const [activeSection, setActiveSection]   = useState<string | null>(null)
  // Inline create
  const [addingSet, setAddingSet]           = useState(false)
  const [newSetTitle, setNewSetTitle]       = useState('')
  // Inline rename
  const [renamingId, setRenamingId]         = useState<string | null>(null)
  const [renameTitle, setRenameTitle]       = useState('')
  const newSetInputRef                      = useRef<HTMLInputElement>(null)
  const renameInputRef                      = useRef<HTMLInputElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxLoaded, setLightboxLoaded] = useState(false)
  const [downloadPending, setDownloadPending] = useState(false)
  const [filterTag, setFilterTag] = useState<PhotoTag | 'favorite' | null>(null)
  const [showTagMenu, setShowTagMenu] = useState<string | null>(null)
  const [showTagFilters, setShowTagFilters] = useState(false)

  // ── Progressive loading ──────────────────────────────────────────
  const INITIAL_LIMIT = 50
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT)

  // Layout & size controls
  const [layout, setLayout] = useState<GalleryLayout>('masonry')
  const [imageSize, setImageSize] = useState(3)
  const [showControls, setShowControls] = useState(false)
  // Sort order
  type SortOrder = 'manual' | 'name-asc' | 'name-desc'
  const [sortOrder, setSortOrder] = useState<SortOrder>('manual')

  // Presentation mode
  const [presentMode, setPresentMode] = useState(false)
  const [presentIndex, setPresentIndex] = useState(0)
  const [presentPlaying, setPresentPlaying] = useState(true)
  const [presentLoaded, setPresentLoaded] = useState(false)
  const presentTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const SLIDE_DURATION = 4000

  // Favorite list name modal
  const [showFavoriteNameModal, setShowFavoriteNameModal] = useState(false)
  const [favoriteListName, setFavoriteListName] = useState<string | null>(null)
  const [favoriteNameInput, setFavoriteNameInput] = useState('')
  const [savingFavoriteName, setSavingFavoriteName] = useState(false)
  // Track if we've already asked for a name this session
  const hasAskedForNameRef = useRef(false)

  // Swipe + auto-hide controls
  const touchStartX    = useRef<number>(0)
  const justSwiped     = useRef(false)
  const hideTimer      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isMobile, setIsMobile]           = useState(false)
  const [hideControls, setHideControls]   = useState(false)

  const supabase = createClient()

  // ── Track gallery view on mount ──────────────────────────────────
  useEffect(() => {
    // Increment view count (fire & forget)
    void supabase.rpc('increment_view_count', { gallery_id: galleryId })
    // Notify photographer of gallery view (fire & forget, only for client portal not public)
    if (!isPublic) {
      fetch(`/api/galleries/${galleryId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gallery_viewed', clientName }),
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId])

  // Load existing favorite list name from gallery
  useEffect(() => {
    supabase
      .from('galleries')
      .select('favorite_list_name')
      .eq('id', galleryId)
      .single()
      .then(({ data }) => {
        if (data?.favorite_list_name) {
          setFavoriteListName(data.favorite_list_name)
          hasAskedForNameRef.current = true
        }
      })
  }, [galleryId])

  const favoriteCount = photos.filter((p) => p.is_favorite).length
  const tagCounts = {
    green:  photos.filter((p) => p.tag === 'green').length,
    yellow: photos.filter((p) => p.tag === 'yellow').length,
    red:    photos.filter((p) => p.tag === 'red').length,
  }

  // Section filter applied first, then tag/favorite filter on top
  const sectionBase = activeSection
    ? photos.filter(p => p.section_id === activeSection)
    : photos

  const filteredBase = filterTag === 'favorite'
    ? sectionBase.filter((p) => p.is_favorite)
    : filterTag
    ? sectionBase.filter((p) => p.tag === filterTag)
    : sectionBase

  const filteredPhotos = sortOrder === 'manual'
    ? filteredBase
    : [...filteredBase].sort((a, b) => {
        const cmp = a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' })
        return sortOrder === 'name-asc' ? cmp : -cmp
      })

  // ── Progressive loading: slice to visible count ──────────────────
  const visiblePhotos = filteredPhotos.slice(0, visibleCount)

  const currentPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null

  // ── Reset visible count when filter or sort changes ─────────────
  useEffect(() => {
    setVisibleCount(INITIAL_LIMIT)
  }, [filterTag, sortOrder])

  // Persist layout preference
  useEffect(() => {
    const saved = localStorage.getItem(`ff-gallery-layout-${galleryId}`)
    if (saved) setLayout(saved as GalleryLayout)
    const savedSize = localStorage.getItem(`ff-gallery-size-${galleryId}`)
    if (savedSize) setImageSize(Number(savedSize))
  }, [galleryId])

  const setLayoutPersist = (l: GalleryLayout) => {
    setLayout(l)
    localStorage.setItem(`ff-gallery-layout-${galleryId}`, l)
  }
  const setSizePersist = (s: number) => {
    setImageSize(s)
    localStorage.setItem(`ff-gallery-size-${galleryId}`, String(s))
  }

  const gridCols = {
    1: 'grid-cols-6',
    2: 'grid-cols-5',
    3: 'grid-cols-4',
    4: 'grid-cols-3',
    5: 'grid-cols-2',
  }[imageSize] || 'grid-cols-4'

  const masonryCols = {
    1: 'columns-3 sm:columns-5 lg:columns-6',
    2: 'columns-3 sm:columns-4 lg:columns-5',
    3: 'columns-2 sm:columns-3 lg:columns-4',
    4: 'columns-2 sm:columns-3',
    5: 'columns-2',
  }[imageSize] || 'columns-2 sm:columns-3 lg:columns-4'

  // Map size slider (1–5) → thumbnail fetch width (used by getThumbnailUrl)
  const THUMB_WIDTHS: Record<number, number> = { 1: 400, 2: 600, 3: 800, 4: 1000, 5: 1200 }
  const thumbWidth = THUMB_WIDTHS[imageSize] ?? 800

  const columnHeight = {
    1: 'h-48',
    2: 'h-56',
    3: 'h-64',
    4: 'h-72',
    5: 'h-80',
  }[imageSize] || 'h-64'

  // ── Keyboard navigation ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex !== null) {
        if (e.key === 'ArrowLeft') prevPhoto()
        if (e.key === 'ArrowRight') nextPhoto()
        if (e.key === 'Escape') closeLightbox()
      }
      if (presentMode) {
        if (e.key === 'ArrowLeft') presentPrev()
        if (e.key === 'ArrowRight') presentNext()
        if (e.key === 'Escape') exitPresent()
        if (e.key === ' ') { e.preventDefault(); setPresentPlaying((p) => !p) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, presentMode, presentIndex, filteredPhotos.length])

  // ── Body scroll lock ─────────────────────────────────────────────
  useEffect(() => {
    const locked = lightboxIndex !== null || presentMode || showFavoriteNameModal
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxIndex, presentMode, showFavoriteNameModal])

  // ── Slideshow auto-advance ───────────────────────────────────────
  useEffect(() => {
    if (!presentMode || !presentPlaying) {
      if (presentTimer.current) clearInterval(presentTimer.current)
      return
    }
    presentTimer.current = setInterval(() => {
      setPresentLoaded(false)
      setPresentIndex((i) => (i + 1) % photos.length)
    }, SLIDE_DURATION)
    return () => { if (presentTimer.current) clearInterval(presentTimer.current) }
  }, [presentMode, presentPlaying, photos.length])

  const presentNext = () => { setPresentLoaded(false); setPresentIndex((i) => (i + 1) % photos.length) }
  const presentPrev = () => { setPresentLoaded(false); setPresentIndex((i) => (i - 1 + photos.length) % photos.length) }
  const exitPresent = () => { setPresentMode(false); setPresentPlaying(true); if (presentTimer.current) clearInterval(presentTimer.current) }
  const startPresent = () => { setPresentIndex(0); setPresentLoaded(false); setPresentPlaying(true); setPresentMode(true) }

  // ── Sets CRUD ────────────────────────────────────────────────────
  const createSection = async () => {
    const title = newSetTitle.trim()
    if (!title) { setAddingSet(false); setNewSetTitle(''); return }
    const display_order = sections.length
    const { data, error } = await supabase
      .from('gallery_sections')
      .insert({ gallery_id: galleryId, title, display_order })
      .select('id, title, display_order')
      .single()
    if (error) { toast.error('Fehler beim Erstellen'); return }
    setSections(prev => [...prev, data as Section])
    setNewSetTitle('')
    setAddingSet(false)
    setActiveSection((data as Section).id)
  }

  const commitRename = async (id: string) => {
    const title = renameTitle.trim()
    if (!title) { setRenamingId(null); return }
    const { error } = await supabase.from('gallery_sections').update({ title }).eq('id', id)
    if (error) { toast.error('Fehler beim Umbenennen'); return }
    setSections(prev => prev.map(s => s.id === id ? { ...s, title } : s))
    setRenamingId(null)
  }

  const deleteSection = async (id: string) => {
    if (!confirm('Set löschen? Fotos bleiben erhalten, werden aber keinem Set zugeordnet.')) return
    const { error } = await supabase.from('gallery_sections').delete().eq('id', id)
    if (error) { toast.error('Fehler beim Löschen'); return }
    // Detach photos locally
    setPhotos(prev => prev.map(p => p.section_id === id ? { ...p, section_id: null } : p))
    setSections(prev => prev.filter(s => s.id !== id))
    if (activeSection === id) setActiveSection(null)
  }

  // ── Auto-focus inline set inputs ─────────────────────────────────
  useEffect(() => { if (addingSet)   setTimeout(() => newSetInputRef.current?.focus(), 30) }, [addingSet])
  useEffect(() => { if (renamingId) setTimeout(() => renameInputRef.current?.select(), 30) }, [renamingId])

  // ── Mobile detection (pointer: coarse = touch device) ────────────
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse), (max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Auto-hide lightbox controls after 3 s of inactivity ──────────
  const resetHideTimer = useCallback(() => {
    setHideControls(false)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setHideControls(true), 3000)
  }, [])

  useEffect(() => {
    if (lightboxIndex !== null) {
      resetHideTimer()
    } else {
      setHideControls(false)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [lightboxIndex, resetHideTimer])

  // ── Save favorite list name ──────────────────────────────────────
  const saveFavoriteListName = async (name: string) => {
    setSavingFavoriteName(true)
    const trimmed = name.trim() || 'Os meus favoritos'
    const { error } = await supabase
      .from('galleries')
      .update({ favorite_list_name: trimmed })
      .eq('id', galleryId)
    if (!error) {
      setFavoriteListName(trimmed)
      hasAskedForNameRef.current = true
    }
    setSavingFavoriteName(false)
    setShowFavoriteNameModal(false)
  }

  // ── Toggle favorite ──────────────────────────────────────────────
  const toggleFavorite = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return
    const newValue = !photo.is_favorite
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_favorite: newValue } : p))

    // If this is the first favorite and we haven't asked for a name yet, show modal
    const currentFavCount = photos.filter((p) => p.is_favorite).length
    if (newValue && currentFavCount === 0 && !hasAskedForNameRef.current) {
      setShowFavoriteNameModal(true)
    }

    const { error } = await supabase.from('photos').update({ is_favorite: newValue }).eq('id', photoId)
    if (error) {
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_favorite: !newValue } : p))
      toast.error('Error saving')
    } else if (newValue && !isPublic) {
      // Notify photographer when a favorite is marked (fire & forget)
      notifyPhotographer(galleryId, 'favorite_marked', clientName)
    }
  }

  // ── Toggle private ───────────────────────────────────────────────
  const togglePrivate = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return
    const newVal = !photo.is_private
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_private: newVal } : p))
    const { error } = await supabase.from('photos').update({ is_private: newVal }).eq('id', photoId)
    if (error) {
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_private: !newVal } : p))
      toast.error('Fehler beim Speichern')
    } else {
      toast.success(newVal ? 'Foto privat — nur mit Kunden-PW sichtbar' : 'Foto wieder öffentlich')
    }
  }

  // ── Set tag ──────────────────────────────────────────────────────
  const setTag = async (photoId: string, tag: PhotoTag) => {
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return
    const newTag = photo.tag === tag ? null : tag
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, tag: newTag } : p))
    setShowTagMenu(null)
    const { error } = await supabase.from('photos').update({ tag: newTag }).eq('id', photoId)
    if (error) {
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, tag: photo.tag } : p))
      toast.error('Error saving')
    }
  }

  // ── Download ─────────────────────────────────────────────────────
  const downloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.storage_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = photo.filename; a.click()
      URL.revokeObjectURL(url)
      try { await supabase.rpc('increment_photo_download_count', { gallery_id: galleryId }) } catch {}
      // Notify photographer (fire & forget) — always notify, even for public galleries
      notifyPhotographer(galleryId, 'photo_downloaded', clientName || 'Visitante', photo.filename)
    } catch { toast.error('Download fehlgeschlagen') }
  }

  const downloadAll = () => {
    if (downloadPending || photos.length === 0) return
    setDownloadPending(true)
    const a = document.createElement('a')
    a.href = `/api/galleries/${galleryId}/download`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    try { supabase.rpc('increment_download_count', { gallery_id: galleryId }) } catch {}
    notifyPhotographer(galleryId, 'gallery_downloaded', clientName || 'Visitante')
    setTimeout(() => setDownloadPending(false), 3000)
  }

  // ── Lightbox ─────────────────────────────────────────────────────
  const openLightbox = (index: number) => { setLightboxLoaded(false); setLightboxIndex(index) }
  const closeLightbox = () => setLightboxIndex(null)
  const prevPhoto = useCallback(() => {
    setLightboxLoaded(false)
    setLightboxIndex((i) => (i !== null ? (i - 1 + filteredPhotos.length) % filteredPhotos.length : null))
  }, [filteredPhotos.length])
  const nextPhoto = useCallback(() => {
    setLightboxLoaded(false)
    setLightboxIndex((i) => (i !== null ? (i + 1) % filteredPhotos.length : null))
  }, [filteredPhotos.length])

  // ── Photo card (shared between layouts) ─────────────────────────
  const PhotoCard = ({ photo, index, className }: { photo: Photo; index: number; className?: string }) => (
    <div
      className={cn('relative group cursor-pointer overflow-hidden rounded-sm photo-card-hover', className)}
      onClick={() => openLightbox(index)}
    >
      <LazyImage
        src={getThumbnailUrl(photo, thumbWidth)}
        fallbackSrc={photo.thumbnail_url || photo.storage_url}
        alt={photo.filename}
        className="w-full h-full photo-img-hover"
        priority={index < 8}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-350" />
      {/* Zoom icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="w-14 h-14 rounded-full bg-white/18 backdrop-blur-sm flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300">
          <ZoomIn className="w-6 h-6 text-white" />
        </div>
      </div>
      {/* Top-right actions */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggleFavorite(photo.id)}
          className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg', photo.is_favorite ? 'bg-rose-500 text-white' : 'bg-black/50 backdrop-blur-sm text-white/80 hover:text-rose-400')}
        >
          <Heart className={cn('w-5 h-5', photo.is_favorite && 'fill-white')} style={{ width: 20, height: 20 }} />
        </button>
        {tagsEnabled && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowTagMenu(showTagMenu === photo.id ? null : photo.id) }}
              className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg', photo.tag ? 'opacity-100' : 'bg-black/50 backdrop-blur-sm text-white/80 hover:text-white')}
              style={photo.tag ? { background: TAG_CONFIG[photo.tag].bg } : {}}
            >
              <span className="text-[13px] font-bold text-white">●</span>
            </button>
            {showTagMenu === photo.id && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[130px]" style={{ background: '#1A1A18', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
                {(Object.entries(TAG_CONFIG) as Array<[keyof typeof TAG_CONFIG, typeof TAG_CONFIG[keyof typeof TAG_CONFIG]]>).map(([tag, cfg]) => (
                  <button key={tag} onClick={() => setTag(photo.id, tag)} className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium transition-colors', photo.tag === tag ? 'text-white bg-white/8' : 'text-white/60 hover:text-white hover:bg-white/5')}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.bg }} />
                    {cfg.label}
                    {photo.tag === tag && <span className="ml-auto text-white/40">✓</span>}
                  </button>
                ))}
                {photo.tag && (
                  <button onClick={() => setTag(photo.id, photo.tag ?? null)} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/30 hover:text-white/60 transition-colors border-t border-white/5">
                    Tag entfernen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {downloadEnabled && (
          <button onClick={() => downloadPhoto(photo)} className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all shadow-lg">
            <Download style={{ width: 20, height: 20 }} />
          </button>
        )}
        {/* Mark as private — only for Kunden-PW access */}
        {canMarkPrivate && (
          <button
            onClick={(e) => { e.stopPropagation(); togglePrivate(photo.id) }}
            title={photo.is_private ? 'Privat (nur Kunden-PW) — klicken zum Aufheben' : 'Als privat markieren (für Gäste verbergen)'}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg',
              photo.is_private
                ? 'bg-violet-600 text-white'
                : 'bg-black/50 backdrop-blur-sm text-white/60 hover:text-violet-300'
            )}
          >
            <EyeOff style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>
      {/* Indicators */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {photo.is_favorite && <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 drop-shadow-lg" />}
        {tagsEnabled && photo.tag && <span className="w-3 h-3 rounded-full border border-black/20 drop-shadow-lg" style={{ background: TAG_CONFIG[photo.tag].bg }} />}
        {photo.is_private && canMarkPrivate && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-violet-600/80 drop-shadow-lg">
            <EyeOff className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </div>
    </div>
  )

  // Theme-aware colors for toolbar
  const tbBg = theme ? `${theme.surface}E0` : 'rgba(248,247,244,0.9)'
  const tbText = theme ? theme.textMuted : '#7A7670'
  const tbTextHover = theme ? theme.text : '#111110'
  const tbBorder = theme ? theme.border : '#E8E4DC'

  // Wire up hero buttons (rendered server-side) to client actions
  useEffect(() => {
    const dlBtn = document.getElementById('hero-download-btn')
    const favBtn = document.getElementById('hero-favorites-btn')
    if (dlBtn) {
      const handler = () => downloadAll()
      dlBtn.addEventListener('click', handler)
      return () => dlBtn.removeEventListener('click', handler)
    }
    if (favBtn) {
      const handler = () => setFilterTag(f => f === 'favorite' ? null : 'favorite')
      favBtn.addEventListener('click', handler)
      return () => favBtn.removeEventListener('click', handler)
    }
  }, [photos.length, downloadEnabled])

  const totalCount = photoCount ?? photos.length
  const photoCountLabel = filterTag
    ? `${filteredPhotos.length} von ${totalCount} Bildern`
    : `${totalCount} Bilder aus eurem Shooting`

  return (
    <>
      {/* ── Favorite List Name Modal ── */}
      {showFavoriteNameModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              </div>
              <h3 className="text-[17px] font-bold text-[#111110] mb-1" style={{ letterSpacing: '-0.02em' }}>
                Deine Favoritenliste
              </h3>
              <p className="text-[13px] text-[#7A7670] mb-5">
                Gib deiner Favoritenliste einen Namen, damit dein Fotograf sie leicht erkennen kann.
              </p>
              <input
                autoFocus
                value={favoriteNameInput}
                onChange={e => setFavoriteNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveFavoriteListName(favoriteNameInput) }}
                placeholder="z.B. Meine Auswahl, Hochzeitsfotos…"
                className="w-full px-4 py-3 text-[14px] border border-[#E8E4DC] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/15 transition-all"
                maxLength={80}
              />
            </div>
            <div className="flex gap-2 px-6 py-4">
              <button
                onClick={() => saveFavoriteListName(favoriteNameInput || 'Meine Favoriten')}
                disabled={savingFavoriteName}
                className="flex-1 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: '#111110' }}
              >
                {savingFavoriteName ? 'Speichern…' : 'Speichern'}
              </button>
              <button
                onClick={() => { hasAskedForNameRef.current = true; setShowFavoriteNameModal(false) }}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={{ background: '#F5F4F1', color: '#7A7670' }}
              >
                Überspringen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sets navigation bar ── */}
      {sections.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {/* "Alle Fotos" pill */}
          <button
            onClick={() => setActiveSection(null)}
            className={cn(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all',
              activeSection === null
                ? 'text-white'
                : 'hover:opacity-80'
            )}
            style={activeSection === null
              ? { background: theme?.text ?? '#111110', color: theme?.bg ?? '#fff' }
              : { background: theme ? `${theme.surface}CC` : 'rgba(0,0,0,0.06)', color: theme?.textMuted ?? '#7A7670', border: `1px solid ${theme?.border ?? '#E8E4DC'}` }
            }
          >
            Alle Fotos
          </button>

          {/* One pill per section */}
          {sections.map(sec => {
            const isActive = activeSection === sec.id
            const isRenaming = renamingId === sec.id
            return (
              <div key={sec.id} className="group flex-shrink-0 relative flex items-center">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameTitle}
                    onChange={e => setRenameTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(sec.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => commitRename(sec.id)}
                    className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold outline-none min-w-0 w-28"
                    style={{ background: theme?.surface ?? '#F5F4F1', color: theme?.text ?? '#111110', border: `1.5px solid ${theme?.text ?? '#111110'}` }}
                  />
                ) : (
                  <button
                    onClick={() => setActiveSection(isActive ? null : sec.id)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all',
                      isActive ? 'text-white' : 'hover:opacity-80'
                    )}
                    style={isActive
                      ? { background: theme?.text ?? '#111110', color: theme?.bg ?? '#fff' }
                      : { background: theme ? `${theme.surface}CC` : 'rgba(0,0,0,0.06)', color: theme?.textMuted ?? '#7A7670', border: `1px solid ${theme?.border ?? '#E8E4DC'}` }
                    }
                  >
                    {sec.title}
                    <span className="ml-1.5 text-[10px] opacity-50">
                      {photos.filter(p => p.section_id === sec.id).length}
                    </span>
                  </button>
                )}

                {/* Edit / delete — only for non-public viewers, shown on hover */}
                {!isPublic && !isRenaming && (
                  <div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 z-10">
                    <button
                      onClick={e => { e.stopPropagation(); setRenamingId(sec.id); setRenameTitle(sec.title) }}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                      style={{ background: theme?.surface ?? '#F5F4F1', border: `1px solid ${theme?.border ?? '#E8E4DC'}`, color: theme?.textMuted ?? '#7A7670' }}
                      title="Umbenennen"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSection(sec.id) }}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                      style={{ background: theme?.surface ?? '#F5F4F1', border: `1px solid ${theme?.border ?? '#E8E4DC'}`, color: '#EF4444' }}
                      title="Löschen"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* "+" inline create — only for non-public viewers */}
          {!isPublic && (
            addingSet ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  ref={newSetInputRef}
                  value={newSetTitle}
                  onChange={e => setNewSetTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') createSection()
                    if (e.key === 'Escape') { setAddingSet(false); setNewSetTitle('') }
                  }}
                  onBlur={() => { if (!newSetTitle.trim()) { setAddingSet(false); setNewSetTitle('') } }}
                  placeholder="Neues Set…"
                  className="px-3 py-1.5 rounded-full text-[12.5px] outline-none w-32"
                  style={{ background: theme?.surface ?? '#F5F4F1', color: theme?.text ?? '#111110', border: `1.5px solid ${theme?.text ?? '#111110'}` }}
                />
                <button
                  onClick={createSection}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: theme?.text ?? '#111110', color: theme?.bg ?? '#fff' }}
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSet(true)}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: theme ? `${theme.surface}CC` : 'rgba(0,0,0,0.06)', color: theme?.textMuted ?? '#7A7670', border: `1px solid ${theme?.border ?? '#E8E4DC'}` }}
                title="Neues Set"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 mb-6 px-4 py-3 rounded-2xl sticky top-4 z-20"
        style={{
          background: tbBg,
          border: `1px solid ${tbBorder}`,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Left: photo count + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-[13px] font-semibold hidden sm:block"
            style={{ color: tbTextHover, letterSpacing: '-0.01em' }}
          >
            {photoCountLabel}
          </span>

          <div className="hidden sm:block w-px h-4" style={{ background: tbBorder }} />

          {/* Favorites filter — hidden in public mode */}
          {!isPublic && (
            <button
              onClick={() => setFilterTag(filterTag === 'favorite' ? null : 'favorite')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={{
                background: filterTag === 'favorite' ? '#EF444415' : 'transparent',
                color: filterTag === 'favorite' ? '#EF4444' : tbText,
                border: `1px solid ${filterTag === 'favorite' ? '#EF444430' : tbBorder}`,
              }}
            >
              <Heart className={cn('w-3.5 h-3.5', filterTag === 'favorite' && 'fill-current')} />
              {favoriteCount > 0 ? `${favoriteCount} Favoriten` : 'Favoriten'}
            </button>
          )}

          {/* Tags toggle button — hidden in public mode or when tags disabled */}
          {!isPublic && tagsEnabled && (
            <div className="relative">
              <button
                onClick={() => setShowTagFilters(!showTagFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background: showTagFilters || (filterTag && filterTag !== 'favorite') ? '#C4A47C15' : 'transparent',
                  color: showTagFilters || (filterTag && filterTag !== 'favorite') ? '#C4A47C' : tbText,
                  border: `1px solid ${showTagFilters || (filterTag && filterTag !== 'favorite') ? '#C4A47C30' : tbBorder}`,
                }}
              >
                {filterTag && filterTag !== 'favorite' ? (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: TAG_CONFIG[filterTag as keyof typeof TAG_CONFIG].bg }} />
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 3h10M3 6h6M5 9h2" strokeLinecap="round" />
                  </svg>
                )}
                Tags
              </button>
              {showTagFilters && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTagFilters(false)} />
                  <div className="absolute left-0 top-full mt-1.5 z-20 rounded-xl overflow-hidden min-w-[150px]"
                    style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                    {(Object.entries(TAG_CONFIG) as Array<[keyof typeof TAG_CONFIG, typeof TAG_CONFIG[keyof typeof TAG_CONFIG]]>).map(([tag, cfg]) => {
                      const count = tagCounts[tag]
                      return (
                        <button
                          key={tag}
                          onClick={() => { setFilterTag(filterTag === tag ? null : tag); setShowTagFilters(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium transition-colors"
                          style={{
                            color: filterTag === tag ? '#111110' : '#7A7670',
                            background: filterTag === tag ? `${cfg.bg}15` : 'transparent',
                          }}
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.bg }} />
                          <span className="flex-1 text-left">{cfg.label}</span>
                          <span className="text-[11px]" style={{ color: '#B0ACA6' }}>{count}</span>
                          {filterTag === tag && <span style={{ color: cfg.bg }} className="text-[10px]">✓</span>}
                        </button>
                      )
                    })}
                    {filterTag && filterTag !== 'favorite' && (
                      <button
                        onClick={() => { setFilterTag(null); setShowTagFilters(false) }}
                        className="w-full px-3 py-2 text-[11px] transition-colors border-t text-left"
                        style={{ color: '#B0ACA6', borderColor: '#E8E4DC' }}
                      >
                        Filter entfernen
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {filterTag && filterTag !== 'favorite' && (
            <button onClick={() => setFilterTag(null)} className="text-[11px] transition-colors px-2" style={{ color: tbText }}>
              × Alle
            </button>
          )}
        </div>

        {/* Right: layout + controls + actions */}
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.04)', border: `1px solid ${tbBorder}` }}>
            {LAYOUT_OPTIONS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setLayoutPersist(key)}
                title={label}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: layout === key ? '#FFFFFF' : 'transparent',
                  color: layout === key ? '#111110' : tbText,
                  boxShadow: layout === key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.04)', border: `1px solid ${tbBorder}` }}>
            {([
              { key: 'manual', label: 'Manual' },
              { key: 'name-asc', label: 'A→Z' },
              { key: 'name-desc', label: 'Z→A' },
            ] as { key: SortOrder; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortOrder(key)}
                title={key === 'manual' ? 'Manuelle Reihenfolge' : key === 'name-asc' ? 'Name A→Z' : 'Name Z→A'}
                className="px-2 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all"
                style={{
                  background: sortOrder === key ? '#FFFFFF' : 'transparent',
                  color: sortOrder === key ? '#111110' : tbText,
                  boxShadow: sortOrder === key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Image size controls */}
          <div className="relative">
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: showControls ? '#C4A47C15' : 'transparent',
                color: showControls ? '#C4A47C' : tbText,
                border: `1px solid ${showControls ? '#C4A47C30' : tbBorder}`,
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {showControls && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowControls(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 rounded-2xl p-4 min-w-[200px]"
                  style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#B0ACA6' }}>Image size</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px]" style={{ color: '#B0ACA6' }}>S</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={imageSize}
                      onChange={(e) => setSizePersist(Number(e.target.value))}
                      className="flex-1 accent-[#C4A47C]"
                    />
                    <span className="text-[10px]" style={{ color: '#B0ACA6' }}>XL</span>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mt-4 mb-3" style={{ color: '#B0ACA6' }}>Layout</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LAYOUT_OPTIONS.map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setLayoutPersist(key)}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all text-[11px] font-medium"
                        style={{
                          background: layout === key ? '#F8F7F4' : 'transparent',
                          color: layout === key ? '#111110' : '#B0ACA6',
                          border: `1px solid ${layout === key ? '#E8E4DC' : 'transparent'}`,
                        }}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Presentation */}
          <button
            onClick={startPresent}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: 'transparent', color: tbText, border: `1px solid ${tbBorder}` }}
            onMouseEnter={e => { e.currentTarget.style.color = tbTextHover; e.currentTarget.style.borderColor = '#C4A47C50' }}
            onMouseLeave={e => { e.currentTarget.style.color = tbText; e.currentTarget.style.borderColor = tbBorder }}
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Slideshow</span>
          </button>

          {/* Download all */}
          {downloadEnabled && photos.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={downloadPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-60 transition-all"
              style={{ background: '#111110', boxShadow: '0 1px 8px rgba(0,0,0,0.18)' }}
            >
              {downloadPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>...</span></>
                : <><Download className="w-4 h-4" /><span>Alle ({photos.length})</span></>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Gallery Grid ── */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">Keine Fotos in dieser Auswahl.</p>
          <button onClick={() => setFilterTag(null)} className="mt-2 text-[12px] text-white/40 hover:text-white/70 transition-colors">Reset filter</button>
        </div>
      ) : layout === 'masonry' ? (
        /* MASONRY */
        <div className={cn(masonryCols, 'gap-1.5 space-y-1.5')}>
          {visiblePhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} className="break-inside-avoid" />
          ))}
        </div>
      ) : layout === 'grid' ? (
        /* GRID — uniform squares */
        <div className={cn('grid gap-1.5', gridCols)}>
          {visiblePhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} className="aspect-square" />
          ))}
        </div>
      ) : (
        /* COLUMNS — 2 columns, landscape-ish */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {visiblePhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} className={cn('w-full', columnHeight)} />
          ))}
        </div>
      )}

      {/* ── Load More ── */}
      {visibleCount < filteredPhotos.length && (
        <div className="flex flex-col items-center gap-2 mt-8 mb-4">
          <button
            onClick={() => {
              setVisibleCount(prev => Math.min(prev + 50, filteredPhotos.length))
              window.scrollBy({ top: 300, behavior: 'smooth' })
            }}
            className="px-8 py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#111110', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
          >
            Mehr laden ({filteredPhotos.length - visibleCount} weitere)
          </button>
          <span className="text-[11px]" style={{ color: '#B0ACA6' }}>
            {visibleCount} von {filteredPhotos.length} Fotos
          </span>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => { if (justSwiped.current) { justSwiped.current = false; return } closeLightbox() }}
          onMouseMove={resetHideTimer}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; resetHideTimer() }}
          onTouchEnd={e => {
            const delta = e.changedTouches[0].clientX - touchStartX.current
            if (Math.abs(delta) > 50) {
              justSwiped.current = true
              if (delta > 0) prevPhoto(); else nextPhoto()
            }
          }}
        >
          {/* Top bar — auto-hides */}
          <div
            className={cn('absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent z-10 transition-opacity duration-300', hideControls ? 'opacity-0 pointer-events-none' : 'opacity-100')}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white/40 text-sm">{lightboxIndex + 1} <span className="text-white/20">/ {filteredPhotos.length}</span></span>
            <div className="flex items-center gap-2">
              {downloadEnabled && (
                <button onClick={() => downloadPhoto(currentPhoto)} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-all">
                  <Download className="w-4 h-4" /> Download
                </button>
              )}
              <button onClick={closeLightbox} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Left arrow — desktop only, auto-hides */}
          {!isMobile && (
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto() }}
              className={cn('absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all', hideControls ? 'opacity-0 pointer-events-none' : 'opacity-100')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {/* Image — fills full viewport, no padding */}
          <div className="absolute inset-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {!lightboxLoaded && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>}
            <img
              key={currentPhoto.id}
              src={getLightboxUrl(currentPhoto)}
              alt={currentPhoto.filename}
              className={cn('object-contain transition-opacity duration-300', lightboxLoaded ? 'opacity-100' : 'opacity-0')}
              style={{ maxWidth: '100vw', maxHeight: '100vh', width: 'auto', height: 'auto' }}
              onLoad={() => setLightboxLoaded(true)}
              loading="eager"
            />
          </div>
          {/* Right arrow — desktop only, auto-hides */}
          {!isMobile && (
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto() }}
              className={cn('absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all', hideControls ? 'opacity-0 pointer-events-none' : 'opacity-100')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          {/* Bottom bar — auto-hides */}
          <div
            className={cn('absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 pb-6 pt-12 bg-gradient-to-t from-black/70 to-transparent z-10 transition-opacity duration-300', hideControls ? 'opacity-0 pointer-events-none' : 'opacity-100')}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => toggleFavorite(currentPhoto.id)} className={cn('flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all', currentPhoto.is_favorite ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white')}>
              <Heart className={cn('w-4 h-4', currentPhoto.is_favorite && 'fill-white')} />
              {currentPhoto.is_favorite ? 'Favorit ✓' : 'Favorit'}
            </button>
            {/* Tag buttons — color only, no text */}
            {tagsEnabled && (
              <div className="flex items-center gap-2">
                {(Object.entries(TAG_CONFIG) as Array<[keyof typeof TAG_CONFIG, typeof TAG_CONFIG[keyof typeof TAG_CONFIG]]>).map(([tag, cfg]) => (
                  <button
                    key={tag}
                    onClick={() => setTag(currentPhoto.id, tag)}
                    title={cfg.label}
                    className="transition-all"
                    style={{
                      width: currentPhoto.tag === tag ? '36px' : '28px',
                      height: currentPhoto.tag === tag ? '36px' : '28px',
                      borderRadius: '50%',
                      background: cfg.bg,
                      border: currentPhoto.tag === tag ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                      boxShadow: currentPhoto.tag === tag ? `0 0 0 2px ${cfg.bg}` : 'none',
                      opacity: currentPhoto.tag && currentPhoto.tag !== tag ? 0.4 : 1,
                    }}
                  />
                ))}
                {currentPhoto.tag && (
                  <button
                    onClick={() => setTag(currentPhoto.id, currentPhoto.tag ?? null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                    title="Tag entfernen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <PhotoComments
              photoId={currentPhoto.id}
              projectId={projectId}
              token={token}
              clientName={clientName}
              commentsEnabled={commentsEnabled}
            />
          </div>
        </div>
      )}

      {/* ── SLIDESHOW MODE ── */}
      {presentMode && photos.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            {!presentLoaded && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white/20 animate-spin" /></div>}
            <img
              key={photos[presentIndex].id}
              src={getLightboxUrl(photos[presentIndex])}
              alt={photos[presentIndex].filename}
              className={cn('max-w-full max-h-full object-contain transition-opacity duration-700', presentLoaded ? 'opacity-100' : 'opacity-0')}
              onLoad={() => setPresentLoaded(true)}
            />
          </div>
          {presentPlaying && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <div key={`${presentIndex}-${presentPlaying}`} className="h-full bg-white/60 rounded-full" style={{ animation: `slideProgress ${SLIDE_DURATION}ms linear forwards` }} />
            </div>
          )}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm font-medium">{galleryTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-sm font-mono">{presentIndex + 1} / {photos.length}</span>
              <button onClick={exitPresent} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all ml-2"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <button onClick={presentPrev} className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/8 hover:bg-white/18 flex items-center justify-center text-white transition-all"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={presentNext} className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/8 hover:bg-white/18 flex items-center justify-center text-white transition-all"><ChevronRight className="w-6 h-6" /></button>
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
            <button onClick={() => setPresentPlaying((p) => !p)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all">
              {presentPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {presentPlaying ? 'Pause' : 'Abspielen'}
            </button>
            <div className="hidden md:flex items-center gap-1 max-w-xs overflow-hidden">
              {photos.slice(Math.max(0, presentIndex - 2), presentIndex + 3).map((p, i) => {
                const realIndex = Math.max(0, presentIndex - 2) + i
                return (
                  <button key={p.id} onClick={() => { setPresentLoaded(false); setPresentIndex(realIndex) }} className={cn('flex-shrink-0 rounded overflow-hidden transition-all', realIndex === presentIndex ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70')} style={{ width: 40, height: 28 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getThumbnailUrl(p, 120)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </>
  )
}
