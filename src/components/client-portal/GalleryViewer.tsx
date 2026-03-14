'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Heart, Download, X, ChevronLeft, ChevronRight,
  ZoomIn, Loader2, Play, Pause, Maximize2,
  LayoutGrid, Columns2, AlignJustify, SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import PhotoComments from './PhotoComments'
import type { GalleryTheme } from '@/lib/galleryThemes'

type PhotoTag = 'green' | 'yellow' | 'red' | null
type GalleryLayout = 'masonry' | 'grid' | 'columns'

interface Photo {
  id: string
  storage_url: string
  thumbnail_url: string | null
  filename: string
  is_favorite: boolean
  display_order: number
  tag?: PhotoTag
}

interface Props {
  galleryId: string
  projectId: string
  galleryTitle: string
  clientName: string
  initialPhotos: Photo[]
  downloadEnabled: boolean
  commentsEnabled: boolean
  showWatermark: boolean
  token: string
  theme?: GalleryTheme
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

export default function GalleryViewer({
  galleryId,
  projectId,
  galleryTitle,
  clientName,
  initialPhotos,
  downloadEnabled,
  commentsEnabled,
  token,
  theme,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxLoaded, setLightboxLoaded] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [filterTag, setFilterTag] = useState<PhotoTag | 'favorite' | null>(null)
  const [showTagMenu, setShowTagMenu] = useState<string | null>(null)

  // Layout & size controls
  const [layout, setLayout] = useState<GalleryLayout>('masonry')
  const [imageSize, setImageSize] = useState(3) // 1–5 scale
  const [showControls, setShowControls] = useState(false)

  // Presentation mode
  const [presentMode, setPresentMode] = useState(false)
  const [presentIndex, setPresentIndex] = useState(0)
  const [presentPlaying, setPresentPlaying] = useState(true)
  const [presentLoaded, setPresentLoaded] = useState(false)
  const presentTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const SLIDE_DURATION = 4000

  const supabase = createClient()

  const favoriteCount = photos.filter((p) => p.is_favorite).length
  const tagCounts = {
    green:  photos.filter((p) => p.tag === 'green').length,
    yellow: photos.filter((p) => p.tag === 'yellow').length,
    red:    photos.filter((p) => p.tag === 'red').length,
  }

  const filteredPhotos = filterTag === 'favorite'
    ? photos.filter((p) => p.is_favorite)
    : filterTag
    ? photos.filter((p) => p.tag === filterTag)
    : photos

  const currentPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null

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

  // Grid columns based on imageSize (1=2col, 5=6col)
  const gridCols = {
    1: 'grid-cols-2',
    2: 'grid-cols-3',
    3: 'grid-cols-4',
    4: 'grid-cols-5',
    5: 'grid-cols-6',
  }[imageSize] || 'grid-cols-4'

  // Masonry columns based on imageSize
  const masonryCols = {
    1: 'columns-2',
    2: 'columns-2 sm:columns-3',
    3: 'columns-2 sm:columns-3 lg:columns-4',
    4: 'columns-3 sm:columns-4 lg:columns-5',
    5: 'columns-3 sm:columns-5 lg:columns-6',
  }[imageSize] || 'columns-2 sm:columns-3 lg:columns-4'

  // Columns layout (2 fixed columns, size affects height)
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
    const locked = lightboxIndex !== null || presentMode
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxIndex, presentMode])

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

  // ── Toggle favorite ──────────────────────────────────────────────
  const toggleFavorite = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return
    const newValue = !photo.is_favorite
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_favorite: newValue } : p))
    const { error } = await supabase.from('photos').update({ is_favorite: newValue }).eq('id', photoId)
    if (error) {
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_favorite: !newValue } : p))
      toast.error('Fehler beim Speichern')
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
      toast.error('Fehler beim Speichern')
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
      try { await supabase.rpc('increment_download_count', { gallery_id: galleryId }) } catch {}
    } catch { toast.error('Download fehlgeschlagen') }
  }

  const downloadAll = async () => {
    if (downloadingAll || photos.length === 0) return
    setDownloadingAll(true); setDownloadProgress(0)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const total = photos.length; let done = 0
      for (let i = 0; i < photos.length; i += 5) {
        const batch = photos.slice(i, i + 5)
        await Promise.all(batch.map(async (photo) => {
          try { const r = await fetch(photo.storage_url); zip.file(photo.filename, await r.blob()) } catch {}
          done++; setDownloadProgress(Math.round((done / total) * 100))
        }))
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url; a.download = `${galleryTitle || clientName || 'Galerie'}.zip`; a.click()
      URL.revokeObjectURL(url)
      try { await supabase.rpc('increment_download_count', { gallery_id: galleryId }) } catch {}
      toast.success(`${total} Fotos heruntergeladen!`)
    } catch { toast.error('Download fehlgeschlagen') }
    finally { setDownloadingAll(false); setDownloadProgress(0) }
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
      className={cn('relative group cursor-pointer overflow-hidden rounded-sm', className)}
      onClick={() => openLightbox(index)}
    >
      <img
        src={photo.thumbnail_url || photo.storage_url}
        alt={photo.filename}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-300" />
      {/* Zoom */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <ZoomIn className="w-4 h-4 text-white" />
        </div>
      </div>
      {/* Top-right actions */}
      <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggleFavorite(photo.id)}
          className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg', photo.is_favorite ? 'bg-rose-500 text-white' : 'bg-black/50 backdrop-blur-sm text-white/80 hover:text-rose-400')}
        >
          <Heart className={cn('w-3.5 h-3.5', photo.is_favorite && 'fill-white')} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowTagMenu(showTagMenu === photo.id ? null : photo.id) }}
            className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg', photo.tag ? 'opacity-100' : 'bg-black/50 backdrop-blur-sm text-white/80 hover:text-white')}
            style={photo.tag ? { background: TAG_CONFIG[photo.tag].bg } : {}}
          >
            <span className="text-[10px] font-bold text-white">●</span>
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
        {downloadEnabled && (
          <button onClick={() => downloadPhoto(photo)} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all shadow-lg">
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Indicators */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {photo.is_favorite && <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 drop-shadow-lg" />}
        {photo.tag && <span className="w-3 h-3 rounded-full border border-black/20 drop-shadow-lg" style={{ background: TAG_CONFIG[photo.tag].bg }} />}
      </div>
    </div>
  )

  // Theme-aware colors for toolbar
  const isDark = theme ? (theme.bg < '#888888') : true
  const tbBg = theme ? `${theme.surface}CC` : 'rgba(255,255,255,0.08)'
  const tbText = theme ? theme.textMuted : 'rgba(255,255,255,0.5)'
  const tbTextHover = theme ? theme.text : '#ffffff'
  const tbActiveBg = theme ? theme.accent : '#EF4444'
  const tbBorder = theme ? theme.border : 'rgba(255,255,255,0.1)'
  const tbDownloadBg = theme ? theme.text : '#ffffff'
  const tbDownloadText = theme ? theme.bg : '#0C0C0B'

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Left: filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterTag(filterTag === 'favorite' ? null : 'favorite')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={{
              background: filterTag === 'favorite' ? '#EF4444' : tbBg,
              color: filterTag === 'favorite' ? '#fff' : tbText,
              border: `1px solid ${tbBorder}`,
            }}
          >
            <Heart className={cn('w-3 h-3', filterTag === 'favorite' && 'fill-white')} />
            {favoriteCount > 0 ? `${favoriteCount} Favoriten` : 'Favoriten'}
          </button>
          {(Object.keys(TAG_CONFIG) as Array<keyof typeof TAG_CONFIG>).map((tag) => {
            const cfg = TAG_CONFIG[tag]; const count = tagCounts[tag]
            if (count === 0 && filterTag !== tag) return null
            return (
              <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background: filterTag === tag ? cfg.bg : tbBg,
                  color: filterTag === tag ? '#fff' : tbText,
                  border: `1px solid ${tbBorder}`,
                }}>
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.bg }} />
                {cfg.label} {count > 0 && `(${count})`}
              </button>
            )
          })}
          {filterTag && (
            <button onClick={() => setFilterTag(null)} className="text-[11px] transition-colors px-2" style={{ color: tbText }}>
              × Alle anzeigen
            </button>
          )}
        </div>

        {/* Right: layout + controls + actions */}
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: tbBg, border: `1px solid ${tbBorder}` }}>
            {LAYOUT_OPTIONS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setLayoutPersist(key)}
                title={label}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: layout === key ? (theme ? theme.accent + '33' : 'rgba(255,255,255,0.2)') : 'transparent',
                  color: layout === key ? tbTextHover : tbText,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Image size controls */}
          <div className="relative">
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: showControls ? (theme ? theme.accent + '22' : 'rgba(255,255,255,0.2)') : tbBg,
                color: showControls ? tbTextHover : tbText,
                border: `1px solid ${tbBorder}`,
              }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            {showControls && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowControls(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 rounded-2xl p-4 min-w-[200px]" style={{ background: '#1A1A18', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3">Bildgröße</p>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-[10px]">S</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={imageSize}
                      onChange={(e) => setSizePersist(Number(e.target.value))}
                      className="flex-1 accent-[#C4A47C]"
                    />
                    <span className="text-white/30 text-[10px]">XL</span>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mt-4 mb-3">Layout</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LAYOUT_OPTIONS.map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setLayoutPersist(key)}
                        className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all text-[11px] font-medium', layout === key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/8')}
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
          <button onClick={startPresent} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 text-white/60 hover:text-white hover:bg-white/14 text-[12px] font-semibold transition-all">
            <Maximize2 className="w-3.5 h-3.5" />
            Präsentation
          </button>

          {/* Download all */}
          {downloadEnabled && photos.length > 0 && (
            <button onClick={downloadAll} disabled={downloadingAll} className="flex items-center gap-2 px-4 py-2 bg-white text-[#0C0C0B] text-[12px] font-semibold rounded-full hover:bg-white/90 disabled:opacity-60 transition-all">
              {downloadingAll ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{downloadProgress > 0 ? `${downloadProgress}%` : '...'}</> : <><Download className="w-3.5 h-3.5" />Alle ({photos.length})</>}
            </button>
          )}
        </div>
      </div>

      {/* Download progress */}
      {downloadingAll && downloadProgress > 0 && (
        <div className="w-full bg-white/10 rounded-full h-0.5 overflow-hidden mb-5">
          <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
        </div>
      )}

      {/* ── Gallery Grid ── */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">Keine Fotos in dieser Auswahl.</p>
          <button onClick={() => setFilterTag(null)} className="mt-2 text-[12px] text-white/40 hover:text-white/70 transition-colors">Filter zurücksetzen</button>
        </div>
      ) : layout === 'masonry' ? (
        /* MASONRY */
        <div className={cn(masonryCols, 'gap-1.5 space-y-1.5')}>
          {filteredPhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} className="break-inside-avoid" />
          ))}
        </div>
      ) : layout === 'grid' ? (
        /* GRID — uniform squares */
        <div className={cn('grid gap-1.5', gridCols)}>
          {filteredPhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} className="aspect-square" />
          ))}
        </div>
      ) : (
        /* COLUMNS — 2 columns, landscape-ish */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {filteredPhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} className={cn('w-full', columnHeight)} />
          ))}
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxIndex !== null && currentPhoto && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={closeLightbox}>
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent z-10" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/40 text-sm">{lightboxIndex + 1} <span className="text-white/20">/ {filteredPhotos.length}</span></span>
            <div className="flex items-center gap-2">
              {downloadEnabled && (
                <button onClick={() => downloadPhoto(currentPhoto)} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-all">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
              <button onClick={closeLightbox} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); prevPhoto() }} className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative flex items-center justify-center w-full h-full px-16 py-16" onClick={(e) => e.stopPropagation()}>
            {!lightboxLoaded && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>}
            <img key={currentPhoto.id} src={currentPhoto.storage_url} alt={currentPhoto.filename} className={cn('max-w-full max-h-full object-contain transition-opacity duration-300', lightboxLoaded ? 'opacity-100' : 'opacity-0')} onLoad={() => setLightboxLoaded(true)} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); nextPhoto() }} className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 pb-6 pt-12 bg-gradient-to-t from-black/70 to-transparent z-10" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => toggleFavorite(currentPhoto.id)} className={cn('flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all', currentPhoto.is_favorite ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white')}>
              <Heart className={cn('w-4 h-4', currentPhoto.is_favorite && 'fill-white')} />
              {currentPhoto.is_favorite ? 'Favorit ✓' : 'Favorit'}
            </button>
            {(Object.entries(TAG_CONFIG) as Array<[keyof typeof TAG_CONFIG, typeof TAG_CONFIG[keyof typeof TAG_CONFIG]]>).map(([tag, cfg]) => (
              <button key={tag} onClick={() => setTag(currentPhoto.id, tag)} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition-all" style={{ background: currentPhoto.tag === tag ? cfg.bg : 'rgba(255,255,255,0.08)', color: currentPhoto.tag === tag ? 'white' : 'rgba(255,255,255,0.5)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: currentPhoto.tag === tag ? 'white' : cfg.bg }} />
                {cfg.label}
              </button>
            ))}
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

      {/* ── PRÄSENTATIONSMODUS ── */}
      {presentMode && photos.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            {!presentLoaded && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white/20 animate-spin" /></div>}
            <img key={photos[presentIndex].id} src={photos[presentIndex].storage_url} alt={photos[presentIndex].filename} className={cn('max-w-full max-h-full object-contain transition-opacity duration-700', presentLoaded ? 'opacity-100' : 'opacity-0')} onLoad={() => setPresentLoaded(true)} />
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
                    <img src={p.thumbnail_url || p.storage_url} alt="" className="w-full h-full object-cover" />
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
