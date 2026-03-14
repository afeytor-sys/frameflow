'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, MapPin, Tag, FileText, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  initialData: {
    shoot_date: string | null
    location: string | null
    project_type: string | null
    notes: string | null
    status: string
  }
}

const PROJECT_TYPES = [
  { value: 'wedding',    label: 'Hochzeit' },
  { value: 'portrait',  label: 'Portrait' },
  { value: 'family',    label: 'Familie' },
  { value: 'newborn',   label: 'Newborn' },
  { value: 'event',     label: 'Event' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'product',   label: 'Produkt' },
  { value: 'other',     label: 'Sonstiges' },
]

const STATUS_OPTIONS = [
  { value: 'inquiry',   label: 'Anfrage',         color: '#3B82F6' },
  { value: 'active',    label: 'Aktiv',           color: '#3DBA6F' },
  { value: 'shooting',  label: 'Shooting',        color: '#C4A47C' },
  { value: 'editing',   label: 'Bearbeitung',     color: '#8B5CF6' },
  { value: 'delivered', label: 'Geliefert',       color: '#10B981' },
  { value: 'completed', label: 'Abgeschlossen',   color: '#64748B' },
  { value: 'cancelled', label: 'Storniert',       color: '#C43B2C' },
]

export default function BookingDetailsTab({ projectId, initialData }: Props) {
  const [shootDate, setShootDate] = useState(initialData.shoot_date?.slice(0, 10) ?? '')
  const [location, setLocation] = useState(initialData.location ?? '')
  const [projectType, setProjectType] = useState(initialData.project_type ?? '')
  const [notes, setNotes] = useState(initialData.notes ?? '')
  const [status, setStatus] = useState(initialData.status ?? 'inquiry')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)

    const { error } = await supabase
      .from('projects')
      .update({
        shoot_date: shootDate || null,
        location: location || null,
        project_type: projectType || null,
        notes: notes || null,
        status,
      })
      .eq('id', projectId)

    setSaving(false)
    if (error) {
      console.error('BookingDetailsTab save error:', error)
      toast.error('Fehler beim Speichern: ' + error.message)
      return
    }
    setSaved(true)
    toast.success('Booking Details gespeichert!')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>Booking Details</h3>
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Shooting-Datum und Details — erscheinen automatisch in Bookings &amp; Kalender
        </p>
      </div>

      {/* Shoot Date */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>
          <CalendarDays className="w-3.5 h-3.5" />
          Shooting-Datum
        </label>
        <input
          type="date"
          value={shootDate}
          onChange={e => setShootDate(e.target.value)}
          className="input-base w-full"
          style={{ colorScheme: 'light dark' }}
        />
        {shootDate && (
          <p className="text-[12px] mt-1.5" style={{ color: 'var(--accent)' }}>
            ✓ Erscheint in Bookings &amp; Kalender
          </p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>
          <MapPin className="w-3.5 h-3.5" />
          Ort / Location
        </label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="z.B. Stadtpark München"
          className="input-base w-full"
        />
      </div>

      {/* Project Type */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>
          <Tag className="w-3.5 h-3.5" />
          Shooting-Typ
        </label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setProjectType(projectType === t.value ? '' : t.value)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: projectType === t.value ? 'var(--bg-active)' : 'var(--bg-hover)',
                color: projectType === t.value ? 'var(--text-on-active)' : 'var(--text-muted)',
                border: projectType === t.value ? '1px solid var(--accent)' : '1px solid var(--border-color)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: status === s.value ? `${s.color}18` : 'var(--bg-hover)',
                color: status === s.value ? s.color : 'var(--text-muted)',
                border: status === s.value ? `1px solid ${s.color}40` : '1px solid var(--border-color)',
              }}
            >
              {status === s.value && <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>
          <FileText className="w-3.5 h-3.5" />
          Notizen
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Interne Notizen zum Booking..."
          rows={4}
          className="input-base w-full resize-none"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: saved ? '#2A9B68' : 'var(--accent)' }}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Speichern...</>
          ) : saved ? (
            <><Check className="w-4 h-4" />Gespeichert!</>
          ) : (
            'Speichern'
          )}
        </button>
      </div>
    </div>
  )
}
