'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Upload, X, AlertCircle } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

// 2 concurrent uploads — prevents browser from holding 5 × 40 MB in memory
const CONCURRENCY  = 2
const MAX_RETRIES  = 3                   // per-file (or per-chunk) retry attempts
const CHUNK_SIZE   = 10 * 1024 * 1024   // 10 MB — multipart chunk size
const LARGE_FILE   = 5  * 1024 * 1024   // files ≥ 5 MB use multipart

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── Types ────────────────────────────────────────────────────────────────────

interface UploadJob {
  id: string
  galleryId: string
  total: number
  done: number
  failed: number
  label: string
}

export interface UploadedPhoto {
  id: string
  storage_url: string
  thumbnail_url: string | null
  filename: string
  file_size: number
  display_order: number
}

export interface EnqueueConfig {
  galleryId: string
  photographerId: string
  sectionId?: string | null
  galleryTitle: string
  initialOrder: number
  replaceMap?: Map<string, { id: string; storage_url: string }>
  onFileDone?: (filename: string, photo: UploadedPhoto) => void
  onFileError?: (filename: string, error: string) => void
  onAllDone?: (photos: UploadedPhoto[]) => void
}

interface UploadContextValue {
  enqueueFiles: (files: File[], config: EnqueueConfig) => void
}

// ── Context ──────────────────────────────────────────────────────────────────

export const UploadContext = createContext<UploadContextValue | null>(null)

export function useUpload() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used inside UploadProvider')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const isProcessing = useRef(false)
  const queue = useRef<Array<{ files: File[]; config: EnqueueConfig }>>([])

  // ── Job state ────────────────────────────────────────────────────────────

  const addJob = (galleryId: string, label: string, total: number): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setJobs(prev => [...prev, { id, galleryId, total, done: 0, failed: 0, label }])
    return id
  }

  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
    clearTimeout(timers.current[jobId])
    delete timers.current[jobId]
  }, [])

  const tickDone = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const u = { ...j, done: j.done + 1 }
      if (u.done + u.failed >= u.total) {
        timers.current[jobId] = setTimeout(() => removeJob(jobId), u.failed > 0 ? 8000 : 3000)
      }
      return u
    }))
  }, [removeJob])

  const tickFailed = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const u = { ...j, failed: j.failed + 1 }
      if (u.done + u.failed >= u.total) {
        timers.current[jobId] = setTimeout(() => removeJob(jobId), 8000)
      }
      return u
    }))
  }, [removeJob])

  // ── Upload helpers ───────────────────────────────────────────────────────

  /** Small files (< 5 MB): single presigned PUT */
  const uploadSmall = async (file: File, galleryId: string): Promise<{ publicUrl: string }> => {
    const presignRes = await fetch('/api/photos/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        galleryId,
        filename: file.name,
        contentType: file.type || 'image/jpeg',
        fileSize: file.size,
      }),
    })
    if (!presignRes.ok) {
      const e = await presignRes.json().catch(() => ({}))
      throw new Error(e.error || `Presign failed (${presignRes.status})`)
    }
    const { presignedUrl, publicUrl } = await presignRes.json()

    const putRes = await fetch(presignedUrl, { method: 'PUT', body: file })
    if (!putRes.ok) throw new Error(`R2 PUT failed (${putRes.status})`)

    return { publicUrl }
  }

  /**
   * Large files (≥ 5 MB): S3 multipart upload.
   * File is sliced into 10 MB chunks and each is uploaded independently —
   * only one 10 MB slice is held in memory at a time.
   */
  const uploadLarge = async (file: File, galleryId: string): Promise<{ publicUrl: string }> => {
    // 1. Init: get uploadId + presigned URL per part
    const initRes = await fetch('/api/photos/multipart-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        galleryId,
        filename: file.name,
        contentType: file.type || 'image/jpeg',
        fileSize: file.size,
      }),
    })
    if (!initRes.ok) {
      const e = await initRes.json().catch(() => ({}))
      throw new Error(e.error || `Multipart init failed (${initRes.status})`)
    }
    const { uploadId, key, publicUrl, partUrls } = await initRes.json()

    // 2. Upload each 10 MB chunk sequentially (one slice in memory at a time)
    const parts: { partNumber: number; etag: string }[] = []
    for (let i = 0; i < partUrls.length; i++) {
      const start = i * CHUNK_SIZE
      const chunk = file.slice(start, start + CHUNK_SIZE)

      let lastErr: unknown
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1))
        try {
          const res = await fetch(partUrls[i], { method: 'PUT', body: chunk })
          if (!res.ok) throw new Error(`Part ${i + 1} upload failed (${res.status})`)
          const etag = res.headers.get('ETag') ?? res.headers.get('etag') ?? ''
          parts.push({ partNumber: i + 1, etag })
          lastErr = undefined
          break
        } catch (err) {
          lastErr = err
        }
      }
      if (lastErr) throw lastErr
    }

    // 3. Complete: tell R2 to assemble the parts
    const completeRes = await fetch('/api/photos/multipart-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, parts }),
    })
    if (!completeRes.ok) {
      const e = await completeRes.json().catch(() => ({}))
      throw new Error(e.error || `Multipart complete failed (${completeRes.status})`)
    }

    return { publicUrl }
  }

  // ── Main loop ────────────────────────────────────────────────────────────

  const processQueue = useCallback(async () => {
    if (isProcessing.current) return
    isProcessing.current = true

    while (queue.current.length > 0) {
      const { files, config } = queue.current.shift()!
      const { galleryId, sectionId, galleryTitle, initialOrder, replaceMap, onFileDone, onFileError, onAllDone } = config

      const jobId = addJob(galleryId, galleryTitle, files.length)
      const supabase = createClient()
      const uploadedPhotos: UploadedPhoto[] = []

      let orderOffset = initialOrder
      const getOrder = () => orderOffset++ // safe: JS is single-threaded

      const uploadOne = async (file: File) => {
        let lastErr: unknown
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1))
          try {
            // Choose strategy based on file size
            const { publicUrl } = file.size >= LARGE_FILE
              ? await uploadLarge(file, galleryId)
              : await uploadSmall(file, galleryId)

            // Delete old photo if replacing
            const old = replaceMap?.get(file.name)
            if (old) {
              await fetch(`/api/photos/${old.id}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storageUrl: old.storage_url }),
              }).catch(() => {})
            }

            // Register in DB
            const { data: photo, error: dbErr } = await supabase
              .from('photos')
              .insert({
                gallery_id: galleryId,
                filename: file.name,
                storage_url: publicUrl,
                thumbnail_url: publicUrl,
                file_size: file.size,
                display_order: getOrder(),
                media_type: file.type.startsWith('video/') ? 'video' : 'image',
                ...(sectionId ? { section_id: sectionId } : {}),
              })
              .select()
              .single()

            if (dbErr) throw dbErr

            const uploaded = photo as UploadedPhoto
            uploadedPhotos.push(uploaded)
            tickDone(jobId)
            try { onFileDone?.(file.name, uploaded) } catch {}
            return // success
          } catch (err) {
            lastErr = err
          }
        }

        const msg = lastErr instanceof Error ? lastErr.message : 'Upload failed'
        console.error('[upload] failed after retries:', file.name, lastErr)
        tickFailed(jobId)
        try { onFileError?.(file.name, msg) } catch {}
      }

      const remaining = [...files]
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
          while (remaining.length > 0) {
            const file = remaining.shift()
            if (file) await uploadOne(file)
          }
        })
      )

      try { onAllDone?.(uploadedPhotos) } catch {}
    }

    isProcessing.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickDone, tickFailed])

  const enqueueFiles = useCallback((files: File[], config: EnqueueConfig) => {
    if (files.length === 0) return
    queue.current.push({ files, config })
    processQueue()
  }, [processQueue])

  // ── Banner UI ────────────────────────────────────────────────────────────

  return (
    <UploadContext.Provider value={{ enqueueFiles }}>
      {children}

      {jobs.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          {jobs.map(job => {
            const processed = job.done + job.failed
            const finished = processed >= job.total
            const pct = job.total > 0 ? Math.round((processed / job.total) * 100) : 0
            const hasFail = job.failed > 0

            return (
              <div key={job.id}
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[280px] max-w-[340px]"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${hasFail && finished ? 'rgba(239,68,68,0.30)' : 'var(--border-color)'}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  animation: 'fadeSlideIn 0.3s ease forwards',
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: finished ? (hasFail ? 'rgba(239,68,68,0.10)' : 'rgba(42,155,104,0.12)') : 'rgba(196,164,124,0.12)' }}>
                  {finished
                    ? hasFail
                      ? <AlertCircle className="w-4.5 h-4.5" style={{ color: '#EF4444' }} />
                      : <CheckCircle className="w-4.5 h-4.5" style={{ color: '#2A9B68' }} />
                    : <Upload className="w-4 h-4 animate-bounce" style={{ color: 'var(--accent)' }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {finished
                      ? hasFail
                        ? `${job.done} hochgeladen · ${job.failed} fehlgeschlagen`
                        : `✓ ${job.done} Fotos hochgeladen`
                      : `${job.done} / ${job.total} Fotos…`
                    }
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {job.label}{!finished && hasFail ? ` · ${job.failed} Fehler` : ''}
                  </p>
                  {!finished && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                    </div>
                  )}
                </div>

                <button onClick={() => removeJob(job.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </UploadContext.Provider>
  )
}
