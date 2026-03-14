'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import toast from 'react-hot-toast'

// Try to use UploadContext if available (graceful fallback if not inside provider)
let useUploadSafe: (() => { startUpload: (g: string, l: string, t: number) => string; tickDone: (id: string) => void; tickFailed: (id: string) => void } | null) | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ctx = require('@/contexts/UploadContext')
  useUploadSafe = () => {
    try { return ctx.useUpload() } catch { return null }
  }
} catch { useUploadSafe = () => null }

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
}

export default function PhotoUploader({ galleryId, photographerId, sectionId, galleryTitle = 'Galerie', onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadCtx = useUploadSafe ? useUploadSafe() : null

  const uploadFiles = useCallback(async (imageFiles: File[]) => {
    if (imageFiles.length === 0) return

    const uploadItems: UploadFile[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }))

    setFiles(prev => [...prev, ...uploadItems])
    setIsUploading(true)

    // Register with global upload context
    const jobId = uploadCtx ? uploadCtx.startUpload(galleryId, galleryTitle, imageFiles.length) : null

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

        const { data: photo, error: dbError } = await supabase
          .from('photos')
          .insert({
            gallery_id: galleryId,
            filename: uploadFile.file.name,
            storage_url: storageUrl,
            thumbnail_url: storageUrl,
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
  }, [galleryId, galleryTitle, sectionId, uploadCtx, onUploadComplete])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) { toast.error('Nur Bilddateien erlaubt (JPG, PNG, WEBP)'); return }
    // Auto-upload immediately
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

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-[#C8A882] bg-[#C8A882]/5'
            : 'border-[#E8E8E4] hover:border-[#C8A882]/50 hover:bg-[#FAFAF8]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />
        <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragging ? 'text-[#C8A882]' : 'text-[#6B6B6B]')} />
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">
          {isDragging ? 'Fotos hier ablegen' : 'Fotos hierher ziehen oder klicken'}
        </p>
        <p className="text-xs text-[#6B6B6B]">JPG, PNG, WEBP · Upload startet automatisch</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {/* Overall progress */}
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

          {/* Individual files */}
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
