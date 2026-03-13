'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import toast from 'react-hot-toast'

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
  onUploadComplete: (photos: { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number }[]) => void
}

export default function PhotoUploader({ galleryId, photographerId, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error('Nur Bilddateien erlaubt (JPG, PNG, WEBP)')
      return
    }
    const uploadFiles: UploadFile[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...uploadFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    setIsUploading(true)
    const supabase = createClient()
    const uploadedPhotos: { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number }[] = []

    // Get current photo count for display_order
    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId)

    let orderOffset = count || 0

    for (const uploadFile of pending) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) => f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f)
      )

      try {
        const ext = uploadFile.file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, uploadFile.file, {
            contentType: uploadFile.file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(`Storage: ${uploadError.message}`)
        }

        setFiles((prev) =>
          prev.map((f) => f.id === uploadFile.id ? { ...f, progress: 70 } : f)
        )

        // Get public URL
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
        const storageUrl = urlData.publicUrl

        // Insert photo record
        const { data: photo, error: dbError } = await supabase
          .from('photos')
          .insert({
            gallery_id: galleryId,
            filename: uploadFile.file.name,
            storage_url: storageUrl,
            thumbnail_url: storageUrl, // Same URL for now; thumbnail generation can be added via edge function
            file_size: uploadFile.file.size,
            display_order: orderOffset++,
          })
          .select()
          .single()

        if (dbError) throw dbError

        setFiles((prev) =>
          prev.map((f) => f.id === uploadFile.id ? { ...f, status: 'done', progress: 100, url: storageUrl } : f)
        )

        uploadedPhotos.push(photo)
      } catch (err) {
        console.error('Upload error:', err)
        const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen'
        setFiles((prev) =>
          prev.map((f) => f.id === uploadFile.id ? { ...f, status: 'error', progress: 0, error: message } : f)
        )
      }
    }

    setIsUploading(false)

    if (uploadedPhotos.length > 0) {
      onUploadComplete(uploadedPhotos)
      toast.success(`${uploadedPhotos.length} ${uploadedPhotos.length === 1 ? 'Foto' : 'Fotos'} hochgeladen`)
    }

    const errorFiles = files.filter((f) => f.status === 'error')
    if (errorFiles.length > 0) {
      const firstError = errorFiles[0]?.error || 'Unbekannter Fehler'
      toast.error(`Upload fehlgeschlagen: ${firstError}`, { duration: 8000 })
    }
  }

  const doneCount = files.filter((f) => f.status === 'done').length
  const pendingCount = files.filter((f) => f.status === 'pending').length
  const totalProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragging ? 'text-[#C8A882]' : 'text-[#6B6B6B]')} />
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">
          {isDragging ? 'Fotos hier ablegen' : 'Fotos hierher ziehen oder klicken'}
        </p>
        <p className="text-xs text-[#6B6B6B]">JPG, PNG, WEBP · Mehrere Dateien möglich</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {/* Overall progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                <span>Wird hochgeladen...</span>
                <span>{totalProgress}%</span>
              </div>
              <div className="h-1.5 bg-[#E8E8E4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8A882] transition-all duration-300 rounded-full"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Individual files */}
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {f.status === 'done' && <CheckCircle className="w-4 h-4 text-[#3DBA6F]" />}
                  {f.status === 'error' && <AlertCircle className="w-4 h-4 text-[#E84C1A]" />}
                  {f.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-[#E8E8E4]" />
                  )}
                {f.status === 'uploading' && (
                    <div className="w-4 h-4 rounded-full border-2 border-[#E8E8E4] border-t-[#C8A882] animate-spin" />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1A1A1A] truncate">{f.file.name}</p>
                  <p className="text-xs text-[#6B6B6B]">{formatFileSize(f.file.size)}</p>
                  {f.status === 'uploading' && (
                    <div className="h-1 bg-[#E8E8E4] rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#C8A882] transition-all duration-300 rounded-full"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                  {f.error && <p className="text-xs text-[#E84C1A] mt-0.5">{f.error}</p>}
                </div>

                {/* Remove */}
                {f.status !== 'uploading' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                    className="w-5 h-5 flex items-center justify-center text-[#6B6B6B] hover:text-[#E84C1A] transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {pendingCount > 0 && (
            <button
              onClick={uploadAll}
              disabled={isUploading}
              className="w-full py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
            >
              {isUploading
                ? `Wird hochgeladen... (${doneCount}/${files.length})`
                : `${pendingCount} ${pendingCount === 1 ? 'Foto' : 'Fotos'} hochladen`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
