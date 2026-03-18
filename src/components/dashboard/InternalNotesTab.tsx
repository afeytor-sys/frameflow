'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StickyNote, Save, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'

interface Props {
  projectId: string
  initialNotes: string | null
}

export default function InternalNotesTab({ projectId, initialNotes }: Props) {
  const locale = useLocale()
  const isDE = locale === 'de'
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const supabase = createClient()

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('projects')
      .update({ internal_notes: notes.trim() || null })
      .eq('id', projectId)
    setSaving(false)
    if (error) {
      toast.error(isDE ? 'Fehler beim Speichern' : 'Failed to save')
    } else {
      setLastSaved(new Date())
      toast.success(isDE ? 'Notizen gespeichert' : 'Notes saved')
    }
  }

  // Auto-save on Ctrl+S / Cmd+S
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)' }}>
            <StickyNote className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isDE ? 'Interne Notizen' : 'Internal Notes'}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Lock className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {isDE ? 'Nur für dich sichtbar — Kunden sehen das nicht' : 'Only visible to you — clients cannot see this'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {isDE ? `Gespeichert ${lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : `Saved ${lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
          >
            <Save className="w-3 h-3" />
            {saving ? (isDE ? 'Speichern...' : 'Saving...') : (isDE ? 'Speichern' : 'Save')}
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isDE
          ? 'Notizen, Ideen, Erinnerungen... (Strg+S zum Speichern)\n\nz.B.:\n• Kunde bevorzugt natürliches Licht\n• Haustier kommt mit zum Shooting\n• Besondere Wünsche: Sonnenuntergang-Fotos'
          : 'Notes, ideas, reminders... (Ctrl+S to save)\n\nE.g.:\n• Client prefers natural light\n• Pet is joining the shoot\n• Special requests: sunset photos'
        }
        rows={12}
        className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          lineHeight: '1.7',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = '#F59E0B40' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-color)' }}
      />

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {isDE ? '💡 Tipp: Strg+S (oder ⌘+S) zum schnellen Speichern' : '💡 Tip: Ctrl+S (or ⌘+S) to save quickly'}
      </p>
    </div>
  )
}
