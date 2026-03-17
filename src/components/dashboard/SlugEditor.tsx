'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, Check, X, Pencil, Copy, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  currentSlug: string | null
  clientToken: string
  baseUrl: string
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export default function SlugEditor({ projectId, currentSlug, clientToken, baseUrl }: Props) {
  const [slug, setSlug] = useState(currentSlug ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(currentSlug ?? '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const activeUrl = slug
    ? `${baseUrl}/client/${slug}`
    : `${baseUrl}/client/${clientToken}`

  const handleSave = async () => {
    const cleaned = toSlug(draft)
    if (!cleaned) {
      // Clear slug
      const { error } = await supabase
        .from('projects')
        .update({ custom_slug: null })
        .eq('id', projectId)
      if (error) { toast.error('Fehler beim Speichern'); return }
      setSlug('')
      setEditing(false)
      toast.success('Slug entfernt')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('projects')
      .update({ custom_slug: cleaned })
      .eq('id', projectId)

    if (error) {
      if (error.code === '23505') {
        toast.error('This slug is already taken — please choose another one')
      } else {
        toast.error('Fehler beim Speichern')
      }
      setSaving(false)
      return
    }

    setSlug(cleaned)
    setDraft(cleaned)
    setEditing(false)
    setSaving(false)
    toast.success('Link aktualisiert!')
  }

  const copyLink = async () => {
    const ok = await navigator.clipboard.writeText(activeUrl).then(() => true).catch(() => false)
    if (ok) toast.success('Link kopiert!')
    else toast.error('Kopieren fehlgeschlagen')
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Kunden-Portal Link</p>
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              {/* Input row */}
              <div className="flex items-center rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--accent)', background: 'var(--bg-hover)' }}>
                <span className="flex-shrink-0 px-3 text-[12px] select-none whitespace-nowrap"
                  style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>
                  {baseUrl}/client/
                </span>
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => setDraft(toSlug(e.target.value))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                  placeholder="chantal-sara-2026"
                  className="flex-1 px-3 py-2 bg-transparent text-[13px] outline-none font-mono"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              {/* Preview */}
              {draft && (
                <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                  → {baseUrl}/client/{draft}
                </p>
              )}
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving
                    ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Check className="w-3 h-3" />Speichern</>
                  }
                </button>
                <button
                  onClick={() => { setDraft(slug); setEditing(false) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                >
                  <X className="w-3 h-3" />
                  Abbrechen
                </button>
                {slug && (
                  <button
                    onClick={() => { setDraft(''); handleSave() }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ml-auto"
                    style={{ color: '#C43B2C' }}
                  >
                    Slug entfernen
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm font-mono truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {activeUrl}
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => { setDraft(slug); setEditing(true) }}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              title="Link anpassen"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={copyLink}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              title="Link kopieren"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              title="Open portal"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
