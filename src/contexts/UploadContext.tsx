'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle, Upload, X } from 'lucide-react'

interface UploadJob {
  id: string
  galleryId: string
  total: number
  done: number
  failed: number
  label: string // gallery title
}

interface UploadContextValue {
  startUpload: (galleryId: string, label: string, total: number) => string
  tickDone: (jobId: string) => void
  tickFailed: (jobId: string) => void
}

export const UploadContext = createContext<UploadContextValue | null>(null)

export function useUpload() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used inside UploadProvider')
  return ctx
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const startUpload = useCallback((galleryId: string, label: string, total: number): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setJobs(prev => [...prev, { id, galleryId, total, done: 0, failed: 0, label }])
    return id
  }, [])

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
        // Auto-remove after 3s
        timers.current[jobId] = setTimeout(() => removeJob(jobId), 3000)
      }
      return updated
    }))
  }, [removeJob])

  const tickFailed = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const updated = { ...j, failed: j.failed + 1 }
      if (updated.done + updated.failed >= updated.total) {
        timers.current[jobId] = setTimeout(() => removeJob(jobId), 4000)
      }
      return updated
    }))
  }, [removeJob])

  return (
    <UploadContext.Provider value={{ startUpload, tickDone, tickFailed }}>
      {children}

      {/* Global upload banner — fixed bottom-right */}
      {jobs.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          {jobs.map(job => {
            const finished = job.done + job.failed >= job.total
            const pct = job.total > 0 ? Math.round(((job.done + job.failed) / job.total) * 100) : 0

            return (
              <div
                key={job.id}
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[260px] max-w-[320px]"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  animation: 'fadeSlideIn 0.3s ease forwards',
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: finished ? 'rgba(42,155,104,0.12)' : 'rgba(196,164,124,0.12)' }}
                >
                  {finished
                    ? <CheckCircle className="w-4.5 h-4.5" style={{ color: '#2A9B68' }} />
                    : <Upload className="w-4 h-4 animate-bounce" style={{ color: 'var(--accent)' }} />
                  }
                </div>

                {/* Text + bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {finished
                      ? `✓ Upload abgeschlossen`
                      : `${job.done}/${job.total} Fotos hochladen...`
                    }
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {job.label}
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

                {/* Close */}
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
