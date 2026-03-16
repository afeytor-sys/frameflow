'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, Check, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  initialPassword: string | null
}

export default function PortalPasswordInline({ projectId, initialPassword }: Props) {
  const [password, setPassword] = useState(initialPassword ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const startEdit = () => {
    setDraft(password)
    setEditing(true)
    setShowPw(false)
  }

  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('projects')
      .update({ portal_password: draft.trim() || null })
      .eq('id', projectId)
    setSaving(false)
    if (error) { toast.error('Fehler beim Speichern'); return }
    setPassword(draft.trim())
    setEditing(false)
    toast.success(draft.trim() ? 'Passwort gespeichert!' : 'Passwort entfernt')
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
    >
      {/* Icon */}
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: password ? 'rgba(139,92,246,0.12)' : 'var(--bg-hover)' }}
      >
        <Lock className="w-3.5 h-3.5" style={{ color: password ? '#8B5CF6' : 'var(--text-muted)' }} />
      </div>

      {/* Label */}
      <span className="text-[12px] font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        Portal-Passwort
      </span>

      {editing ? (
        /* Edit mode */
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <input
              type={showPw ? 'text' : 'password'}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
              placeholder="Passwort eingeben..."
              autoFocus
              className="input-base w-full py-1.5 text-[12.5px] pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white disabled:opacity-50"
            style={{ background: '#8B5CF6' }}
            title="Speichern"
          >
            {saving
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Check className="w-3.5 h-3.5" />
            }
          </button>
          <button
            onClick={cancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            title="Abbrechen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Display mode */
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {password ? (
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(139,92,246,0.10)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.20)' }}
            >
              🔒 {password}
            </span>
          ) : (
            <span className="text-[12px]" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Kein Passwort
            </span>
          )}
          <button
            onClick={startEdit}
            className="w-6 h-6 rounded flex items-center justify-center ml-auto flex-shrink-0 transition-all hover:opacity-80"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            title="Passwort bearbeiten"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
