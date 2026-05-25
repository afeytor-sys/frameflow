'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Link2, ExternalLink, Loader2, Check } from 'lucide-react'

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

export default function MoodBoard({ projectId, token }: Props) {
  const [items, setItems] = useState<MoodBoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [inputUrl, setInputUrl] = useState('')
  const [inputCaption, setInputCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)

  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/moodboard?project_id=${projectId}&token=${token}`)
      if (res.ok) setItems(await res.json())
      setLoading(false)
    }
    load()
  }, [projectId, token])

  const isImageUrl = (url: string) =>
    /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url) ||
    url.includes('unsplash.com') || url.includes('images.') || url.includes('/photo/')

  const submitLink = async () => {
    if (!inputUrl.trim() || submitting) return
    setError('')
    setSubmitting(true)
    try {
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
        setSavedCount(c => c + 1)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Fehler beim Speichern')
      }
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    }
    setSubmitting(false)
  }

  const closeForm = () => {
    setShowAdd(false)
    setInputUrl('')
    setInputCaption('')
    setError('')
    setSavedCount(0)
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
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white rounded-xl text-[12px] font-semibold hover:opacity-85 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Link hinzufügen
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 bg-white rounded-xl border border-[#E2DED8] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2DED8]">
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-[#A8A49E]" />
              <span className="text-[13px] font-semibold text-[#0D0D0C]">Links hinzufügen</span>
            </div>
            <button onClick={closeForm} className="text-[#A8A49E] hover:text-[#0D0D0C] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Saved count feedback */}
            {savedCount > 0 && (
              <div className="flex items-center gap-2 text-[12px] text-[#2A9B68] bg-[#2A9B6810] px-3 py-2 rounded-lg">
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                {savedCount === 1 ? '1 Link gespeichert' : `${savedCount} Links gespeichert`} — füge weitere hinzu oder schließe das Formular
              </div>
            )}

            <div>
              <label className="block text-[11.5px] font-medium text-[#6E6A63] mb-1">URL *</label>
              <input
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitLink() } }}
                placeholder="https://..."
                autoFocus
                className="w-full px-3 py-2 text-[13px] border border-[#E2DED8] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-[#6E6A63] mb-1">Beschreibung (optional)</label>
              <input
                value={inputCaption}
                onChange={e => setInputCaption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitLink() } }}
                placeholder="z.B. Lichtidee, Pose, Farbe..."
                className="w-full px-3 py-2 text-[13px] border border-[#E2DED8] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/10 transition-all"
                maxLength={200}
              />
            </div>

            {error && <p className="text-[12px] text-red-500 px-1">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={submitLink}
                disabled={!inputUrl.trim() || submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white rounded-xl text-[12.5px] font-semibold hover:opacity-85 disabled:opacity-40 transition-all"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {submitting ? 'Speichern…' : 'Link speichern'}
              </button>
              <button onClick={closeForm} className="px-4 py-2 text-[12.5px] text-[#A8A49E] hover:text-[#0D0D0C] transition-colors">
                {savedCount > 0 ? 'Fertig' : 'Abbrechen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items grid */}
      {items.length === 0 && !showAdd ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-[#E2DED8]">
          <div className="w-10 h-10 rounded-full bg-[#F0EEE9] flex items-center justify-center mx-auto mb-3">
            <Link2 className="w-4 h-4 text-[#C4C0BA]" />
          </div>
          <p className="text-[13px] text-[#A8A49E]">Noch keine Inspirationen</p>
          <p className="text-[11.5px] text-[#C4C0BA] mt-1">Füge Links zu Bildern oder Referenzen ein</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 text-[12px] font-semibold text-[#C4A47C] hover:text-[#A8845C] transition-colors"
          >
            + Ersten Link hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#E2DED8] hover:border-[#C4C0BA] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F0EEE9] flex items-center justify-center flex-shrink-0">
                <Link2 className="w-3.5 h-3.5 text-[#C4C0BA]" />
              </div>
              <div className="flex-1 min-w-0">
                {item.caption && (
                  <p className="text-[12.5px] font-medium text-[#0D0D0C] truncate">{item.caption}</p>
                )}
                <p className="text-[11.5px] text-[#A8A49E] truncate">{item.url}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#C4C0BA] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#E2DED8] text-[12px] text-[#A8A49E] hover:text-[#6E6A63] hover:border-[#C4C0BA] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Weiteren Link hinzufügen
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <img src={lightbox} alt="Moodboard" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
