'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Upload, X, AlertCircle, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

// 4 concurrent uploads — good balance between throughput and memory pressure
const CONCURRENCY  = 4
const MAX_RETRIES  = 3                   // per-file (or per-chunk) retry attempts
const CHUNK_SIZE   = 10 * 1024 * 1024   // 10 MB — multipart chunk size
const LARGE_FILE   = 5  * 1024 * 1024   // files ≥ 5 MB use multipart

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// Fetch timeouts — prevents workers from hanging forever on stalled connections
const TIMEOUT = {
  presign:         10_000,  // 10s  — signing a URL is fast; anything more = infra issue
  multipartInit:   15_000,  // 15s  — signs N part URLs in Promise.all
  chunkPut:       180_000,  // 3min — 10 MB at 550 KB/s minimum viable bandwidth
  multipartComplete: 20_000, // 20s  — R2 assembly, documented < 10s normally
  smallPut:       120_000,  // 2min — < 5 MB file
} as const

// ── Display helpers ──────────────────────────────────────────────────────────

function fmtSpeed(bps: number): string {
  if (bps <= 0) return ''
  if (bps >= 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`
  return `${Math.round(bps / 1024)} KB/s`
}
function fmtEta(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60), s = sec % 60
  if (m < 60) return s > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}min`
}
function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`
  if (b >= 1e6) return `${Math.round(b / 1e6)} MB`
  return `${Math.round(b / 1024)} KB`
}
function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000), m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}:${String(s % 60).padStart(2, '0')} min`
}

// ── Structured upload error ──────────────────────────────────────────────────
// Carries the endpoint name and HTTP status alongside the message so the log
// can record exactly which step failed without parsing error strings.

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly httpStatus: number,
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

// ── Upload log ───────────────────────────────────────────────────────────────

export interface UploadLogEntry {
  filename: string
  fileSize: number
  strategy: 'small' | 'large'
  galleryId: string
  startedAt: number        // Date.now() when uploadOne began
  finishedAt: number       // Date.now() when uploadOne ended (success or final failure)
  durationMs: number
  status: 'done' | 'failed'
  attemptsUsed: number     // 1 = succeeded first try, 4 = exhausted all retries
  // Set on failure:
  error?: string
  failedEndpoint?: string  // e.g. '/api/photos/presign', 'R2 PUT', 'supabase.insert'
  httpStatus?: number      // HTTP status of the failing response
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FailedFile { filename: string; error: string }

interface UploadJob {
  id: string
  galleryId: string
  total: number
  done: number
  failed: number
  label: string
  // UX fields added for the banner
  bytesTotal: number     // sum of all file sizes in this batch
  bytesDone: number      // bytes of successfully uploaded files
  speed: number          // rolling bytes/sec over a 20-s window
  startedAt: number      // Date.now() when addJob was called
  currentFile: string    // filename currently in-flight (last started)
  failedFiles: FailedFile[]
  expanded: boolean      // error panel open
  minimized: boolean     // banner collapsed to slim bar
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
  getUploadLogs: () => UploadLogEntry[]
  clearUploadLogs: () => void
  /** R2 keys that were uploaded successfully but whose DB insert failed.
   *  Call cleanupOrphans() to delete them from R2. */
  getOrphanKeys: () => string[]
  cleanupOrphans: () => Promise<void>
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
  const uploadLogs = useRef<UploadLogEntry[]>([])
  // R2 keys uploaded successfully but whose DB insert failed — potential orphans
  const orphanQueue = useRef<string[]>([])

  const getUploadLogs = useCallback(() => [...uploadLogs.current], [])
  const clearUploadLogs = useCallback(() => { uploadLogs.current = [] }, [])
  const getOrphanKeys = useCallback(() => [...orphanQueue.current], [])
  const cleanupOrphans = useCallback(async () => {
    const keys = orphanQueue.current.splice(0)
    if (keys.length === 0) return
    try {
      await fetch('/api/photos/cleanup-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      // Non-critical — push keys back so the next cleanup attempt can retry
      orphanQueue.current.unshift(...keys)
      console.warn('[upload] orphan cleanup failed, will retry later:', err)
    }
  }, [])


  // ── Speed tracking (rolling 20 s window, one entry per completed file) ──────
  const speedSamples = useRef<Record<string, Array<{ ts: number; bytes: number }>>>({})

  const pushSpeedSample = (jobId: string, bytes: number): number => {
    const now = Date.now()
    const arr = speedSamples.current[jobId] ?? []
    arr.push({ ts: now, bytes })
    const cutoff = now - 20_000
    const trimmed = arr.filter(s => s.ts > cutoff)
    speedSamples.current[jobId] = trimmed
    if (trimmed.length < 2) return 0
    const totalBytes = trimmed.reduce((s, e) => s + e.bytes, 0)
    const span = trimmed[trimmed.length - 1].ts - trimmed[0].ts
    return span > 0 ? totalBytes / (span / 1000) : 0
  }

  // ── Job state ────────────────────────────────────────────────────────────

  const addJob = (galleryId: string, label: string, total: number, bytesTotal: number): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setJobs(prev => [...prev, {
      id, galleryId, total, done: 0, failed: 0, label,
      bytesTotal, bytesDone: 0, speed: 0, startedAt: Date.now(),
      currentFile: '', failedFiles: [], expanded: false, minimized: false,
    }])
    return id
  }

  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
    clearTimeout(timers.current[jobId])
    delete timers.current[jobId]
    delete speedSamples.current[jobId]
  }, [])

  const tickDone = useCallback((jobId: string, fileSize: number) => {
    const speed = pushSpeedSample(jobId, fileSize)
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const u = { ...j, done: j.done + 1, bytesDone: j.bytesDone + fileSize, speed }
      if (u.done + u.failed >= u.total) {
        // Smart dismiss: never auto-close if failures; longer for big/slow batches
        const durationMs = Date.now() - u.startedAt
        const delay = u.failed > 0 ? 0
          : (u.total > 50 || durationMs > 120_000) ? 6_000
          : 3_000
        if (delay > 0) timers.current[jobId] = setTimeout(() => removeJob(jobId), delay)
      }
      return u
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeJob])

  const tickFailed = useCallback((jobId: string, info: { filename: string; error: string }) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const u = {
        ...j,
        failed: j.failed + 1,
        failedFiles: [...j.failedFiles, info],
      }
      // On completion with failures: never auto-dismiss
      return u
    }))
  }, [])

  const setCurrentFile = useCallback((jobId: string, filename: string) => {
    setJobs(prev => prev.map(j =>
      j.id !== jobId ? j : { ...j, currentFile: filename }
    ))
  }, [])

  const toggleExpanded = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j =>
      j.id !== jobId ? j : { ...j, expanded: !j.expanded }
    ))
  }, [])

  const toggleMinimized = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j =>
      j.id !== jobId ? j : { ...j, minimized: !j.minimized }
    ))
  }, [])

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
      signal: AbortSignal.timeout(TIMEOUT.presign),
    })
    if (!presignRes.ok) {
      const e = await presignRes.json().catch(() => ({}))
      throw new UploadError(
        e.error || `Presign failed (${presignRes.status})`,
        '/api/photos/presign',
        presignRes.status,
      )
    }
    const { presignedUrl, publicUrl } = await presignRes.json()

    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      signal: AbortSignal.timeout(TIMEOUT.smallPut),
    })
    if (!putRes.ok) {
      throw new UploadError(`R2 PUT failed (${putRes.status})`, 'R2 presigned PUT', putRes.status)
    }

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
      signal: AbortSignal.timeout(TIMEOUT.multipartInit),
    })
    if (!initRes.ok) {
      const e = await initRes.json().catch(() => ({}))
      throw new UploadError(
        e.error || `Multipart init failed (${initRes.status})`,
        '/api/photos/multipart-init',
        initRes.status,
      )
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
          const res = await fetch(partUrls[i], {
            method: 'PUT',
            body: chunk,
            signal: AbortSignal.timeout(TIMEOUT.chunkPut),
          })
          if (!res.ok) {
            throw new UploadError(
              `Part ${i + 1} upload failed (${res.status})`,
              `R2 multipart part ${i + 1}`,
              res.status,
            )
          }
          const etag = res.headers.get('ETag') ?? res.headers.get('etag') ?? ''
          if (!etag) {
            throw new UploadError(
              `Part ${i + 1}: R2 returned no ETag`,
              `R2 multipart part ${i + 1}`,
              res.status,
            )
          }
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
      signal: AbortSignal.timeout(TIMEOUT.multipartComplete),
    })
    if (!completeRes.ok) {
      const e = await completeRes.json().catch(() => ({}))
      throw new UploadError(
        e.error || `Multipart complete failed (${completeRes.status})`,
        '/api/photos/multipart-complete',
        completeRes.status,
      )
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

      const bytesTotal = files.reduce((s, f) => s + f.size, 0)
      const jobId = addJob(galleryId, galleryTitle, files.length, bytesTotal)
      const supabase = createClient()
      const uploadedPhotos: UploadedPhoto[] = []

      let orderOffset = initialOrder
      const getOrder = () => orderOffset++ // safe: JS is single-threaded

      const uploadOne = async (file: File) => {
        setCurrentFile(jobId, file.name)
        const startedAt = Date.now()
        const strategy: 'small' | 'large' = file.size >= LARGE_FILE ? 'large' : 'small'
        let lastErr: unknown
        let attemptsUsed = 0

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          attemptsUsed = attempt + 1
          if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1))
          try {
            // Choose strategy based on file size
            const { publicUrl } = strategy === 'large'
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

            if (dbErr) {
              // File is in R2 but has no DB record — track for cleanup
              const r2Key = publicUrl.replace(/^https?:\/\/[^/]+\//, '')
              if (r2Key) orphanQueue.current.push(r2Key)
              throw new UploadError(dbErr.message, 'supabase.photos.insert', 0)
            }

            const finishedAt = Date.now()
            const entry: UploadLogEntry = {
              filename: file.name, fileSize: file.size, strategy, galleryId,
              startedAt, finishedAt, durationMs: finishedAt - startedAt,
              status: 'done', attemptsUsed,
            }
            uploadLogs.current.push(entry)
            console.info(
              `[upload:ok] ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB, ${strategy}, ${entry.durationMs}ms, attempt ${attemptsUsed}/${MAX_RETRIES + 1})`
            )

            const uploaded = photo as UploadedPhoto
            uploadedPhotos.push(uploaded)
            tickDone(jobId, file.size)
            try { onFileDone?.(file.name, uploaded) } catch {}
            return // success
          } catch (err) {
            lastErr = err
          }
        }

        // All retries exhausted
        const finishedAt = Date.now()
        const isUploadError = lastErr instanceof UploadError
        const isError = lastErr instanceof Error
        const msg = isError ? (lastErr as Error).message : 'Upload failed'
        const entry: UploadLogEntry = {
          filename: file.name, fileSize: file.size, strategy, galleryId,
          startedAt, finishedAt, durationMs: finishedAt - startedAt,
          status: 'failed', attemptsUsed,
          error: msg,
          failedEndpoint: isUploadError ? (lastErr as UploadError).endpoint : undefined,
          httpStatus: isUploadError ? (lastErr as UploadError).httpStatus : undefined,
        }
        uploadLogs.current.push(entry)
        console.group(`[upload:fail] ${file.name}`)
        console.error('file      :', file.name, `(${(file.size / 1024 / 1024).toFixed(1)} MB, ${strategy})`)
        console.error('error     :', msg)
        console.error('endpoint  :', entry.failedEndpoint ?? 'unknown')
        console.error('httpStatus:', entry.httpStatus ?? 'n/a (network error)')
        console.error('attempts  :', `${attemptsUsed} / ${MAX_RETRIES + 1}`)
        console.error('duration  :', `${entry.durationMs}ms`)
        console.error('raw error :', lastErr)
        console.groupEnd()

        tickFailed(jobId, { filename: file.name, error: msg })
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
  }, [tickDone, tickFailed, setCurrentFile])

  const enqueueFiles = useCallback((files: File[], config: EnqueueConfig) => {
    if (files.length === 0) return
    queue.current.push({ files, config })
    processQueue()
  }, [processQueue])

  // ── Banner UI ────────────────────────────────────────────────────────────

  // Memoised so that jobs state changes (tickDone/tickFailed/setCurrentFile)
  // do NOT re-render context consumers (PhotoUploader, etc.).
  // Without this, every upload tick re-renders the entire consumer tree.
  const contextValue = useMemo(() => ({
    enqueueFiles, getUploadLogs, clearUploadLogs, getOrphanKeys, cleanupOrphans,
  }), [enqueueFiles, getUploadLogs, clearUploadLogs, getOrphanKeys, cleanupOrphans])

  return (
    <UploadContext.Provider value={contextValue}>
      {children}

      {jobs.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          {jobs.map(job => {
            const processed  = job.done + job.failed
            const finished   = processed >= job.total
            const pct        = job.total > 0 ? Math.round((processed / job.total) * 100) : 0
            const hasFail    = job.failed > 0
            const durationMs = finished ? (Date.now() - job.startedAt) : 0
            const avgSpeed   = durationMs > 0 ? job.bytesDone / (durationMs / 1000) : 0
            const eta        = !finished && job.speed > 0
              ? Math.round((job.bytesTotal - job.bytesDone) / job.speed)
              : null

            // ── Minimized bar ─────────────────────────────────────────────
            if (job.minimized) return (
              <div key={job.id}
                className="pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-xl shadow-2xl"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              >
                <Upload className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {job.done}/{job.total}
                </span>
                {/* mini progress */}
                <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                </div>
                {job.speed > 0 && (
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {fmtSpeed(job.speed)}
                  </span>
                )}
                <button
                  onClick={() => toggleMinimized(job.id)}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeJob(job.id)}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )

            // ── Full banner ───────────────────────────────────────────────
            const borderColor = hasFail && finished
              ? 'rgba(239,68,68,0.28)'
              : finished
              ? 'rgba(42,155,104,0.22)'
              : 'var(--border-color)'

            const iconBg = finished
              ? hasFail ? 'rgba(239,68,68,0.10)' : 'rgba(42,155,104,0.12)'
              : 'rgba(196,164,124,0.12)'

            const titleText = finished
              ? hasFail
                ? `${job.done} ok · ${job.failed} fehlgeschlagen`
                : `${job.done} Fotos hochgeladen`
              : `${job.done} / ${job.total} Fotos`

            return (
              <div key={job.id}
                className="pointer-events-auto rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${borderColor}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  width: 360,
                  animation: 'fadeSlideIn 0.3s ease forwards',
                }}
              >
                {/* ── Header ── */}
                <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                    {finished
                      ? hasFail
                        ? <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
                        : <CheckCircle className="w-4 h-4" style={{ color: '#2A9B68' }} />
                      : <Upload className="w-3.5 h-3.5 animate-bounce" style={{ color: 'var(--accent)' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {titleText}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {job.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Minimize — only while uploading */}
                    {!finished && (
                      <button
                        onClick={() => toggleMinimized(job.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title="Minimieren"
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeJob(job.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Progress section (while uploading) ── */}
                {!finished && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: 'var(--accent)' }}
                      />
                    </div>
                    {/* Speed + ETA row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {pct}%
                        {job.speed > 0 && <> · {fmtSpeed(job.speed)}</>}
                      </span>
                      {eta !== null && (
                        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          ~{fmtEta(eta)} restantes
                        </span>
                      )}
                    </div>
                    {/* Current file */}
                    {job.currentFile && (
                      <p className="text-[10.5px] truncate" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        {job.currentFile}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Summary section (after finishing) ── */}
                {finished && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {durationMs > 0 && (
                        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          Dauer: {fmtDuration(durationMs)}
                        </span>
                      )}
                      {avgSpeed > 0 && (
                        <>
                          <span style={{ color: 'var(--border-color)' }}>·</span>
                          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                            ⌀ {fmtSpeed(avgSpeed)}
                          </span>
                        </>
                      )}
                      {job.bytesDone > 0 && (
                        <>
                          <span style={{ color: 'var(--border-color)' }}>·</span>
                          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                            {fmtBytes(job.bytesDone)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Error panel (expandable) ── */}
                {hasFail && (
                  <div className="border-t" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                    <button
                      onClick={() => toggleExpanded(job.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 transition-colors"
                      style={{ color: '#DC2626' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span className="text-[12px] font-semibold">
                        {job.failed} {job.failed === 1 ? 'Fehler' : 'Fehler'}
                      </span>
                      {job.expanded
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      }
                    </button>

                    {job.expanded && job.failedFiles.length > 0 && (
                      <div
                        className="mx-3 mb-3 rounded-xl overflow-hidden overflow-y-auto"
                        style={{
                          background: 'rgba(239,68,68,0.04)',
                          border: '1px solid rgba(239,68,68,0.12)',
                          maxHeight: 180,
                        }}
                      >
                        {job.failedFiles.map((f, i) => (
                          <div
                            key={i}
                            className="px-3 py-2"
                            style={{
                              borderTop: i > 0 ? '1px solid rgba(239,68,68,0.08)' : undefined,
                            }}
                          >
                            <p className="text-[11.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {f.filename}
                            </p>
                            <p className="text-[10.5px] truncate mt-0.5" style={{ color: '#DC2626', opacity: 0.8 }}>
                              {f.error}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </UploadContext.Provider>
  )
}
