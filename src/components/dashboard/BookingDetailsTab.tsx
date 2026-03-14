'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, MapPin, Tag, FileText, Check, Loader2, Clock } from 'lucide-react'
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
  { value: 'wedding',    label: 'Hochzeit',   emoji: '💍' },
  { value: 'portrait',  label: 'Portrait',   emoji: '🎭' },
  { value: 'family',    label: 'Familie',    emoji: '👨‍👩‍👧' },
  { value: 'newborn',   label: 'Newborn',    emoji: '🍼' },
  { value: 'event',     label: 'Event',      emoji: '🎉' },
  { value: 'corporate', label: 'Corporate',  emoji: '💼' },
  { value: 'product',   label: 'Produkt',    emoji: '📦' },
  { value: 'other',     label: 'Sonstiges',  emoji: '✨' },
]

const STATUS_OPTIONS = [
  { value: 'inquiry',   label: 'Anfrage',       color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  { value: 'active',    label: 'Aktiv',         color: '#3DBA6F', bg: 'rgba(61,186,111,0.10)' },
  { value: 'shooting',  label: 'Shooting',      color: '#C4A47C', bg: 'rgba(196,164,124,0.12)' },
  { value: 'editing',   label: 'Bearbeitung',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  { value: 'delivered', label: 'Geliefert',     color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { value: 'completed', label: 'Abgeschlossen', color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
  { value: 'cancelled', label: 'Storniert',     color: '#C43B2C', bg: 'rgba(196,59,44,0.10)' },
]

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / 86400000)
}

function formatDateDE(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function BookingDetailsTab({ projectId, initialData }: Props) {
  const KNOWN_TYPES = PROJECT_TYPES.map(t => t.value)
  const initType = initialData.project_type ?? ''
  const isCustomInit = initType !== '' && !KNOWN_TYPES.includes(initType)

  const [shootDate, setShootDate] = useState(initialData.shoot_date?.slice(0, 10) ?? '')
  const [location, setLocation] = useState(initialData.location ?? '')
  const [projectType, setProjectType] = useState(isCustomInit ? 'other' : initType)
  const [customType, setCustomType] = useState(isCustomInit ? initType : '')
  const [notes, setNotes] = useState(initialData.notes ?? '')
  const [status, setStatus] = useState(initialData.status ?? 'inquiry')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()
  const days = shootDate ? daysUntil(shootDate) : null
  const currentStatus = STATUS_OPTIONS.find(s => s.value === status)
  const currentType = PROJECT_TYPES.find(t => t.value === projectType)

  const handleSave = async () => {
    setSaving(true)
    const finalType = projectType === 'other'
      ? (customType.trim() || 'other')
      : (projectType || null)

    const { error } = await supabase
      .from('projects')
      .update({ shoot_date: shootDate || null, location: location || null, project_type: finalType, notes: notes || null, status })
      .eq('id', projectId)

    setSaving(false)
    if (error) { toast.error('Fehler beim Speichern: ' + error.message); return }
    setSaved(true)
    toast.success('Booking Details gespeichert!')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      {/* ── Row 1: Date + Location ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Date card */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '0ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(196,164,124,0.12)' }}>
              <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              Shooting-Datum
            </span>
          </div>

          {shootDate ? (
            <div className="mb-3">
              <p className="text-[22px] font-black leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatDateDE(shootDate)}
              </p>
              {days !== null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="w-3 h-3" style={{ color: days <= 7 ? '#F97316' : 'var(--text-muted)' }} />
                  <span className="text-[12px] font-medium" style={{ color: days <= 7 ? '#F97316' : 'var(--text-muted)' }}>
                    {days === 0 ? 'Heute!' : days < 0 ? `vor ${Math.abs(days)} Tagen` : `in ${days} Tagen`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>Noch kein Datum</p>
          )}

          <input
            type="date"
            value={shootDate}
            onChange={e => setShootDate(e.target.value)}
            className="input-base w-full text-[13px]"
            style={{ colorScheme: 'light dark' }}
          />
          {shootDate && (
            <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Check className="w-3 h-3" />Erscheint in Bookings &amp; Kalender
            </p>
          )}
        </div>

        {/* Location card */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '60ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.10)' }}>
              <MapPin className="w-4 h-4" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              Ort / Location
            </span>
          </div>

          {location ? (
            <p className="text-[18px] font-black mb-3 leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {location}
            </p>
          ) : (
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>Noch kein Ort</p>
          )}

          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="z.B. Stadtpark München"
            className="input-base w-full text-[13px]"
          />
        </div>
      </div>

      {/* ── Row 2: Type + Status ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Shooting type card */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '120ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.10)' }}>
              <Tag className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              Shooting-Typ
            </span>
          </div>

          {currentType && projectType && (
            <p className="text-[17px] font-black mb-3 leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {currentType.emoji} {projectType === 'other' && customType ? customType : currentType.label}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {PROJECT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setProjectType(projectType === t.value ? '' : t.value)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: projectType === t.value ? 'rgba(139,92,246,0.12)' : 'var(--bg-hover)',
                  color: projectType === t.value ? '#8B5CF6' : 'var(--text-muted)',
                  border: projectType === t.value ? '1px solid rgba(139,92,246,0.30)' : '1px solid var(--border-color)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {projectType === 'other' && (
            <input
              type="text"
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder="z.B. Boudoir, Architektur..."
              className="input-base w-full mt-2 text-[13px]"
              autoFocus
            />
          )}
        </div>

        {/* Status card */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '180ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: currentStatus ? currentStatus.bg : 'var(--bg-hover)' }}>
              <span className="w-3 h-3 rounded-full" style={{ background: currentStatus?.color ?? 'var(--text-muted)' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              Status
            </span>
          </div>

          {currentStatus && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[17px] font-black leading-none" style={{ color: currentStatus.color, letterSpacing: '-0.02em' }}>
                {currentStatus.label}
              </span>
            </div>
          )}

          {/* Pipeline visual */}
          <div className="flex gap-1 mb-3">
            {STATUS_OPTIONS.filter(s => s.value !== 'cancelled').map((s, i) => {
              const statusOrder = STATUS_OPTIONS.filter(x => x.value !== 'cancelled').map(x => x.value)
              const currentIdx = statusOrder.indexOf(status)
              const thisIdx = statusOrder.indexOf(s.value)
              const isActive = s.value === status
              const isPast = thisIdx < currentIdx
              return (
                <div key={s.value} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: isActive ? s.color : isPast ? `${s.color}60` : 'var(--border-color)' }} />
              )
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: status === s.value ? s.bg : 'var(--bg-hover)',
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
      </div>

      {/* ── Notes card ── */}
      <div
        className="rounded-2xl p-5 transition-all duration-300"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          animation: 'fadeSlideUp 0.35s ease both',
          animationDelay: '240ms',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)' }}>
            <FileText className="w-4 h-4" style={{ color: '#10B981' }} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
            Notizen
          </span>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Interne Notizen zum Booking..."
          rows={3}
          className="input-base w-full resize-none text-[13px]"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1" style={{ animation: 'fadeSlideUp 0.35s ease both', animationDelay: '300ms' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60 hover:opacity-90"
          style={{ background: saved ? '#2A9B68' : 'var(--accent)', boxShadow: '0 1px 8px rgba(196,164,124,0.25)' }}
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
