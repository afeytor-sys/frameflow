'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, MapPin, Tag, FileText, Check, Loader2, Clock, Users, Euro, Timer, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'

interface Props {
  projectId: string
  initialData: {
    shoot_date: string | null
    shoot_time: string | null
    location: string | null
    meeting_point: string | null
    project_type: string | null
    notes: string | null
    status: string
    shoot_duration: string | null
    num_persons: number | null
    price: string | null
    custom_type_label: string | null
    custom_type_color: string | null
    custom_status_label: string | null
    custom_status_color: string | null
  }
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const UI = {
  en: {
    shootDateLabel: 'Shooting Date & Time',
    noDate: 'No date set',
    today: 'Today!',
    daysAgo: (n: number) => `${n} day${n !== 1 ? 's' : ''} ago`,
    inDays: (n: number) => `in ${n} day${n !== 1 ? 's' : ''}`,
    appearsInBookings: 'Appears in Bookings & Calendar',
    locationLabel: 'Location',
    noLocation: 'No location set',
    meetingPointLabel: 'Meeting Point (Precise)',
    meetingPointDesc: 'Add a Google Maps link or coordinates — shown to the client as an interactive map.',
    openInMaps: 'Open in Maps',
    shownOnMap: 'Shown as mini-map in client portal',
    durationLabel: 'Duration',
    personsLabel: 'Persons',
    priceLabel: 'Fee',
    shootingTypeLabel: 'Shooting Type',
    statusLabel: 'Status',
    notesLabel: 'Notes',
    notesPlaceholder: 'Internal notes about the booking...',
    customType: 'Custom',
    customTypeTitle: 'Custom Type',
    customStatus: 'Custom',
    customStatusTitle: 'Custom Status',
    preview: 'Preview:',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved!',
    errorSaving: 'Error saving: ',
    successSaved: 'Booking details saved!',
    durationPlaceholder: 'e.g. 2h, 3 hrs',
    personsPlaceholder: 'e.g. 2',
    pricePlaceholder: 'e.g. 1,200 €',
    customTypePlaceholder: 'e.g. Boudoir, Architecture...',
    customStatusPlaceholder: 'e.g. Post-processing, Waiting...',
    locationPlaceholder: 'e.g. Central Park, New York',
    meetingPointPlaceholder: 'e.g. https://maps.google.com/?q=48.1351,11.5820 or 48.1351, 11.5820',
  },
  de: {
    shootDateLabel: 'Shooting-Datum & Uhrzeit',
    noDate: 'Noch kein Datum',
    today: 'Heute!',
    daysAgo: (n: number) => `vor ${n} Tag${n !== 1 ? 'en' : ''}`,
    inDays: (n: number) => `in ${n} Tag${n !== 1 ? 'en' : ''}`,
    appearsInBookings: 'Erscheint in Bookings & Kalender',
    locationLabel: 'Ort / Location',
    noLocation: 'Noch kein Ort',
    meetingPointLabel: 'Treffpunkt (Präzise)',
    meetingPointDesc: 'Google Maps-Link oder Koordinaten hinzufügen — wird dem Kunden als interaktive Karte angezeigt.',
    openInMaps: 'In Maps öffnen',
    shownOnMap: 'Wird als Mini-Karte im Kundenportal angezeigt',
    durationLabel: 'Dauer',
    personsLabel: 'Personen',
    priceLabel: 'Honorar',
    shootingTypeLabel: 'Shooting-Typ',
    statusLabel: 'Status',
    notesLabel: 'Notizen',
    notesPlaceholder: 'Interne Notizen zum Booking...',
    customType: 'Eigener',
    customTypeTitle: 'Eigener Typ',
    customStatus: 'Eigener',
    customStatusTitle: 'Eigener Status',
    preview: 'Vorschau:',
    save: 'Speichern',
    saving: 'Speichern...',
    saved: 'Gespeichert!',
    errorSaving: 'Fehler beim Speichern: ',
    successSaved: 'Booking Details gespeichert!',
    durationPlaceholder: 'z.B. 2h, 3 Std.',
    personsPlaceholder: 'z.B. 2',
    pricePlaceholder: 'z.B. 1.200 €',
    customTypePlaceholder: 'z.B. Boudoir, Architektur...',
    customStatusPlaceholder: 'z.B. Nachbearbeitung, Wartend...',
    locationPlaceholder: 'z.B. Central Park, New York',
    meetingPointPlaceholder: 'z.B. https://maps.google.com/?q=48.1351,11.5820 oder 48.1351, 11.5820',
  },
}

// ─── Project types (bilingual) ────────────────────────────────────────────────
const PROJECT_TYPES_EN = [
  { value: 'wedding',    label: 'Wedding',    emoji: '💍' },
  { value: 'portrait',  label: 'Portrait',   emoji: '🎭' },
  { value: 'family',    label: 'Family',     emoji: '👨‍👩‍👧' },
  { value: 'newborn',   label: 'Newborn',    emoji: '🍼' },
  { value: 'event',     label: 'Event',      emoji: '🎉' },
  { value: 'corporate', label: 'Corporate',  emoji: '💼' },
  { value: 'product',   label: 'Product',    emoji: '📦' },
  { value: 'other',     label: 'Other',      emoji: '✨' },
]

const PROJECT_TYPES_DE = [
  { value: 'wedding',    label: 'Hochzeit',   emoji: '💍' },
  { value: 'portrait',  label: 'Portrait',   emoji: '🎭' },
  { value: 'family',    label: 'Familie',    emoji: '👨‍👩‍👧' },
  { value: 'newborn',   label: 'Newborn',    emoji: '🍼' },
  { value: 'event',     label: 'Event',      emoji: '🎉' },
  { value: 'corporate', label: 'Corporate',  emoji: '💼' },
  { value: 'product',   label: 'Produkt',    emoji: '📦' },
  { value: 'other',     label: 'Sonstiges',  emoji: '✨' },
]

// ─── Status options (bilingual) ───────────────────────────────────────────────
const STATUS_OPTIONS_EN = [
  { value: 'inquiry',   label: 'Inquiry',    color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  { value: 'active',    label: 'Active',     color: '#3DBA6F', bg: 'rgba(61,186,111,0.10)' },
  { value: 'shooting',  label: 'Shooting',   color: '#C4A47C', bg: 'rgba(196,164,124,0.12)' },
  { value: 'editing',   label: 'Editing',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  { value: 'delivered', label: 'Delivered',  color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { value: 'completed', label: 'Completed',  color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
  { value: 'cancelled', label: 'Cancelled',  color: '#C43B2C', bg: 'rgba(196,59,44,0.10)' },
]

const STATUS_OPTIONS_DE = [
  { value: 'inquiry',   label: 'Anfrage',       color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  { value: 'active',    label: 'Aktiv',         color: '#3DBA6F', bg: 'rgba(61,186,111,0.10)' },
  { value: 'shooting',  label: 'Shooting',      color: '#C4A47C', bg: 'rgba(196,164,124,0.12)' },
  { value: 'editing',   label: 'Bearbeitung',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  { value: 'delivered', label: 'Geliefert',     color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { value: 'completed', label: 'Abgeschlossen', color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
  { value: 'cancelled', label: 'Storniert',     color: '#C43B2C', bg: 'rgba(196,59,44,0.10)' },
]

const COLOR_PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#EAB308',
  '#10B981', '#3DBA6F', '#C4A47C', '#64748B', '#C43B2C',
  '#06B6D4', '#84CC16', '#F43F5E', '#A855F7', '#0EA5E9',
]

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / 86400000)
}

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function BookingDetailsTab({ projectId, initialData }: Props) {
  const locale = useLocale()
  const t = UI[locale]
  const PROJECT_TYPES = locale === 'de' ? PROJECT_TYPES_DE : PROJECT_TYPES_EN
  const STATUS_OPTIONS = locale === 'de' ? STATUS_OPTIONS_DE : STATUS_OPTIONS_EN

  const KNOWN_TYPES = PROJECT_TYPES.map(tp => tp.value)
  const initType = initialData.project_type ?? ''
  const isCustomInit = initType !== '' && !KNOWN_TYPES.includes(initType)

  // ── Parse meeting_point: supports legacy string OR JSON array ──────────────
  type MeetingLocation = { label: string; url: string }
  function parseMeetingPoint(raw: string | null): MeetingLocation[] {
    if (!raw) return [{ label: '', url: '' }]
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : [{ label: '', url: '' }]
    } catch {}
    // Legacy plain string → convert to first entry
    return [{ label: '', url: raw }]
  }

  const [shootDate, setShootDate] = useState(initialData.shoot_date?.slice(0, 10) ?? '')
  const [shootTime, setShootTime] = useState(initialData.shoot_time ?? '')
  const [location, setLocation] = useState(initialData.location ?? '')
  const [meetingLocations, setMeetingLocations] = useState<MeetingLocation[]>(() => parseMeetingPoint(initialData.meeting_point))
  const [projectType, setProjectType] = useState(isCustomInit ? 'other' : initType)
  const [customType, setCustomType] = useState(isCustomInit ? initType : '')
  const [notes, setNotes] = useState(initialData.notes ?? '')
  const [status, setStatus] = useState(initialData.status ?? 'inquiry')
  const [duration, setDuration] = useState(initialData.shoot_duration ?? '')
  const [numPersons, setNumPersons] = useState(initialData.num_persons?.toString() ?? '')
  const [price, setPrice] = useState(initialData.price ?? '')

  // Custom type
  const [customTypeLabel, setCustomTypeLabel] = useState(initialData.custom_type_label ?? '')
  const [customTypeColor, setCustomTypeColor] = useState(initialData.custom_type_color ?? '#8B5CF6')
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false)

  // Custom status
  const [customStatusLabel, setCustomStatusLabel] = useState(initialData.custom_status_label ?? '')
  const [customStatusColor, setCustomStatusColor] = useState(initialData.custom_status_color ?? '#3B82F6')
  const [showCustomStatusInput, setShowCustomStatusInput] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()
  const days = shootDate ? daysUntil(shootDate) : null
  const currentStatus = STATUS_OPTIONS.find(s => s.value === status)
  const currentType = PROJECT_TYPES.find(tp => tp.value === projectType)

  // Determine active status display (custom or preset)
  const isCustomStatus = status === '__custom__'
  const activeStatusColor = isCustomStatus ? customStatusColor : (currentStatus?.color ?? 'var(--text-muted)')
  const activeStatusBg = isCustomStatus ? `${customStatusColor}18` : (currentStatus?.bg ?? 'var(--bg-hover)')
  const activeStatusLabel = isCustomStatus ? customStatusLabel : (currentStatus?.label ?? '')

  const handleSave = async () => {
    setSaving(true)
    const finalType = projectType === 'other'
      ? (customType.trim() || 'other')
      : (projectType || null)

    // Serialize meeting locations — filter out empty entries
    const validLocations = meetingLocations.filter(l => l.url.trim())
    const meetingPointJson = validLocations.length > 0 ? JSON.stringify(validLocations) : null

    const { error } = await supabase
      .from('projects')
      .update({
        shoot_date: shootDate || null,
        shoot_time: shootTime || null,
        location: location || null,
        meeting_point: meetingPointJson,
        project_type: finalType,
        notes: notes || null,
        status,
        shoot_duration: duration || null,
        num_persons: numPersons ? parseInt(numPersons) : null,
        price: price || null,
        custom_type_label: customTypeLabel || null,
        custom_type_color: customTypeColor || null,
        custom_status_label: isCustomStatus ? customStatusLabel : null,
        custom_status_color: isCustomStatus ? customStatusColor : null,
      })
      .eq('id', projectId)

    setSaving(false)
    if (error) { toast.error(t.errorSaving + error.message); return }
    setSaved(true)
    toast.success(t.successSaved)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      {/* ── Row 1: Date + Time + Location ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Date + Time card */}
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
              {t.shootDateLabel}
            </span>
          </div>

          {shootDate ? (
            <div className="mb-3">
              <p className="text-[22px] font-black leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {formatDate(shootDate, locale)}{shootTime ? ` · ${shootTime}` : ''}
              </p>
              {days !== null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="w-3 h-3" style={{ color: days <= 7 ? '#F97316' : 'var(--text-muted)' }} />
                  <span className="text-[12px] font-medium" style={{ color: days <= 7 ? '#F97316' : 'var(--text-muted)' }}>
                    {days === 0 ? t.today : days < 0 ? t.daysAgo(Math.abs(days)) : t.inDays(days)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>{t.noDate}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={shootDate}
              onChange={e => setShootDate(e.target.value)}
              className="input-base w-full text-[13px]"
              style={{ colorScheme: 'light dark' }}
            />
            <input
              type="time"
              value={shootTime}
              onChange={e => setShootTime(e.target.value)}
              className="input-base w-full text-[13px]"
              style={{ colorScheme: 'light dark' }}
            />
          </div>
          {shootDate && (
            <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Check className="w-3 h-3" />{t.appearsInBookings}
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
              {t.locationLabel}
            </span>
          </div>

          {location ? (
            <p className="text-[18px] font-black mb-3 leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {location}
            </p>
          ) : (
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>{t.noLocation}</p>
          )}

          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder={t.locationPlaceholder}
            className="input-base w-full text-[13px]"
          />
        </div>
      </div>

      {/* ── Meeting Point card ── */}
      <div
        className="rounded-2xl p-5 transition-all duration-300"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          animation: 'fadeSlideUp 0.35s ease both',
          animationDelay: '90ms',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(236,72,153,0.10)' }}>
            <MapPin className="w-4 h-4" style={{ color: '#EC4899' }} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
            {t.meetingPointLabel}
          </span>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {t.meetingPointDesc}
        </p>

        {/* Dynamic location list */}
        <div className="space-y-2 mb-2">
          {meetingLocations.map((loc, idx) => (
            <div key={idx} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899' }}>
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={loc.label}
                  onChange={e => {
                    const updated = [...meetingLocations]
                    updated[idx] = { ...updated[idx], label: e.target.value }
                    setMeetingLocations(updated)
                  }}
                  placeholder={locale === 'de' ? 'z.B. Getting Ready, Zeremonie, Party...' : 'e.g. Getting Ready, Ceremony, Party...'}
                  className="input-base flex-1 text-[12px]"
                />
                {meetingLocations.length > 1 && (
                  <button
                    onClick={() => setMeetingLocations(meetingLocations.filter((_, i) => i !== idx))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:opacity-70"
                    style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={loc.url}
                  onChange={e => {
                    const updated = [...meetingLocations]
                    updated[idx] = { ...updated[idx], url: e.target.value }
                    setMeetingLocations(updated)
                  }}
                  placeholder={t.meetingPointPlaceholder}
                  className="input-base flex-1 text-[12px]"
                />
                {loc.url && (
                  <a
                    href={loc.url.startsWith('http') ? loc.url : `https://maps.google.com/?q=${encodeURIComponent(loc.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0 transition-all hover:opacity-80"
                    style={{ background: 'rgba(236,72,153,0.10)', color: '#EC4899' }}
                  >
                    <MapPin className="w-3 h-3" />
                    {t.openInMaps}
                  </a>
                )}
              </div>
              {loc.url && (
                <p className="text-[11px] flex items-center gap-1" style={{ color: '#EC4899' }}>
                  <Check className="w-3 h-3" />{t.shownOnMap}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Add location button */}
        <button
          onClick={() => setMeetingLocations([...meetingLocations, { label: '', url: '' }])}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80 w-full justify-center"
          style={{ background: 'rgba(236,72,153,0.08)', color: '#EC4899', border: '1px dashed rgba(236,72,153,0.30)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {locale === 'de' ? '+ Location hinzufügen' : '+ Add location'}
        </button>
      </div>

      {/* ── Row 2: Duration + Persons + Price ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Duration */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '100ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.10)' }}>
              <Timer className="w-4 h-4" style={{ color: '#F97316' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {t.durationLabel}
            </span>
          </div>
          {duration && (
            <p className="text-[18px] font-black mb-2 leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {duration}
            </p>
          )}
          <input
            type="text"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder={t.durationPlaceholder}
            className="input-base w-full text-[13px]"
          />
        </div>

        {/* Persons */}
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
              style={{ background: 'rgba(16,185,129,0.10)' }}>
              <Users className="w-4 h-4" style={{ color: '#10B981' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {t.personsLabel}
            </span>
          </div>
          {numPersons && (
            <p className="text-[18px] font-black mb-2 leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {numPersons}
            </p>
          )}
          <input
            type="number"
            value={numPersons}
            onChange={e => setNumPersons(e.target.value)}
            placeholder={t.personsPlaceholder}
            min="1"
            className="input-base w-full text-[13px]"
          />
        </div>

        {/* Price */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '140ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(196,164,124,0.12)' }}>
              <Euro className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {t.priceLabel}
            </span>
          </div>
          {price && (
            <p className="text-[18px] font-black mb-2 leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {price}
            </p>
          )}
          <input
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder={t.pricePlaceholder}
            className="input-base w-full text-[13px]"
          />
        </div>
      </div>

      {/* ── Row 3: Type + Status ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Shooting type card */}
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
            animation: 'fadeSlideUp 0.35s ease both',
            animationDelay: '160ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.10)' }}>
              <Tag className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {t.shootingTypeLabel}
            </span>
          </div>

          {/* Current type display */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {currentType && projectType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' }}>
                {currentType.emoji} {projectType === 'other' && customType ? customType : currentType.label}
              </span>
            )}
            {customTypeLabel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
                style={{ background: `${customTypeColor}18`, color: customTypeColor, border: `1px solid ${customTypeColor}35` }}>
                ✦ {customTypeLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {PROJECT_TYPES.map(tp => (
              <button
                key={tp.value}
                onClick={() => setProjectType(projectType === tp.value ? '' : tp.value)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: projectType === tp.value ? 'rgba(139,92,246,0.12)' : 'var(--bg-hover)',
                  color: projectType === tp.value ? '#8B5CF6' : 'var(--text-muted)',
                  border: projectType === tp.value ? '1px solid rgba(139,92,246,0.30)' : '1px solid var(--border-color)',
                }}
              >
                {tp.label}
              </button>
            ))}
            {/* Add custom type button */}
            <button
              onClick={() => setShowCustomTypeInput(v => !v)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
              style={{
                background: showCustomTypeInput ? `${customTypeColor}18` : 'var(--bg-hover)',
                color: showCustomTypeInput ? customTypeColor : 'var(--text-muted)',
                border: showCustomTypeInput ? `1px solid ${customTypeColor}35` : '1px solid var(--border-color)',
              }}
            >
              <Plus className="w-3 h-3" />{t.customType}
            </button>
          </div>

          {projectType === 'other' && (
            <input
              type="text"
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder={t.customTypePlaceholder}
              className="input-base w-full mb-2 text-[13px]"
              autoFocus
            />
          )}

          {/* Custom type input with color picker */}
          {showCustomTypeInput && (
            <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.customTypeTitle}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTypeLabel}
                  onChange={e => setCustomTypeLabel(e.target.value)}
                  placeholder={t.customTypePlaceholder}
                  className="input-base flex-1 text-[12px]"
                />
                {customTypeLabel && (
                  <button onClick={() => setCustomTypeLabel('')} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setCustomTypeColor(c)}
                    className="w-6 h-6 rounded-full transition-all hover:scale-110"
                    style={{
                      background: c,
                      outline: customTypeColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      boxShadow: customTypeColor === c ? `0 0 0 1px var(--bg-surface)` : 'none',
                    }}
                  />
                ))}
              </div>
              {customTypeLabel && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.preview}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                    style={{ background: `${customTypeColor}18`, color: customTypeColor, border: `1px solid ${customTypeColor}35` }}>
                    ✦ {customTypeLabel}
                  </span>
                </div>
              )}
            </div>
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
            animationDelay: '200ms',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: activeStatusBg }}>
              <span className="w-3 h-3 rounded-full" style={{ background: activeStatusColor }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {t.statusLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[17px] font-black leading-none" style={{ color: activeStatusColor, letterSpacing: '-0.02em' }}>
              {activeStatusLabel || '—'}
            </span>
          </div>

          {/* Pipeline visual — only for preset statuses */}
          {!isCustomStatus && (
            <div className="flex gap-1 mb-3">
              {STATUS_OPTIONS.filter(s => s.value !== 'cancelled').map((s) => {
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
          )}

          <div className="flex flex-wrap gap-1.5 mb-2">
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
            {/* Custom status button */}
            <button
              onClick={() => { setStatus('__custom__'); setShowCustomStatusInput(v => !v) }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: isCustomStatus ? `${customStatusColor}18` : 'var(--bg-hover)',
                color: isCustomStatus ? customStatusColor : 'var(--text-muted)',
                border: isCustomStatus ? `1px solid ${customStatusColor}35` : '1px solid var(--border-color)',
              }}
            >
              {isCustomStatus && <span className="w-1.5 h-1.5 rounded-full" style={{ background: customStatusColor }} />}
              <Plus className="w-3 h-3" />{t.customStatus}
            </button>
          </div>

          {/* Custom status input with color picker */}
          {(showCustomStatusInput || isCustomStatus) && (
            <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.customStatusTitle}</p>
              <input
                type="text"
                value={customStatusLabel}
                onChange={e => setCustomStatusLabel(e.target.value)}
                placeholder={t.customStatusPlaceholder}
                className="input-base w-full text-[12px]"
                autoFocus={showCustomStatusInput}
              />
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setCustomStatusColor(c)}
                    className="w-6 h-6 rounded-full transition-all hover:scale-110"
                    style={{
                      background: c,
                      outline: customStatusColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      boxShadow: customStatusColor === c ? `0 0 0 1px var(--bg-surface)` : 'none',
                    }}
                  />
                ))}
              </div>
              {customStatusLabel && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.preview}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                    style={{ background: `${customStatusColor}18`, color: customStatusColor, border: `1px solid ${customStatusColor}35` }}>
                    ● {customStatusLabel}
                  </span>
                </div>
              )}
            </div>
          )}
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
            {t.notesLabel}
          </span>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t.notesPlaceholder}
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
            <><Loader2 className="w-4 h-4 animate-spin" />{t.saving}</>
          ) : saved ? (
            <><Check className="w-4 h-4" />{t.saved}</>
          ) : (
            t.save
          )}
        </button>
      </div>
    </div>
  )
}
