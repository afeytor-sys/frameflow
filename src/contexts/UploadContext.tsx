'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Upload, X, AlertCircle } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const CONCURRENCY = 5  // parallel uploads at once
const MAX_RETRIES = 3  // per-file retries with backoff

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

  // ── Internal job state ───────────────────────────────────────────────────

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
      const updated = { ...j, done: j.done + 1 }
      if (updated.done + updated.failed >= updated.total) {
        const delay = updated.failed > 0 ? 8000 : 3000
        timers.current[jobId] = setTimeout(() => removeJob(jobId), delay)
      }
      return updated
    }))
  }, [removeJob])

  const tickFailed = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const updated = { ...j, failed: j.failed + 1 }
      if (updated.done + updated.failed >= updated.total) {
        timers.current[jobId] = setTimeout(() => removeJob(jobId), 8000)
      }
      return updated
    }))
  }, [removeJob])

  // ── Upload loop ──────────────────────────────────────────────────────────

  const processQueue = useCallback(async () => {
    if (isProcessing.current) return
    isProcessing.current = true

    while (queue.current.length > 0) {
      const { files, config } = queue.current.shift()!
      const {
        galleryId, sectionId, galleryTitle,
        initialOrder, replaceMap,
        onFileDone, onFileError, onAllDone,
      } = config

      const jobId = addJob(galleryId, galleryTitle, files.length)
      const supabase = createClient()
      const uploadedPhotos: UploadedPhoto[] = []

      // Atomic order counter — safe in single-threaded JS even with concurrency
      let orderOffset = initialOrder
      const getOrder = () => orderOffset++

      // Each worker handles one file at a time: presign → PUT → DB insert
      // Starting immediately with no pre-phase — first photos appear in seconds
      const uploadOne = async (file: File) => {
        let lastErr: unknown

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1)) // 1s, 2s, 4s
          try {
            // 1. Get presigned URL
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
              const errData = await presignRes.json().catch(() => ({}))
              throw new Error(errData.error || `Presign failed (${presignRes.status})`)
            }
            const { presignedUrl, publicUrl } = await presignRes.json()

            // 2. Upload directly to R2
            const putRes = await fetch(presignedUrl, { method: 'PUT', body: file })
            if (!putRes.ok) throw new Error(`R2 upload failed (${putRes.status})`)

            // 3. Replace old photo if needed
            const oldPhoto = replaceMap?.get(file.name)
            if (oldPhoto) {
              await fetch(`/api/photos/${oldPhoto.id}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storageUrl: oldPhoto.storage_url }),
              }).catch(() => {})
            }

            // 4. Register in DB
            const { data: photo, error: dbError } = await supabase
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

            if (dbError) throw dbError

            const uploaded = photo as UploadedPhoto
            uploadedPhotos.push(uploaded)
            tickDone(jobId)
            try { onFileDone?.(file.name, uploaded) } catch {}
            return // success
          } catch (err) {
            lastErr = err
          }
        }

        // All retries exhausted
        const msg = lastErr instanceof Error ? lastErr.message : 'Upload failed'
        console.error('[upload] failed after retries:', file.name, lastErr)
        tickFailed(jobId)
        try { onFileError?.(file.name, msg) } catch {}
      }

      // CONCURRENCY workers each pulling from the shared file list
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
            const hasFailures = job.failed > 0

            return (
              <div
                key={job.id}
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[280px] max-w-[340px]"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${hasFailures && finished ? 'rgba(239,68,68,0.30)' : 'var(--border-color)'}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  animation: 'fadeSlideIn 0.3s ease forwards',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: finished
                      ? hasFailures ? 'rgba(239,68,68,0.10)' : 'rgba(42,155,104,0.12)'
                      : 'rgba(196,164,124,0.12)',
                  }}
                >
                  {finished
                    ? hasFailures
                      ? <AlertCircle className="w-4.5 h-4.5" style={{ color: '#EF4444' }} />
                      : <CheckCircle className="w-4.5 h-4.5" style={{ color: '#2A9B68' }} />
                    : <Upload className="w-4 h-4 animate-bounce" style={{ color: 'var(--accent)' }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {finished
                      ? hasFailures
                        ? `${job.done} hochgeladen · ${job.failed} fehlgeschlagen`
                        : `✓ ${job.done} Fotos hochgeladen`
                      : `${job.done} / ${job.total} Fotos…`
                    }
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {job.label}
                    {!finished && job.failed > 0 && ` · ${job.failed} Fehler`}
                  </p>
                  {!finished && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: 'var(--accent)' }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeJob(job.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
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
