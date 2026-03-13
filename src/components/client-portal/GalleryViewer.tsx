'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Download, X, ChevronLeft, ChevronRight, ZoomIn, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Photo {
  id: string
  storage_url: string
  thumbnail_url: string | null
  filename: string
  is_favorite: boolean
  display_order: number
}

interface Props {
  galleryId: string
  galleryTitle: string
  clientName: string
  initialPhotos: Photo[]
  downloadEnabled: boolean
  showWatermark: boolean
  token: string
}

export default function GalleryViewer({
  galleryId,
  galleryTitle,
  clientName,
  initialPhotos,
  downloadEnabled,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxLoaded, setLightboxLoaded] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const supabase = createClient()

  const favoriteCount = photos.filter((p) => p.is_favorite).length
  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, photos.length])

  // Lock body scroll when lightbox open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxIndex])

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

  const downloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.storage_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = photo.filename
      a.click()
      URL.revokeObjectURL(url)
      try { await supabase.rpc('increment_download_count', { gallery_id: galleryId }) } catch {}
    } catch {
      toast.error('Download fehlgeschlagen')
    }
  }

  const downloadAll = async () => {
    if (downloadingAll || photos.length === 0) return
    setDownloadingAll(true)
    setDownloadProgress(0)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const total = photos.length
      let done = 0
      const batchSize = 5
      for (let i = 0; i < photos.length; i += batchSize) {
        const batch = photos.slice(i, i + batchSize)
        await Promise.all(batch.map(async (photo) => {
          try {
            const response = await fetch(photo.storage_url)
            const blob = await response.blob()
            zip.file(photo.filename, blob)
          } catch {}
          done++
          setDownloadProgress(Math.round((done / total) * 100))
        }))
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${galleryTitle || clientName || 'Galerie'}.zip`
      a.click()
      URL.revokeObjectURL(url)
      try { await supabase.rpc('increment_download_count', { gallery_id: galleryId }) } catch {}
      toast.success(`${total} Fotos heruntergeladen!`)
    } catch (err) {
      console.error(err)
      toast.error('Download fehlgeschlagen')
    } finally {
      setDownloadingAll(false)
      setDownloadProgress(0)
    }
  }

  const openLightbox = (index: number) => {
    setLightboxLoaded(false)
    setLightboxIndex(index)
  }
  const closeLightbox = () => setLightboxIndex(null)
  const prevPhoto = useCallback(() => {
    setLightboxLoaded(false)
    setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null))
  }, [photos.length])
  const nextPhoto = useCallback(() => {
    setLightboxLoaded(false)
    setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null))
  }, [photos.length])

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {favoriteCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>{favoriteCount} {favoriteCount === 1 ? 'Favorit' : 'Favoriten'}</span>
            </div>
          )}
        </div>

        {downloadEnabled && photos.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={downloadingAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0C0C0B] text-sm font-semibold rounded-full hover:bg-white/90 disabled:opacity-60 transition-all"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {downloadProgress > 0 ? `${downloadProgress}%` : 'Vorbereitung...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Alle herunterladen ({photos.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {downloadingAll && downloadProgress > 0 && (
        <div className="w-full bg-white/10 rounded-full h-0.5 overflow-hidden mb-6">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}

      {/* Masonry Grid */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-1.5 space-y-1.5">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative break-inside-avoid group cursor-pointer overflow-hidden rounded-sm"
            onClick={() => openLightbox(index)}
          >
            <img
              src={photo.thumbnail_url || photo.storage_url}
              alt={photo.filename}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />

            {/* Dark overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />

            {/* Zoom icon center */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Top right actions */}
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id) }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg',
                  photo.is_favorite
                    ? 'bg-rose-500 text-white'
                    : 'bg-black/40 backdrop-blur-sm text-white/80 hover:text-rose-400'
                )}
              >
                <Heart className={cn('w-3.5 h-3.5', photo.is_favorite && 'fill-white')} />
              </button>

              {downloadEnabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); downloadPhoto(photo) }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Favorite indicator */}
            {photo.is_favorite && (
              <div className="absolute top-2 left-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400 drop-shadow-lg" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── LIGHTBOX ─── */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white/50 text-sm font-light">
              {lightboxIndex + 1} <span className="text-white/25">/ {photos.length}</span>
            </div>

            <div className="flex items-center gap-2">
              {downloadEnabled && (
                <button
                  onClick={() => downloadPhoto(currentPhoto)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              )}
              <button
                onClick={closeLightbox}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prev button */}
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto() }}
            className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Image */}
          <div className="relative flex items-center justify-center w-full h-full px-16 py-16" onClick={(e) => e.stopPropagation()}>
            {!lightboxLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
              </div>
            )}
            <img
              key={currentPhoto.id}
              src={currentPhoto.storage_url}
              alt={currentPhoto.filename}
              className={cn(
                'max-w-full max-h-full object-contain transition-opacity duration-300',
                lightboxLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setLightboxLoaded(true)}
            />
          </div>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto() }}
            className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom bar */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-6 pt-12 bg-gradient-to-t from-black/60 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleFavorite(currentPhoto.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all',
                currentPhoto.is_favorite
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              )}
            >
              <Heart className={cn('w-4 h-4', currentPhoto.is_favorite && 'fill-white')} />
              {currentPhoto.is_favorite ? 'Favorit ✓' : 'Als Favorit markieren'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
