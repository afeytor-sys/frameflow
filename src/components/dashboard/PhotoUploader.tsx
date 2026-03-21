'use client'

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

// ─── Image URL helpers ────────────────────────────────────────────────────────

/** Grid thumbnail — 600px, fast loading for gallery grid view */
function toThumbnailUrl(storageUrl: string): string {
  return storageUrl
    .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    + '?width=600&quality=70&format=webp'
}

/** Full resolution — 2400px, only loaded when client clicks a photo */
function toFullResUrl(storageUrl: string): string {
  return storageUrl
    .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    + '?width=2400&quality=85&format=webp'
}
// ─────────────────────────────────────────────────────────────────────────────

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

  const uploadFiles = useCallback(async (imageFiles: File[]) => {
    if (imageFiles.length === 0) return

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

    const uploadItems: UploadFile[] = allowed.map((file) => ({
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

    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId)

    let orderOffset = count || 0

    for (const uploadFile of uploadItems) {
      setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))

      try {
        const ext = uploadFile.file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, uploadFile.file, { contentType: uploadFile.file.type, upsert: false })

        if (uploadError) throw new Error(`Storage: ${uploadError.message}`)

        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, progress: 70 } : f))

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
        const storageUrl = urlData.publicUrl

        // Grid thumbnail — small & fast
        const thumbnailUrl = toThumbnailUrl(storageUrl)

        // Full res — for lightbox and download
        const fullResUrl = toFullResUrl(storageUrl)

        const { data: photo, error: dbError } = await supabase
          .from('photos')
          .insert({
            gallery_id: galleryId,
            filename: uploadFile.file.name,
            storage_url: fullResUrl,     // full res for lightbox/download
            thumbnail_url: thumbnailUrl,  // small & fast for grid
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
      {maxStorageBytes !== null && maxStorageBytes !== undefined && (
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
