'use client'

import { useState } from 'react'
import { MessageCircle, Send, X, Trash2 } from 'lucide-react'

interface Comment {
  id: string
  client_name: string
  comment: string
  created_at: string
}

interface Props {
  photoId: string
  projectId: string
  token: string
  clientName: string
  commentsEnabled: boolean
}

export default function PhotoComments({ photoId, projectId, token, clientName, commentsEnabled }: Props) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    if (loaded) return
    const res = await fetch(`/api/photos/${photoId}/comments`)
    if (res.ok) {
      const data = await res.json()
      setComments(data)
      setLoaded(true)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    load()
  }

  const submit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch(`/api/photos/${photoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: clientName, comment: text.trim(), project_id: projectId, token }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setText('')
    }
    setSubmitting(false)
  }

  if (!commentsEnabled) return null

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white transition-colors"
        title="Kommentar hinzufügen"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {comments.length > 0 && <span>{comments.length}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[70vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#9CA3AF]" />
                <h3 className="font-semibold text-[#111827] text-[14px]">Kommentare</h3>
                {comments.length > 0 && (
                  <span className="text-[11px] font-medium px-1.5 py-0.5 bg-[#F3F4F6] text-[#6B7280] rounded-full">
                    {comments.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F1F1EF] text-[#9CA3AF] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {!loaded && (
                <p className="text-[13px] text-[#9CA3AF] text-center py-4">Laden…</p>
              )}
              {loaded && comments.length === 0 && (
                <p className="text-[13px] text-[#9CA3AF] text-center py-6">
                  Noch keine Kommentare. Sei der Erste! 💬
                </p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#C4A47C]/15 flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-[#C4A47C]">
                    {c.client_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-semibold text-[#111827]">{c.client_name}</span>
                      <span className="text-[10.5px] text-[#9CA3AF]">
                        {new Date(c.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 leading-relaxed">{c.comment}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-[#E5E7EB]">
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
                  placeholder="Kommentar schreiben…"
                  className="flex-1 px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#C4A47C] focus:ring-2 focus:ring-[#C4A47C]/10 transition-all"
                  maxLength={500}
                />
                <button
                  onClick={submit}
                  disabled={!text.trim() || submitting}
                  className="w-9 h-9 flex items-center justify-center bg-[#111827] text-white rounded-xl hover:opacity-85 disabled:opacity-40 transition-all flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
