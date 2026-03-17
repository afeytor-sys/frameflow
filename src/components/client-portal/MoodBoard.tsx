'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Link2, Image, ExternalLink, Loader2 } from 'lucide-react'

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
    url.includes('unsplash.com') ||
    url.includes('images.') ||
    url.includes('/photo/')

  const submit = async () => {
    if (!inputUrl.trim() || submitting) return
    setSubmitting(true)
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
    setSubmitting(false)
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
        <div className="mb-4 p-4 bg-white rounded-xl border border-[#E2DED8] space-y-3">
          <div>
            <label className="block text-[11.5px] font-medium text-[#6E6A63] mb-1">
              URL (Bild oder Link)
            </label>
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-[13px] border border-[#E2DED8] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-[#6E6A63] mb-1">
              Beschreibung (optional)
            </label>
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
              onClick={submit}
              disabled={!inputUrl.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white rounded-xl text-[12.5px] font-semibold hover:opacity-85 disabled:opacity-40 transition-all"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Speichern
            </button>
            <button
              onClick={() => { setShowAdd(false); setInputUrl(''); setInputCaption('') }}
              className="px-4 py-2 text-[12.5px] text-[#A8A49E] hover:text-[#0D0D0C] transition-colors"
            >
              Abbrechen
            </button>
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
          <p className="text-[11.5px] text-[#C4C0BA] mt-1">Add images or links that show your style</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 text-[12px] font-semibold text-[#C4A47C] hover:text-[#A8845C] transition-colors"
          >
            + Add first inspiration
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
