'use client'

/**
 * PhotoUploader — hands files to UploadContext after pre-checks.
 *
 * Upload flow:
 *   1. Storage-limit check (client-side)
 *   2. Duplicate-filename check (Supabase)
 *   3. Duplicate resolution modal (interactive)
 *   4. enqueueFiles() → UploadContext runs the actual fetch loop
 *      The context persists across navigation so uploads continue even when
 *      the user leaves this page.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, AlertCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useUpload } from '@/contexts/UploadContext'
import type { UploadedPhoto } from '@/contexts/UploadContext'

interface LocalFile {
  id: string          // local UI id
  filename: string
  previewUrl: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  galleryId: string
  photographerId: string
  sectionId?: string | null
  galleryTitle?: string
  onUploadComplete: (photos: UploadedPhoto[]) => void
  onStorageLimitReached?: () => void
  canUploadFile?: (fileSizeBytes: number) => boolean
  maxStorageBytes?: number | null
  storageUsedBytes?: number
}

export default function PhotoUploader({
  galleryId,
  photographerId,
  sectionId,
  galleryTitle = 'Galerie',
  onUploadComplete,
  onStorageLimitReached,
  canUploadFile,
  maxStorageBytes,
  storageUsedBytes = 0,
}: Props) {
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const { enqueueFiles } = useUpload()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      localFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentDuplicate, setCurrentDuplicate] = useState<{
    file: File
    existingId: string
    existingUrl: string
  } | null>(null)

  const uploadFiles = useCallback(async (imageFiles: File[]) => {
    if (imageFiles.length === 0) return

    // ── 1. Storage limit check ───────────────────────────────────────────────
    const allowed: File[] = []
    const rejected: File[] = []
    let runningUsed = storageUsedBytes
    for (const file of imageFiles) {
      if (canUploadFile) {
        const fits = maxStorageBytes == null
          ? true
          : (runningUsed + file.size) <= maxStorageBytes
        if (fits) { allowed.push(file); runningUsed += file.size }
        else rejected.push(file)
      } else {
        allowed.push(file)
      }
    }
    if (rejected.length > 0) {
      toast.error(`${rejected.length} ${rejected.length === 1 ? 'Datei' : 'Dateien'} übersprungen — Speicherlimit erreicht.`, { duration: 5000 })
      if (onStorageLimitReached) onStorageLimitReached()
    }
    if (allowed.length === 0) return

    // ── 2. Duplicate filename check ──────────────────────────────────────────
    const supabase = createClient()
    const filenames = allowed.map(f => f.name)
    const { data: existingPhotos } = await supabase
      .from('photos').select('id, filename, storage_url')
      .eq('gallery_id', galleryId).in('filename', filenames)

    const existingMap = new Map((existingPhotos || []).map(p => [p.filename, p]))
    const duplicates = allowed.filter(f => existingMap.has(f.name))
    const nonDuplicates = allowed.filter(f => !existingMap.has(f.name))

    // ── 3. Duplicate resolution (interactive, blocks until user decides) ─────
    const replaceMap = new Map<string, { id: string; storage_url: string }>()
    const filesToUpload: File[] = [...nonDuplicates]

    for (const dupFile of duplicates) {
      const existing = existingMap.get(dupFile.name)!
      const decision = await new Promise<'keep' | 'replace' | 'cancel'>((resolve) => {
        setCurrentDuplicate({ file: dupFile, existingId: existing.id, existingUrl: existing.storage_url })
        ;(window as unknown as Record<string, unknown>).__duplicateResolve = resolve
      })
      setCurrentDuplicate(null)
      if (decision === 'cancel') continue
      filesToUpload.push(dupFile)
      if (decision === 'replace') {
        replaceMap.set(dupFile.name, { id: existing.id, storage_url: existing.storage_url })
      }
    }
    if (filesToUpload.length === 0) return

    // ── 4. Get current photo count for display_order ─────────────────────────
    const { count } = await supabase
      .from('photos').select('*', { count: 'exact', head: true }).eq('gallery_id', galleryId)
    const initialOrder = count || 0

    // ── 5. Add local preview thumbnails ─────────────────────────────────────
    const newLocalFiles: LocalFile[] = filesToUpload.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      filename: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }))
    if (mountedRef.current) setLocalFiles(prev => [...prev, ...newLocalFiles])

    const uploadedPhotos: UploadedPhoto[] = []

    // ── 6. Hand off to context (persists across navigation) ──────────────────
    enqueueFiles(filesToUpload, {
      galleryId,
      photographerId,
      sectionId,
      galleryTitle,
      initialOrder,
      replaceMap,

      onFileDone: (filename, photo) => {
        uploadedPhotos.push(photo)
        if (mountedRef.current) {
          setLocalFiles(prev => prev.map(f =>
            f.filename === filename ? { ...f, status: 'done' } : f
          ))
        }
      },

      onFileError: (filename, error) => {
        console.error('[upload] error:', filename, error)
        if (mountedRef.current) {
          setLocalFiles(prev => prev.map(f =>
            f.filename === filename ? { ...f, status: 'error', error } : f
          ))
        }
      },

      onAllDone: (photos) => {
        if (photos.length > 0) {
          try { onUploadComplete(photos) } catch {}
          if (mountedRef.current) {
            toast.success(`${photos.length} ${photos.length === 1 ? 'Foto' : 'Fotos'} hochgeladen`)
          }
        }
      },
    })
  }, [galleryId, galleryTitle, sectionId, enqueueFiles, onUploadComplete, canUploadFile, maxStorageBytes, storageUsedBytes, onStorageLimitReached, photographerId])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) { toast.error('Nur Bilddateien erlaubt (JPG, PNG, WEBP)'); return }
    uploadFiles(imageFiles)
  }, [uploadFiles])

  const resolveDuplicate = (decision: 'keep' | 'replace' | 'cancel') => {
    const resolve = (window as unknown as Record<string, unknown>).__duplicateResolve as ((d: 'keep' | 'replace' | 'cancel') => void) | undefined
    if (resolve) resolve(decision)
    delete (window as unknown as Record<string, unknown>).__duplicateResolve
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files)
  }, [addFiles])

  const removeLocalFile = (id: string) => {
    setLocalFiles(prev => {
      const f = prev.find(f => f.id === id)
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl)
      return prev.filter(f => f.id !== id)
    })
  }

  const maxBytes = maxStorageBytes ?? null
  const storagePercent = maxBytes && maxBytes > 0
    ? Math.min(100, Math.round((storageUsedBytes / maxBytes) * 100)) : null
  const storageNearLimit = storagePercent !== null && storagePercent >= 80
  const storageFull = storagePercent !== null && storagePercent >= 100

  const isUploading = localFiles.some(f => f.status === 'pending' || f.status === 'uploading')
  const doneCount = localFiles.filter(f => f.status === 'done').length

  return (
    <div className="space-y-4">
      {/* ── Duplicate file modal ── */}
      {currentDuplicate && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-3">
              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-[16px] font-bold text-[#111110] mb-1" style={{ letterSpacing: '-0.02em' }}>Datei existiert bereits</h3>
              <p className="text-[13px] text-[#7A7670] mb-1">
                <span className="font-semibold text-[#111110]">{currentDuplicate.file.name}</span> ist bereits in dieser Galerie vorhanden.
              </p>
              <p className="text-[12px] text-[#B0ACA6]">Was möchtest du tun?</p>
            </div>
            <div className="flex flex-col gap-2 px-6 py-4">
              <button onClick={() => resolveDuplicate('keep')} className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#111110' }}>Beide behalten</button>
              <button onClick={() => resolveDuplicate('replace')} className="w-full py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>Ersetzen (alte löschen)</button>
              <button onClick={() => resolveDuplicate('cancel')} className="w-full py-2.5 rounded-xl text-[13px] font-medium" style={{ background: '#F5F4F1', color: '#7A7670' }}>Überspringen</button>
            </div>
          </div>
        </div>
      )}

      {/* Storage usage bar */}
      {maxBytes != null && maxBytes > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={cn('font-medium', storageNearLimit ? 'text-[#E84C1A]' : 'text-[#6B6B6B]')}>
              Speicher: {formatFileSize(storageUsedBytes)} / {formatFileSize(maxBytes)}
            </span>
            <span className={cn('font-medium', storageNearLimit ? 'text-[#E84C1A]' : 'text-[#6B6B6B]')}>{storagePercent}%</span>
          </div>
          <div className="h-1.5 bg-[#E8E8E4] rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-300', storageNearLimit ? 'bg-[#E84C1A]' : 'bg-[#C8A882]')} style={{ width: `${storagePercent}%` }} />
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !storageFull && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all',
          storageFull ? 'border-[#E84C1A]/40 bg-[#E84C1A]/5 cursor-not-allowed opacity-60'
            : isDragging ? 'border-[#C8A882] bg-[#C8A882]/5 cursor-pointer'
            : 'border-[#E8E8E4] dark:border-[#333] hover:border-[#C8A882]/50 cursor-pointer'
        )}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" disabled={storageFull}
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
        <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragging ? 'text-[#C8A882]' : storageFull ? 'text-[#E84C1A]' : 'text-[#6B6B6B]')} />
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">
          {storageFull ? 'Speicherlimit erreicht' : isDragging ? 'Fotos hier ablegen' : 'Fotos hierher ziehen oder klicken'}
        </p>
        <p className="text-xs text-[#6B6B6B]">
          {storageFull ? 'Upgrade erforderlich, um weitere Fotos hochzuladen' : 'JPG, PNG, WEBP · Originalqualität · Upload startet automatisch'}
        </p>
      </div>

      {/* Local preview thumbnails */}
      {localFiles.length > 0 && (
        <div className="space-y-3">
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                <span>Wird hochgeladen... ({doneCount}/{localFiles.length})</span>
              </div>
              <div className="h-1.5 bg-[#E8E8E4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8A882] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round((doneCount / localFiles.length) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {localFiles.map(f => (
              <div key={f.id} className="relative aspect-square overflow-hidden rounded-lg group">
                <img
                  src={f.previewUrl}
                  alt={f.filename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Pending / uploading overlay */}
                {(f.status === 'pending' || f.status === 'uploading') && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </div>
                )}

                {/* Done */}
                {f.status === 'done' && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                {/* Error */}
                {f.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Remove (only when not in-flight) */}
                {(f.status === 'done' || f.status === 'error') && (
                  <button
                    onClick={e => { e.stopPropagation(); removeLocalFile(f.id) }}
                    className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
