'use client'

/**
 * PhotoUploader — uploads photos to Cloudflare R2 via /api/photos/upload
 *
 * BEFORE (Supabase Storage):
 *   supabase.storage.from('photos').upload(fileName, file)
 *   → stored at vrfsirwrdlrkpaaysnyj.supabase.co/storage/v1/object/public/photos/...
 *
 * AFTER (Cloudflare R2):
 *   POST /api/photos/upload (FormData: file + galleryId)
 *   → stored at photos.fotonizer.com/galleries/<id>/...
 *
 * The Supabase database (photos table) is still used for metadata.
 * R2 credentials never reach the browser — the API route handles them server-side.
 */

import { useState, useCallback, useRef, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import toast from 'react-hot-toast'
import { UploadContext } from '@/contexts/UploadContext'

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  url?: string
}

interface Props {
  galleryId: string
  photographerId: string
  sectionId?: string | null
  galleryTitle?: string
  onUploadComplete: (photos: { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number }[]) => void
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
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadCtx = useContext(UploadContext)

  // ── Duplicate detection state ────────────────────────────────────────────
  const [duplicateQueue, setDuplicateQueue] = useState<{
    file: File
    existingId: string
    existingUrl: string
  }[]>([])
  const [currentDuplicate, setCurrentDuplicate] = useState<{
    file: File
    existingId: string
    existingUrl: string
  } | null>(null)
  const pendingAfterDuplicateRef = useRef<File[]>([])
  const resolvedFilesRef = useRef<{ file: File; replace: boolean | null }[]>([])

  const uploadFiles = useCallback(async (imageFiles: File[]) => {
    if (imageFiles.length === 0) return

    // ── Storage limit check ──────────────────────────────────────────────────
    const allowed: File[] = []
    const rejected: File[] = []

    let runningUsed = storageUsedBytes
    for (const file of imageFiles) {
      if (canUploadFile) {
        const fits = maxStorageBytes === null || maxStorageBytes === undefined
          ? true
          : (runningUsed + file.size) <= maxStorageBytes
        if (fits) {
          allowed.push(file)
          runningUsed += file.size
        } else {
          rejected.push(file)
        }
      } else {
        allowed.push(file)
      }
    }

    if (rejected.length > 0) {
      toast.error(
        `${rejected.length} ${rejected.length === 1 ? 'file' : 'files'} skipped — storage limit reached.`,
        { duration: 5000 }
      )
      if (onStorageLimitReached) onStorageLimitReached()
    }

    if (allowed.length === 0) return

    // ── Duplicate filename check ─────────────────────────────────────────────
    const supabaseCheck = createClient()
    const filenames = allowed.map(f => f.name)
    const { data: existingPhotos } = await supabaseCheck
      .from('photos')
      .select('id, filename, storage_url')
      .eq('gallery_id', galleryId)
      .in('filename', filenames)

    const existingMap = new Map((existingPhotos || []).map(p => [p.filename, p]))
    const duplicates = allowed.filter(f => existingMap.has(f.name))
    const nonDuplicates = allowed.filter(f => !existingMap.has(f.name))

    // Resolve duplicates one by one via modal
    const resolvedDuplicates: { file: File; replace: boolean }[] = []
    for (const dupFile of duplicates) {
      const existing = existingMap.get(dupFile.name)!
      const decision = await new Promise<'keep' | 'replace' | 'cancel'>((resolve) => {
        setCurrentDuplicate({ file: dupFile, existingId: existing.id, existingUrl: existing.storage_url })
        ;(window as unknown as Record<string, unknown>).__duplicateResolve = resolve
      })
      setCurrentDuplicate(null)
      if (decision === 'cancel') continue
      resolvedDuplicates.push({ file: dupFile, replace: decision === 'replace' })
    }

    // Files to actually upload: non-duplicates + resolved duplicates
    const filesToUpload = [
      ...nonDuplicates,
      ...resolvedDuplicates.map(r => r.file),
    ]
    const replaceSet = new Set(resolvedDuplicates.filter(r => r.replace).map(r => r.file.name))

    if (filesToUpload.length === 0) return

    // ── Build upload queue ───────────────────────────────────────────────────
    const uploadItems: UploadFile[] = filesToUpload.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }))

    setFiles(prev => [...prev, ...uploadItems])
    setIsUploading(true)

    const jobId = uploadCtx ? uploadCtx.startUpload(galleryId, galleryTitle, allowed.length) : null

    const supabase = createClient()
    const uploadedPhotos: { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number }[] = []

    // Get current photo count for display_order offset
    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId)

    let orderOffset = count || 0

    // ── Upload each file ─────────────────────────────────────────────────────
    for (const uploadFile of uploadItems) {
      setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))

      try {
        // ── Step 1: Get presigned URL from server (tiny JSON request) ────────
        const presignRes = await fetch('/api/photos/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            galleryId,
            filename: uploadFile.file.name,
            contentType: uploadFile.file.type || 'image/jpeg',
            fileSize: uploadFile.file.size,
          }),
        })

        if (!presignRes.ok) {
          const errData = await presignRes.json().catch(() => ({}))
          throw new Error(errData.error || `Presign failed (${presignRes.status})`)
        }

        const { presignedUrl, publicUrl: storageUrl } = await presignRes.json()
        const thumbnailUrl = storageUrl

        // ── Step 2: Upload directly to R2 (bypasses Vercel 4.5 MB limit) ────
        const putRes = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': uploadFile.file.type || 'image/jpeg' },
          body: uploadFile.file,
        })

        if (!putRes.ok) {
          throw new Error(`R2 upload failed (${putRes.status})`)
        }

        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, progress: 70 } : f))

        // ── Step 2: Insert photo record into Supabase ────────────────────────
        // storage_url  → full resolution via photos.fotonizer.com
        // thumbnail_url → Cloudflare Image Resizing (600px webp) via cdn-cgi/image/...
        // If replacing, delete the old photo record first
        if (replaceSet.has(uploadFile.file.name)) {
          const oldPhoto = existingMap.get(uploadFile.file.name)
          if (oldPhoto) {
            await fetch(`/api/photos/${oldPhoto.id}/delete`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storageUrl: oldPhoto.storage_url }),
            }).catch(() => {})
          }
        }

        const { data: photo, error: dbError } = await supabase
          .from('photos')
          .insert({
            gallery_id: galleryId,
            filename: uploadFile.file.name,
            storage_url: storageUrl,                        // full res: photos.fotonizer.com/galleries/...
            thumbnail_url: thumbnailUrl || storageUrl,      // optimized: cdn-cgi/image/width=600,...
            file_size: uploadFile.file.size,
            display_order: orderOffset++,
            ...(sectionId ? { section_id: sectionId } : {}),
          })
          .select()
          .single()

        if (dbError) throw dbError

        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'done', progress: 100, url: storageUrl } : f))
        uploadedPhotos.push(photo)
        if (jobId && uploadCtx) uploadCtx.tickDone(jobId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen'
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'error', progress: 0, error: message } : f))
        if (jobId && uploadCtx) uploadCtx.tickFailed(jobId)
      }
    }

    setIsUploading(false)

    if (uploadedPhotos.length > 0) {
      onUploadComplete(uploadedPhotos)
      toast.success(`${uploadedPhotos.length} ${uploadedPhotos.length === 1 ? 'Foto' : 'Fotos'} hochgeladen`)
    }
  }, [galleryId, galleryTitle, sectionId, uploadCtx, onUploadComplete, canUploadFile, maxStorageBytes, storageUsedBytes, onStorageLimitReached])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) { toast.error('Nur Bilddateien erlaubt (JPG, PNG, WEBP)'); return }
    uploadFiles(imageFiles)
  }, [uploadFiles])

  // Helper to resolve the current duplicate modal
  const resolveDuplicate = (decision: 'keep' | 'replace' | 'cancel') => {
    const resolve = (window as unknown as Record<string, unknown>).__duplicateResolve as ((d: 'keep' | 'replace' | 'cancel') => void) | undefined
    if (resolve) resolve(decision)
    delete (window as unknown as Record<string, unknown>).__duplicateResolve
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  const doneCount = files.filter(f => f.status === 'done').length
  const totalProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0

  const storagePercent = maxStorageBytes
    ? Math.min(100, Math.round((storageUsedBytes / maxStorageBytes) * 100))
    : null
  const storageNearLimit = storagePercent !== null && storagePercent >= 80
  const storageFull = storagePercent !== null && storagePercent >= 100

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
              <h3 className="text-[16px] font-bold text-[#111110] mb-1" style={{ letterSpacing: '-0.02em' }}>
                Datei existiert bereits
              </h3>
              <p className="text-[13px] text-[#7A7670] mb-1">
                <span className="font-semibold text-[#111110]">{currentDuplicate.file.name}</span> ist bereits in dieser Galerie vorhanden.
              </p>
              <p className="text-[12px] text-[#B0ACA6]">Was möchtest du tun?</p>
            </div>
            <div className="flex flex-col gap-2 px-6 py-4">
              <button
                onClick={() => resolveDuplicate('keep')}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                style={{ background: '#111110' }}
              >
                Beide behalten
              </button>
              <button
                onClick={() => resolveDuplicate('replace')}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
              >
                Ersetzen (alte löschen)
              </button>
              <button
                onClick={() => resolveDuplicate('cancel')}
                className="w-full py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={{ background: '#F5F4F1', color: '#7A7670' }}
              >
                Überspringen
              </button>
            </div>
          </div>
        </div>
      )}

      {maxStorageBytes != null && maxStorageBytes > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={cn('font-medium', storageNearLimit ? 'text-[#E84C1A]' : 'text-[#6B6B6B]')}>
              Speicher: {formatFileSize(storageUsedBytes)} / {formatFileSize(maxStorageBytes)}
            </span>
            <span className={cn('font-medium', storageNearLimit ? 'text-[#E84C1A]' : 'text-[#6B6B6B]')}>
              {storagePercent}%
            </span>
          </div>
          <div className="h-1.5 bg-[#E8E8E4] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', storageNearLimit ? 'bg-[#E84C1A]' : 'bg-[#C8A882]')}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !storageFull && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all',
          storageFull
            ? 'border-[#E84C1A]/40 bg-[#E84C1A]/5 cursor-not-allowed opacity-60'
            : isDragging
            ? 'border-[#C8A882] bg-[#C8A882]/5 cursor-pointer'
            : 'border-[#E8E8E4] dark:border-[#333] hover:border-[#C8A882]/50 cursor-pointer'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          disabled={storageFull}
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />
        <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragging ? 'text-[#C8A882]' : storageFull ? 'text-[#E84C1A]' : 'text-[#6B6B6B]')} />
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">
          {storageFull
            ? 'Speicherlimit erreicht'
            : isDragging
            ? 'Fotos hier ablegen'
            : 'Fotos hierher ziehen oder klicken'}
        </p>
        <p className="text-xs text-[#6B6B6B]">
          {storageFull
            ? 'Upgrade erforderlich, um weitere Fotos hochzuladen'
            : 'JPG, PNG, WEBP · Upload startet automatisch'}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                <span>Wird hochgeladen... ({doneCount}/{files.length})</span>
                <span>{totalProgress}%</span>
              </div>
              <div className="h-1.5 bg-[#E8E8E4] rounded-full overflow-hidden">
                <div className="h-full bg-[#C8A882] transition-all duration-300 rounded-full" style={{ width: `${totalProgress}%` }} />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                <div className="flex-shrink-0">
                  {f.status === 'done' && <CheckCircle className="w-4 h-4 text-[#3DBA6F]" />}
                  {f.status === 'error' && <AlertCircle className="w-4 h-4 text-[#E84C1A]" />}
                  {f.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-[#E8E8E4]" />}
                  {f.status === 'uploading' && <div className="w-4 h-4 rounded-full border-2 border-[#E8E8E4] border-t-[#C8A882] animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1A1A1A] truncate">{f.file.name}</p>
                  <p className="text-xs text-[#6B6B6B]">{formatFileSize(f.file.size)}</p>
                  {f.status === 'uploading' && (
                    <div className="h-1 bg-[#E8E8E4] rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-[#C8A882] transition-all duration-300 rounded-full" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                  {f.error && <p className="text-xs text-[#E84C1A] mt-0.5">{f.error}</p>}
                </div>
                {f.status !== 'uploading' && (
                  <button onClick={e => { e.stopPropagation(); removeFile(f.id) }} className="w-5 h-5 flex items-center justify-center text-[#6B6B6B] hover:text-[#E84C1A] transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
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
