'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Link2, Image, ExternalLink, Loader2, Upload } from 'lucide-react'

interface MoodBoardItem {
  id: string
  type: 'image' | 'link'
  url: string
  caption: string | null
  display_order: number
}

interface Props {
  projectId: string
  token: string
}

type Tab = 'photo' | 'link'

export default function MoodBoard({ projectId, token }: Props) {
  const [items, setItems] = useState<MoodBoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState<Tab>('photo')

  // Link tab state
  const [inputUrl, setInputUrl] = useState('')
  const [inputCaption, setInputCaption] = useState('')
  const [submittingLink, setSubmittingLink] = useState(false)

  // Photo tab state
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [previews, setPreviews] = useState<{ file: File; objectUrl: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_PHOTOS = 15

  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/moodboard?project_id=${projectId}&token=${token}`)
      if (res.ok) setItems(await res.json())
      setLoading(false)
    }
    load()
  }, [projectId, token])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach(p => URL.revokeObjectURL(p.objectUrl)) }
  }, [previews])

  const isImageUrl = (url: string) =>
    /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url) ||
    url.includes('unsplash.com') ||
    url.includes('images.') ||
    url.includes('/photo/')

  // ── Link submit ────────────────────────────────────────────────────────────
  const submitLink = async () => {
    if (!inputUrl.trim() || submittingLink) return
    setSubmittingLink(true)
    const type = isImageUrl(inputUrl) ? 'image' : 'link'
    const res = await fetch('/api/moodboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        token,
        type,
        url: inputUrl.trim(),
        caption: inputCaption.trim() || null,
      }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [...prev, newItem])
      setInputUrl('')
      setInputCaption('')
      setShowAdd(false)
    }
    setSubmittingLink(false)
  }

  // ── Photo upload ────────────────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | File[]) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPreviews(prev => {
      const remaining = MAX_PHOTOS - prev.length
      const toAdd = images.slice(0, remaining).map(file => ({ file, objectUrl: URL.createObjectURL(file) }))
      return [...prev, ...toAdd]
    })
  }, [])

  const removePreview = (idx: number) => {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx].objectUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const uploadPhotos = async () => {
    if (!previews.length || uploading) return
    setUploading(true)
    setUploadProgress({ done: 0, total: previews.length })
    const uploaded: MoodBoardItem[] = []

    for (let i = 0; i < previews.length; i++) {
      const { file, objectUrl } = previews[i]
      try {
        const presignRes = await fetch('/api/moodboard/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, token, filename: file.name, contentType: file.type }),
        })
        if (!presignRes.ok) continue
        const { presignedUrl, publicUrl } = await presignRes.json()

        const putRes = await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        if (!putRes.ok) continue

        const saveRes = await fetch('/api/moodboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, token, type: 'image', url: publicUrl, caption: null }),
        })
        if (saveRes.ok) uploaded.push(await saveRes.json())
      } catch (err) {
        console.error('[moodboard upload]', err)
      }
      URL.revokeObjectURL(objectUrl)
      setUploadProgress({ done: i + 1, total: previews.length })
    }

    setItems(prev => [...prev, ...uploaded])
    setPreviews([])
    setUploadProgress(null)
    setShowAdd(false)
    setUploading(false)
  }

  const resetForm = () => {
    setShowAdd(false)
    setInputUrl('')
    setInputCaption('')
    previews.forEach(p => URL.revokeObjectURL(p.objectUrl))
    setPreviews([])
  }

  if (loading) return null

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#0D0D0C] text-[14px]">Moodboard</h3>
          <p className="text-[12px] text-[#A8A49E] mt-0.5">
            Teile Inspirationen, Referenzbilder oder Links mit deinem Fotografen
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white rounded-xl text-[12px] font-semibold hover:opacity-85 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 bg-white rounded-xl border border-[#E2DED8] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#E2DED8]">
            {(['photo', 'link'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors"
                style={{
                  color: tab === t ? '#111827' : '#A8A49E',
                  borderBottom: tab === t ? '2px solid #111827' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {t === 'photo' ? <><Upload className="w-3.5 h-3.5" />Foto hochladen</> : <><Link2 className="w-3.5 h-3.5" />Link einfügen</>}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            {tab === 'photo' ? (
              <>
                {/* Drop zone — always visible so more files can be added */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
                  style={{ borderColor: dragOver ? '#C4A47C' : '#E2DED8', background: dragOver ? 'rgba(196,164,124,0.05)' : '#FAFAF9' }}
                >
                  <Upload className="w-5 h-5 mx-auto mb-1.5 text-[#C4C0BA]" />
                  <p className="text-[12.5px] font-medium text-[#6E6A63]">Fotos hierher ziehen</p>
                  <p className="text-[11px] text-[#A8A49E] mt-0.5">oder klicken · bis zu {MAX_PHOTOS} Fotos</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
                  />
                </div>

                {/* Preview grid */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {previews.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#F0EEE9]">
                        <img src={p.objectUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePreview(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                {uploadProgress && (
                  <div>
                    <div className="flex justify-between text-[11px] text-[#A8A49E] mb-1">
                      <span>Hochladen…</span>
                      <span>{uploadProgress.done}/{uploadProgress.total}</span>
                    </div>
                    <div className="h-1.5 bg-[#F0EEE9] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#111827] rounded-full transition-all"
                        style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={uploadPhotos}
                    disabled={!previews.length || uploading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white rounded-xl text-[12.5px] font-semibold hover:opacity-85 disabled:opacity-40 transition-all"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Hochladen…' : `${previews.length} Foto${previews.length !== 1 ? 's' : ''} hochladen`}
                  </button>
                  <button onClick={resetForm} className="px-4 py-2 text-[12.5px] text-[#A8A49E] hover:text-[#0D0D0C] transition-colors">
                    Abbrechen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11.5px] font-medium text-[#6E6A63] mb-1">URL (Bild oder Link)</label>
                  <input
                    value={inputUrl}
                    onChange={e => setInputUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-[13px] border border-[#E2DED8] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-[#6E6A63] mb-1">Beschreibung (optional)</label>
                  <input
                    value={inputCaption}
                    onChange={e => setInputCaption(e.target.value)}
                    placeholder="z.B. Lichtidee, Pose, Farbe..."
                    className="w-full px-3 py-2 text-[13px] border border-[#E2DED8] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/10 transition-all"
                    maxLength={200}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitLink}
                    disabled={!inputUrl.trim() || submittingLink}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white rounded-xl text-[12.5px] font-semibold hover:opacity-85 disabled:opacity-40 transition-all"
                  >
                    {submittingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Speichern
                  </button>
                  <button onClick={resetForm} className="px-4 py-2 text-[12.5px] text-[#A8A49E] hover:text-[#0D0D0C] transition-colors">
                    Abbrechen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Items grid */}
      {items.length === 0 && !showAdd ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-[#E2DED8]">
          <div className="w-10 h-10 rounded-full bg-[#F0EEE9] flex items-center justify-center mx-auto mb-3">
            <Image className="w-4 h-4 text-[#C4C0BA]" />
          </div>
          <p className="text-[13px] text-[#A8A49E]">Noch keine Inspirationen</p>
          <p className="text-[11.5px] text-[#C4C0BA] mt-1">Lade Fotos hoch oder füge Links ein</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 text-[12px] font-semibold text-[#C4A47C] hover:text-[#A8845C] transition-colors"
          >
            + Erste Inspiration hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(item => (
            <div key={item.id} className="group relative">
              {item.type === 'image' ? (
                <button
                  onClick={() => setLightbox(item.url)}
                  className="w-full aspect-square rounded-xl overflow-hidden bg-[#F0EEE9] block"
                >
                  <img
                    src={item.url}
                    alt={item.caption || 'Moodboard'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </button>
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center aspect-square rounded-xl bg-[#F7F7F5] border border-[#E2DED8] hover:border-[#C4C0BA] transition-colors p-4 text-center"
                >
                  <Link2 className="w-5 h-5 text-[#C4C0BA] mb-2" />
                  <p className="text-[11px] text-[#6E6A63] break-all line-clamp-3">{item.url}</p>
                  <ExternalLink className="w-3 h-3 text-[#C4C0BA] mt-2" />
                </a>
              )}
              {item.caption && (
                <p className="text-[11px] text-[#6E6A63] mt-1.5 px-0.5 truncate">{item.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={lightbox}
            alt="Moodboard"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
