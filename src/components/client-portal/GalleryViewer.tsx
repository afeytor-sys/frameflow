'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Download, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
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
  initialPhotos: Photo[]
  downloadEnabled: boolean
  showWatermark: boolean
  token: string
}

export default function GalleryViewer({ galleryId, initialPhotos, downloadEnabled, showWatermark, token }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const supabase = createClient()

  const favoriteCount = photos.filter((p) => p.is_favorite).length

  const toggleFavorite = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return

    const newValue = !photo.is_favorite
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, is_favorite: newValue } : p))

    const { error } = await supabase
      .from('photos')
      .update({ is_favorite: newValue })
      .eq('id', photoId)

    if (error) {
      // Revert on error
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

      // Increment download count (best-effort)
      try { await supabase.rpc('increment_download_count', { gallery_id: galleryId }) } catch {}
    } catch {
      toast.error('Download fehlgeschlagen')
    }
  }

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)

  const prevPhoto = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null))
  }, [photos.length])

  const nextPhoto = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null))
  }, [photos.length])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevPhoto()
    if (e.key === 'ArrowRight') nextPhoto()
    if (e.key === 'Escape') closeLightbox()
  }, [prevPhoto, nextPhoto])

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <>
      {/* Favorite count */}
      {favoriteCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
          <Heart className="w-4 h-4 text-[#E84C1A] fill-[#E84C1A]" />
          <span>{favoriteCount} {favoriteCount === 1 ? 'Favorit' : 'Favoriten'}</span>
        </div>
      )}

      {/* Masonry grid */}
      <div className="columns-2 sm:columns-3 gap-2 space-y-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative break-inside-avoid group cursor-pointer">
            <img
              src={photo.thumbnail_url || photo.storage_url}
              alt={photo.filename}
              className="w-full rounded-lg object-cover"
              loading="lazy"
              onClick={() => openLightbox(index)}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg" />

            {/* Watermark */}
            {showWatermark && (
              <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-medium pointer-events-none select-none">
                Delivered via FrameFlow
              </div>
            )}

            {/* Actions overlay */}
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
              {/* Favorite */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id) }}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm',
                  photo.is_favorite
                    ? 'bg-[#E84C1A] text-white'
                    : 'bg-white/90 text-[#6B6B6B] hover:text-[#E84C1A]'
                )}
              >
                <Heart className={cn('w-3.5 h-3.5', photo.is_favorite && 'fill-white')} />
              </button>

              {/* Download */}
              {downloadEnabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); downloadPhoto(photo) }}
                  className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-[#6B6B6B] hover:text-[#1A1A1A] transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Zoom */}
              <button
                onClick={(e) => { e.stopPropagation(); openLightbox(index) }}
                className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-[#6B6B6B] hover:text-[#1A1A1A] transition-all shadow-sm"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Favorite indicator (always visible) */}
            {photo.is_favorite && (
              <div className="absolute top-2 left-2">
                <Heart className="w-4 h-4 text-[#E84C1A] fill-[#E84C1A] drop-shadow-sm" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Download all button */}
      {downloadEnabled && photos.length > 0 && (
        <div className="text-center pt-4">
          <a
            href={`/api/galleries/${galleryId}/download`}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#E8E8E4] text-sm font-medium text-[#1A1A1A] rounded-lg hover:bg-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Alle Fotos herunterladen
          </a>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto() }}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Image */}
          <img
            src={currentPhoto.storage_url}
            alt={currentPhoto.filename}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto() }}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom actions */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleFavorite(currentPhoto.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                currentPhoto.is_favorite
                  ? 'bg-[#E84C1A] text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <Heart className={cn('w-4 h-4', currentPhoto.is_favorite && 'fill-white')} />
              {currentPhoto.is_favorite ? 'Favorit' : 'Als Favorit markieren'}
            </button>

            {downloadEnabled && (
              <button
                onClick={() => downloadPhoto(currentPhoto)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all"
              >
                <Download className="w-4 h-4" />
                Herunterladen
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
