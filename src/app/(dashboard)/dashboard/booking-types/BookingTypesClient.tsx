'use client'

import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, Euro, ExternalLink, Trash2, Edit2, ToggleLeft, ToggleRight, Video, Users, Copy, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateSlug } from '@/lib/bookingSlots'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecurringAvailability {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface SpecificSlotEntry {
  date: string
  times: string[]
}

interface BookingType {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  location_type: 'studio' | 'external' | 'online'
  price: number
  currency: string
  availability_type: 'recurring' | 'slots' | 'request'
  buffer_minutes: number
  max_advance_days: number
  min_notice_hours: number
  questions: Question[]
  specific_slots: SpecificSlotEntry[]
  anzahlung_enabled: boolean
  anzahlung_type: 'fixed' | 'percent' | null
  anzahlung_amount: number | null
  anzahlung_days_due: number | null
  active: boolean
  booking_recurring_availability: RecurringAvailability[]
}

interface Question {
  id: string
  label: string
  type: 'text' | 'textarea' | 'dropdown' | 'checkbox'
  options?: string[]
  required: boolean
}

interface Photographer {
  id: string
  slug: string | null
  email: string
  full_name: string | null
  studio_name: string | null
  bank_account_holder: string | null
  bank_iban: string | null
  bank_bic: string | null
  plan: string
  google_calendar_refresh_token: string | null
}

interface Props {
  photographer: Photographer
  initialBookingTypes: BookingType[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const LOCATION_LABELS: Record<string, string> = {
  studio: 'Studio',
  external: 'Outdoor / Extern',
  online: 'Online (Google Meet)',
}

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  studio: <MapPin className="w-3.5 h-3.5" />,
  external: <MapPin className="w-3.5 h-3.5" />,
  online: <Video className="w-3.5 h-3.5" />,
}

const DEFAULT_FORM: Omit<BookingType, 'id' | 'booking_recurring_availability'> = {
  slug: '',
  title: '',
  description: '',
  duration_minutes: 60,
  location_type: 'external',
  price: 0,
  currency: 'EUR',
  availability_type: 'recurring',
  buffer_minutes: 0,
  max_advance_days: 60,
  min_notice_hours: 24,
  questions: [],
  specific_slots: [],
  anzahlung_enabled: false,
  anzahlung_type: null,
  anzahlung_amount: null,
  anzahlung_days_due: null,
  active: true,
}

const DEFAULT_RECURRING: RecurringAvailability[] = [
  { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '17:00' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookingTypesClient({ photographer, initialBookingTypes }: Props) {
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>(initialBookingTypes)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'availability' | 'questions' | 'deposit'>('basic')

  const [form, setForm] = useState<Omit<BookingType, 'id' | 'booking_recurring_availability'>>(DEFAULT_FORM)
  const [recurringAvailability, setRecurringAvailability] = useState<RecurringAvailability[]>(DEFAULT_RECURRING)
  const [specificSlots, setSpecificSlots] = useState<SpecificSlotEntry[]>([])
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('')
  const [showBulkGen, setShowBulkGen] = useState(false)
  const [bulkDateFrom, setBulkDateFrom] = useState('')
  const [bulkDateTo, setBulkDateTo] = useState('')
  const [bulkDayConfigs, setBulkDayConfigs] = useState<Record<number, { start: string; end: string }>>({})
  const [bulkDuration, setBulkDuration] = useState(60)
  const [bulkGap, setBulkGap] = useState(0)
  // Recurring template — apply one schedule to multiple days at once
  const [showRecurringTemplate, setShowRecurringTemplate] = useState(false)
  const [recurringTemplateStart, setRecurringTemplateStart] = useState('09:00')
  const [recurringTemplateEnd, setRecurringTemplateEnd] = useState('17:00')
  const [recurringTemplateDays, setRecurringTemplateDays] = useState<number[]>([])

  const photographerSlug = photographer.slug ?? ''
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fotonizer.com'

  const openCreate = () => {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setRecurringAvailability(DEFAULT_RECURRING)
    setSpecificSlots([])
    setNewSlotDate('')
    setNewSlotTime('')
    setShowBulkGen(false)
    setBulkDateFrom('')
    setBulkDateTo('')
    setBulkDayConfigs({})
    setShowRecurringTemplate(false)
    setRecurringTemplateDays([])
    setActiveTab('basic')
    setShowModal(true)
  }

  const openEdit = (bt: BookingType) => {
    setEditingId(bt.id)
    setForm({
      slug: bt.slug,
      title: bt.title,
      description: bt.description ?? '',
      duration_minutes: bt.duration_minutes,
      location_type: bt.location_type,
      price: bt.price / 100,
      currency: bt.currency,
      availability_type: bt.availability_type,
      buffer_minutes: bt.buffer_minutes,
      max_advance_days: bt.max_advance_days,
      min_notice_hours: bt.min_notice_hours,
      questions: bt.questions ?? [],
      specific_slots: bt.specific_slots ?? [],
      anzahlung_enabled: bt.anzahlung_enabled,
      anzahlung_type: bt.anzahlung_type,
      anzahlung_amount: bt.anzahlung_amount,
      anzahlung_days_due: bt.anzahlung_days_due,
      active: bt.active,
    })
    setRecurringAvailability(
      bt.booking_recurring_availability.length > 0
        ? bt.booking_recurring_availability
        : DEFAULT_RECURRING,
    )
    setSpecificSlots(bt.specific_slots ?? [])
    setNewSlotDate('')
    setNewSlotTime('')
    setShowBulkGen(false)
    setBulkDateFrom('')
    setBulkDateTo('')
    setBulkDayConfigs({})
    setShowRecurringTemplate(false)
    setRecurringTemplateDays([])
    setActiveTab('basic')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Titel ist erforderlich'); return }
    if (!photographerSlug) { toast.error('Bitte zuerst deinen Booking-Link in den Einstellungen setzen'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        price: Math.round(form.price * 100),  // euros → cents
        recurring_availability: form.availability_type === 'recurring' ? recurringAvailability : [],
        specific_slots: form.availability_type === 'slots' ? specificSlots : [],
      }

      const url = editingId ? `/api/bookings/types/${editingId}` : '/api/bookings/types'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Error')

      const saved = data.bookingType
      // Re-fetch to get with relations
      const refetch = await fetch('/api/bookings/types')
      const refetchData = await refetch.json()
      setBookingTypes(refetchData.bookingTypes ?? bookingTypes)

      toast.success(editingId ? 'Aktualisiert' : 'Booking Type erstellt')
      setShowModal(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Booking Type löschen?')) return
    const res = await fetch(`/api/bookings/types/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBookingTypes(prev => prev.filter(bt => bt.id !== id))
      toast.success('Gelöscht')
    } else {
      toast.error('Fehler beim Löschen')
    }
  }

  const handleToggleActive = async (bt: BookingType) => {
    const res = await fetch(`/api/bookings/types/${bt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !bt.active }),
    })
    if (res.ok) {
      setBookingTypes(prev => prev.map(b => b.id === bt.id ? { ...b, active: !b.active } : b))
    }
  }

  const copyLink = (btSlug: string) => {
    const url = `${baseUrl}/b/${photographerSlug}/${btSlug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(btSlug)
    setTimeout(() => setCopiedSlug(null), 2000)
    toast.success('Link kopiert!')
  }

  const addQuestion = () => {
    const id = `q_${Date.now()}`
    setForm(f => ({
      ...f,
      questions: [...f.questions, { id, label: '', type: 'text', required: false }],
    }))
  }

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setForm(f => ({
      ...f,
      questions: f.questions.map((q, i) => i === idx ? { ...q, ...patch } : q),
    }))
  }

  const removeQuestion = (idx: number) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }))
  }

  const toggleRecurringDay = (dow: number) => {
    const existing = recurringAvailability.find(w => w.day_of_week === dow)
    if (existing) {
      setRecurringAvailability(prev => prev.filter(w => w.day_of_week !== dow))
    } else {
      setRecurringAvailability(prev => [...prev, { day_of_week: dow, start_time: '09:00', end_time: '17:00' }])
    }
  }

  const updateRecurringWindow = (dow: number, field: 'start_time' | 'end_time', value: string) => {
    setRecurringAvailability(prev => prev.map(w => w.day_of_week === dow ? { ...w, [field]: value } : w))
  }

  const formatDateDE = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}.${m}.${y}`
  }

  const addSingleSlot = () => {
    if (!newSlotDate || !newSlotTime) return
    const time = newSlotTime.slice(0, 5)
    setSpecificSlots(prev => {
      const entry = prev.find(e => e.date === newSlotDate)
      if (entry?.times.includes(time)) return prev
      if (entry) return prev.map(e => e.date === newSlotDate ? { ...e, times: [...e.times, time].sort() } : e)
      return [...prev, { date: newSlotDate, times: [time] }]
    })
    // keep time so user can change just the date and add another slot
  }

  const removeSpecificSlot = (date: string, time: string) => {
    setSpecificSlots(prev =>
      prev.map(e => e.date === date ? { ...e, times: e.times.filter(t => t !== time) } : e)
          .filter(e => e.times.length > 0)
    )
  }

  const computeEndTime = (startTime: string, durationMins: number): string => {
    const [h, m] = startTime.split(':').map(Number)
    const total = h * 60 + m + durationMins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const computeBulkTimes = (start: string, end: string, duration: number, gap: number): string[] => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    const step = Math.max(duration + gap, 1)
    const times: string[] = []
    let cur = startMins
    while (cur + duration <= endMins) {
      times.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`)
      cur += step
    }
    return times
  }

  const getDatesInRange = (from: string, to: string, weekdays: number[]): string[] => {
    const dates: string[] = []
    const cursor = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    while (cursor <= end) {
      if (weekdays.length === 0 || weekdays.includes(cursor.getDay())) {
        dates.push(cursor.toISOString().slice(0, 10))
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }

  const toggleBulkDay = (dow: number) => {
    setBulkDayConfigs(prev => {
      if (prev[dow]) {
        const next = { ...prev }
        delete next[dow]
        return next
      }
      // Inherit times from last active day, or default to 10:00–18:00
      const lastConfig = Object.values(prev).at(-1)
      return { ...prev, [dow]: { start: lastConfig?.start ?? '10:00', end: lastConfig?.end ?? '18:00' } }
    })
  }

  const updateBulkDay = (dow: number, field: 'start' | 'end', value: string) => {
    setBulkDayConfigs(prev => ({ ...prev, [dow]: { ...prev[dow], [field]: value } }))
  }

  const handleBulkGenerate = () => {
    const activeDays = Object.entries(bulkDayConfigs)
    if (activeDays.length === 0 || !bulkDateFrom || bulkDuration <= 0) return
    const toDate = bulkDateTo || bulkDateFrom
    let totalAdded = 0
    let dayCount = 0

    setSpecificSlots(prev => {
      const updated = prev.map(e => ({ ...e, times: [...e.times] }))
      for (const [dowStr, config] of activeDays) {
        const matchingDates = getDatesInRange(bulkDateFrom, toDate, [Number(dowStr)])
        const newTimes = computeBulkTimes(config.start, config.end, bulkDuration, bulkGap)
        if (newTimes.length === 0) continue
        for (const date of matchingDates) {
          const entry = updated.find(e => e.date === date)
          if (entry) {
            entry.times = [...new Set([...entry.times, ...newTimes])].sort()
          } else {
            updated.push({ date, times: [...newTimes] })
          }
          totalAdded += newTimes.length
          dayCount++
        }
      }
      return updated
    })

    if (totalAdded === 0) { toast.error('Keine Termine generiert — Zeiträume prüfen'); return }
    toast.success(`${totalAdded} Slots über ${dayCount} Tage hinzugefügt`)
    setBulkDateFrom('')
    setBulkDateTo('')
    setBulkDayConfigs({})
    setShowBulkGen(false)
  }

  const applyRecurringTemplate = () => {
    if (recurringTemplateDays.length === 0) return
    setRecurringAvailability(prev => {
      const existing = new Map(prev.map(w => [w.day_of_week, w]))
      const updated = prev.map(w =>
        recurringTemplateDays.includes(w.day_of_week)
          ? { ...w, start_time: recurringTemplateStart, end_time: recurringTemplateEnd }
          : w
      )
      for (const d of recurringTemplateDays) {
        if (!existing.has(d)) {
          updated.push({ day_of_week: d, start_time: recurringTemplateStart, end_time: recurringTemplateEnd })
        }
      }
      return updated
    })
    toast.success(`Zeiten auf ${recurringTemplateDays.length} Tag${recurringTemplateDays.length !== 1 ? 'e' : ''} angewendet`)
    setRecurringTemplateDays([])
    setShowRecurringTemplate(false)
  }

  // form.price is stored in euros (float); converted to cents only on save

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            Booking Types
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Erstelle Dienstleistungen, die Kunden direkt buchen können
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97]"
          style={{ background: 'var(--accent)', color: '#1A1A18' }}
        >
          <Plus className="w-4 h-4" />
          Neuer Typ
        </button>
      </div>

      {/* No-slug warning */}
      {!photographerSlug && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-[14px] font-medium" style={{ color: '#F59E0B' }}>
            Du hast noch keinen Booking-Link eingerichtet. Gehe zu den{' '}
            <a href="/dashboard/settings?tab=bookings" className="underline">Einstellungen → Bookings</a>{' '}
            um deinen öffentlichen Link festzulegen.
          </span>
        </div>
      )}

      {/* Google Calendar not connected — warn if any active online types exist */}
      {!photographer.google_calendar_refresh_token && bookingTypes.some(bt => bt.active && bt.location_type === 'online') && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <Video className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#6366F1' }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#6366F1' }}>
              Google Calendar nicht verbunden
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#6366F1', opacity: 0.8 }}>
              Du hast aktive Online-Leistungen, aber Google Calendar ist nicht verknüpft.
              Ohne Verbindung werden keine Google Meet Links automatisch generiert.{' '}
              <a href="/dashboard/settings#integrations" className="font-bold underline">
                Jetzt verbinden →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Booking types list */}
      {bookingTypes.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{ border: '2px dashed var(--border-color)' }}
        >
          <Calendar className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="font-semibold text-[15px]" style={{ color: 'var(--text-muted)' }}>Noch keine Booking Types</p>
          <p className="text-[13px] mt-1 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            Erstelle deinen ersten Service-Typ, damit Kunden Termine buchen können.
          </p>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold" style={{ background: 'var(--accent)', color: '#1A1A18' }}>
            <Plus className="w-4 h-4" /> Neuer Typ
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {bookingTypes.map(bt => {
            const accentColor = bt.location_type === 'online' ? '#6366F1' : bt.location_type === 'studio' ? '#C9A96E' : '#10B981'
            return (
              <div
                key={bt.id}
                className="group relative flex items-center rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  opacity: bt.active ? 1 : 0.55,
                }}
              >
                {/* Left accent bar */}
                <div className="w-1 self-stretch flex-shrink-0" style={{ background: bt.active ? accentColor : 'var(--border-color)' }} />

                {/* Main content */}
                <div className="flex-1 min-w-0 flex items-center gap-4 px-4 py-3.5">
                  {/* Title + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[14px] leading-snug truncate" style={{ color: 'var(--text-primary)' }}>{bt.title}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: bt.active ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover)',
                          color: bt.active ? '#10B981' : 'var(--text-muted)',
                        }}
                      >
                        {bt.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                      {bt.anzahlung_enabled && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                          Anzahlung
                        </span>
                      )}
                    </div>

                    {/* Chips row */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        <Clock className="w-3 h-3 flex-shrink-0" />{bt.duration_minutes} Min.
                      </span>
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {LOCATION_ICONS[bt.location_type]}<span>{LOCATION_LABELS[bt.location_type]}</span>
                      </span>
                      {bt.availability_type === 'request' && (
                        <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          · Nur Anfrage
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <span className="text-[15px] font-bold" style={{ color: accentColor }}>
                      {bt.price === 0 ? '—' : formatPrice(bt.price)}
                    </span>
                  </div>

                  {/* Link actions */}
                  {photographerSlug && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => copyLink(bt.slug)}
                        className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: copiedSlug === bt.slug ? '#10B981' : 'var(--text-muted)' }}
                        title="Link kopieren"
                      >
                        {copiedSlug === bt.slug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`/b/${photographerSlug}/${bt.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: 'var(--text-muted)' }}
                        title="Seite öffnen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Actions — always visible, subtle */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(bt)}
                      className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                      title={bt.active ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {bt.active
                        ? <ToggleRight className="w-5 h-5" style={{ color: '#10B981' }} />
                        : <ToggleLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                      }
                    </button>
                    <button
                      onClick={() => openEdit(bt)}
                      className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-muted)' }}
                      title="Bearbeiten"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bt.id)}
                      className="p-2 rounded-xl transition-colors hover:bg-red-50"
                      style={{ color: '#EF4444', opacity: 0.7 }}
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
          >
            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Booking Type bearbeiten' : 'Neuer Booking Type'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[20px] leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
            </div>

            {/* Tab nav */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              {([['basic', 'Allgemein'], ['availability', 'Verfügbarkeit'], ['questions', 'Fragen'], ['deposit', 'Anzahlung']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-[13px] font-semibold transition-colors"
                  style={{
                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Modal body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── Basic tab ── */}
              {activeTab === 'basic' && (
                <>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Titel *</label>
                    <input
                      className="w-full px-3 py-2 rounded-xl text-[14px]"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      value={form.title}
                      onChange={e => {
                        const title = e.target.value
                        setForm(f => ({ ...f, title, slug: editingId ? f.slug : generateSlug(title) }))
                      }}
                      placeholder="z.B. Portrait-Session"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>URL-Slug</label>
                    <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                      <span className="px-3 py-2 text-[12px] flex-shrink-0" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>
                        /b/{photographerSlug || 'dein-slug'}/
                      </span>
                      <input
                        className="flex-1 px-3 py-2 text-[14px] bg-transparent"
                        style={{ color: 'var(--text-primary)' }}
                        value={form.slug}
                        onChange={e => setForm(f => ({ ...f, slug: generateSlug(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Beschreibung</label>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl text-[14px] resize-none"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      rows={3}
                      value={form.description ?? ''}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Kurze Beschreibung für Kunden..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Dauer (Minuten)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full px-3 py-2 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.duration_minutes || ''}
                        placeholder="60"
                        onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Preis (€)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-3 py-2 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.price === 0 ? '' : form.price}
                        placeholder="0"
                        onChange={e => {
                          const raw = e.target.value.replace(',', '.')
                          setForm(f => ({ ...f, price: raw === '' ? 0 : parseFloat(raw) || 0 }))
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Ort</label>
                    <div className="flex gap-2">
                      {(['studio', 'external', 'online'] as const).map(loc => (
                        <button
                          key={loc}
                          onClick={() => setForm(f => ({ ...f, location_type: loc }))}
                          className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all"
                          style={{
                            background: form.location_type === loc ? 'var(--accent)' : 'var(--bg-hover)',
                            color: form.location_type === loc ? '#1A1A18' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {LOCATION_LABELS[loc]}
                        </button>
                      ))}
                    </div>
                  </div>

                </>
              )}

              {/* ── Availability tab ── */}
              {activeTab === 'availability' && (
                <>
                  {/* Mode selector */}
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Buchungsart</label>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        { value: 'recurring', label: 'Wöchentliche Zeiten',  desc: 'Feste Wochentage & Uhrzeiten — Kunden wählen aus verfügbaren Slots' },
                        { value: 'slots',     label: 'Bestimmte Termine',    desc: 'Feste Datum & Uhrzeit — ideal für saisonale oder einmalige Shootings' },
                        { value: 'request',   label: 'Nur Anfrage',          desc: 'Kein Kalender — Kunde sendet eine Anfrage mit Wunschtermin' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, availability_type: opt.value }))}
                          className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                          style={{
                            border: form.availability_type === opt.value
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border-color)',
                            background: form.availability_type === opt.value ? 'rgba(196,164,124,0.08)' : 'transparent',
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border-2 flex items-center justify-center"
                            style={{
                              borderColor: form.availability_type === opt.value ? 'var(--accent)' : 'var(--border-color)',
                            }}
                          >
                            {form.availability_type === opt.value && (
                              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                            )}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buffer between shootings */}
                  {form.availability_type !== 'request' && (
                    <div>
                      <div className="mb-2">
                        <label className="block text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pause zwischen Shootings</label>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Automatisch blockierte Zeit nach jeder Buchung</p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[0, 15, 30, 45, 60].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, buffer_minutes: mins }))}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all"
                            style={{
                              background: form.buffer_minutes === mins ? 'var(--accent)' : 'var(--bg-hover)',
                              color: form.buffer_minutes === mins ? '#1A1A18' : 'var(--text-muted)',
                              border: form.buffer_minutes === mins ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                            }}
                          >
                            {mins === 0 ? 'Keine' : `${mins} min`}
                          </button>
                        ))}
                      </div>
                      {form.buffer_minutes > 0 && (
                        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                          Nach jedem Shooting werden {form.buffer_minutes} Min. automatisch blockiert — der nächste buchbare Slot beginnt frühestens {form.buffer_minutes} Min. nach Shootingend.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Recurring schedule — only shown when mode = recurring */}
                  {form.availability_type === 'recurring' && (
                    <div className="space-y-2 pt-2">
                      {/* Header + template toggle */}
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Verfügbare Wochentage</p>
                        <button
                          type="button"
                          onClick={() => { setShowRecurringTemplate(v => !v); setRecurringTemplateDays([]) }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={{
                            background: showRecurringTemplate ? 'rgba(196,164,124,0.15)' : 'var(--bg-hover)',
                            color: showRecurringTemplate ? 'var(--accent)' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          ⚡ Mehrere Tage einrichten
                        </button>
                      </div>

                      {/* Recurring template — apply same hours to many days at once */}
                      {showRecurringTemplate && (
                        <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'rgba(196,164,124,0.06)', border: '1px solid rgba(196,164,124,0.25)' }}>
                          <p className="text-[11px]" style={{ color: 'var(--accent)', opacity: 0.8 }}>Gleiche Zeiten auf mehrere Tage anwenden</p>
                          <div className="flex items-center gap-2">
                            <input type="time" className="flex-1 px-2.5 py-2 rounded-xl text-[13px]"
                              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                              value={recurringTemplateStart} onChange={e => setRecurringTemplateStart(e.target.value)} />
                            <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>bis</span>
                            <input type="time" className="flex-1 px-2.5 py-2 rounded-xl text-[13px]"
                              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                              value={recurringTemplateEnd} onChange={e => setRecurringTemplateEnd(e.target.value)} />
                          </div>
                          <div className="flex gap-1">
                            {['So','Mo','Di','Mi','Do','Fr','Sa'].map((day, dow) => {
                              const active = recurringTemplateDays.includes(dow)
                              return (
                                <button
                                  key={dow}
                                  type="button"
                                  onClick={() => setRecurringTemplateDays(prev => active ? prev.filter(d => d !== dow) : [...prev, dow])}
                                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                                  style={{
                                    background: active ? 'rgba(196,164,124,0.25)' : 'var(--bg-hover)',
                                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                                    border: active ? '1.5px solid rgba(196,164,124,0.5)' : '1px solid var(--border-color)',
                                  }}
                                >{day}</button>
                              )
                            })}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={applyRecurringTemplate}
                              disabled={recurringTemplateDays.length === 0}
                              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all disabled:opacity-40"
                              style={{ background: 'var(--accent)', color: '#1A1A18' }}
                            >
                              {recurringTemplateDays.length > 0 ? `Auf ${recurringTemplateDays.length} Tag${recurringTemplateDays.length !== 1 ? 'e' : ''} anwenden` : 'Tage auswählen'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowRecurringTemplate(false); setRecurringTemplateDays([]) }}
                              className="px-3 py-2 rounded-xl text-[12px] transition-all"
                              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                            >Abbrechen</button>
                          </div>
                        </div>
                      )}

                      {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                        const window = recurringAvailability.find(w => w.day_of_week === dow)
                        const isActive = !!window
                        return (
                          <div key={dow} className="flex items-center gap-3">
                            <button
                              onClick={() => toggleRecurringDay(dow)}
                              className="w-10 text-[12px] font-bold rounded-lg py-1.5 flex-shrink-0 transition-all"
                              style={{
                                background: isActive ? 'var(--accent)' : 'var(--bg-hover)',
                                color: isActive ? '#1A1A18' : 'var(--text-muted)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {DAYS[dow]}
                            </button>
                            {isActive ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="time"
                                  className="px-2 py-1.5 rounded-lg text-[13px]"
                                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                  value={window.start_time.slice(0, 5)}
                                  onChange={e => updateRecurringWindow(dow, 'start_time', e.target.value)}
                                />
                                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>bis</span>
                                <input
                                  type="time"
                                  className="px-2 py-1.5 rounded-lg text-[13px]"
                                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                  value={window.end_time.slice(0, 5)}
                                  onChange={e => updateRecurringWindow(dow, 'end_time', e.target.value)}
                                />
                              </div>
                            ) : (
                              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Nicht verfügbar</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Specific slots builder */}
                  {form.availability_type === 'slots' && (() => {
                    const totalSlots = specificSlots.reduce((s, e) => s + e.times.length, 0)
                    const flatSlots = specificSlots
                      .flatMap(e => e.times.map(t => ({ date: e.date, time: t })))
                      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                    return (
                      <div className="space-y-4 pt-2">

                        {/* Section header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Termine</p>
                            {totalSlots > 0 && (
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{totalSlots} Termin{totalSlots !== 1 ? 'e' : ''} geplant</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!showBulkGen) {
                                setBulkDuration(form.duration_minutes || 60)
                                setBulkGap(form.buffer_minutes || 0)
                                setBulkDateFrom('')
                                setBulkDateTo('')
                                setBulkDayConfigs({})
                              }
                              setShowBulkGen(v => !v)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
                            style={{
                              background: showBulkGen ? 'rgba(99,102,241,0.12)' : 'var(--bg-hover)',
                              color: showBulkGen ? '#6366F1' : 'var(--text-muted)',
                              border: showBulkGen ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-color)',
                            }}
                          >
                            <span style={{ fontSize: 14 }}>⚡</span> Bulk erstellen
                          </button>
                        </div>

                        {/* Quick add row */}
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            className="px-2.5 py-2 rounded-xl text-[13px] flex-1 min-w-0"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={newSlotDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={e => setNewSlotDate(e.target.value)}
                          />
                          <input
                            type="time"
                            className="px-2.5 py-2 rounded-xl text-[13px] w-28 flex-shrink-0"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={newSlotTime}
                            onChange={e => setNewSlotTime(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSingleSlot()}
                          />
                          <button
                            type="button"
                            onClick={addSingleSlot}
                            disabled={!newSlotDate || !newSlotTime}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all flex-shrink-0 disabled:opacity-40"
                            style={{ background: 'var(--accent)', color: '#1A1A18' }}
                          >
                            + Termin
                          </button>
                        </div>

                        {/* Bulk generator */}
                        {showBulkGen && (() => {
                          const toDate = bulkDateTo || bulkDateFrom
                          const activeDayEntries = ([[1,'Mo'],[2,'Di'],[3,'Mi'],[4,'Do'],[5,'Fr'],[6,'Sa'],[0,'So']] as [number,string][])
                            .filter(([dow]) => bulkDayConfigs[dow])
                          const totalSlots = activeDayEntries.reduce((sum, [dow]) => {
                            const cfg = bulkDayConfigs[dow]
                            if (!cfg || !bulkDateFrom || bulkDuration <= 0) return sum
                            const dates = getDatesInRange(bulkDateFrom, toDate, [dow])
                            const times = computeBulkTimes(cfg.start, cfg.end, bulkDuration, bulkGap)
                            return sum + dates.length * times.length
                          }, 0)
                          const canGenerate = activeDayEntries.length > 0 && !!bulkDateFrom && bulkDuration > 0 && totalSlots > 0
                          return (
                            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
                              <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: '#6366F1' }}>⚡ Bulk-Generator</p>
                              <p className="text-[11px]" style={{ color: '#6366F1', opacity: 0.7 }}>Wähle Zeitraum & Wochentage — jeder Tag bekommt eigene Zeiten</p>

                              {/* Date range */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Von Datum</label>
                                  <input
                                    type="date"
                                    className="w-full px-2.5 py-2 rounded-xl text-[13px]"
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    value={bulkDateFrom}
                                    min={new Date().toISOString().slice(0, 10)}
                                    onChange={e => { setBulkDateFrom(e.target.value); if (!bulkDateTo) setBulkDateTo(e.target.value) }}
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Bis Datum</label>
                                  <input
                                    type="date"
                                    className="w-full px-2.5 py-2 rounded-xl text-[13px]"
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    value={bulkDateTo}
                                    min={bulkDateFrom || new Date().toISOString().slice(0, 10)}
                                    onChange={e => setBulkDateTo(e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Per-day rows */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Wochentage & Zeiten</label>
                                {([[1,'Mo'],[2,'Di'],[3,'Mi'],[4,'Do'],[5,'Fr'],[6,'Sa'],[0,'So']] as [number,string][]).map(([dow, label]) => {
                                  const active = !!bulkDayConfigs[dow]
                                  const cfg = bulkDayConfigs[dow]
                                  const daySlotCount = active && bulkDateFrom && bulkDuration > 0 && cfg
                                    ? computeBulkTimes(cfg.start, cfg.end, bulkDuration, bulkGap).length
                                    : 0
                                  const dayMatchCount = active && bulkDateFrom
                                    ? getDatesInRange(bulkDateFrom, toDate, [dow]).length
                                    : 0
                                  return (
                                    <div key={dow} className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                                      style={{
                                        background: active ? 'rgba(99,102,241,0.08)' : 'var(--bg-hover)',
                                        border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                                      }}>
                                      {/* Day toggle */}
                                      <button
                                        type="button"
                                        onClick={() => toggleBulkDay(dow)}
                                        className="w-8 h-7 rounded-lg text-[11px] font-black flex-shrink-0 transition-all"
                                        style={{
                                          background: active ? '#6366F1' : 'var(--bg-card)',
                                          color: active ? '#FFFFFF' : 'var(--text-muted)',
                                          border: active ? 'none' : '1px solid var(--border-color)',
                                        }}
                                      >{label}</button>

                                      {/* Time inputs — only when active */}
                                      {active && cfg ? (
                                        <>
                                          <input type="time"
                                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[12px]"
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                            value={cfg.start}
                                            onChange={e => updateBulkDay(dow, 'start', e.target.value)}
                                          />
                                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>→</span>
                                          <input type="time"
                                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[12px]"
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                            value={cfg.end}
                                            onChange={e => updateBulkDay(dow, 'end', e.target.value)}
                                          />
                                          {daySlotCount > 0 && dayMatchCount > 0 && (
                                            <span className="text-[11px] font-semibold flex-shrink-0 whitespace-nowrap" style={{ color: '#6366F1' }}>
                                              {daySlotCount}×{dayMatchCount}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[11px] flex-1" style={{ color: 'var(--text-muted)' }}>nicht ausgewählt</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Duration + gap */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Dauer (min)</label>
                                  <input type="number" min={5} max={480}
                                    className="w-full px-2.5 py-2 rounded-xl text-[13px]"
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    value={bulkDuration} onChange={e => setBulkDuration(parseInt(e.target.value) || 0)} />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>Pause (min)</label>
                                  <input type="number" min={0} max={120}
                                    className="w-full px-2.5 py-2 rounded-xl text-[13px]"
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    value={bulkGap} onChange={e => setBulkGap(parseInt(e.target.value) || 0)} />
                                </div>
                              </div>

                              {/* Preview */}
                              {canGenerate && (
                                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(99,102,241,0.08)' }}>
                                  <p className="text-[11px] font-semibold" style={{ color: '#6366F1' }}>
                                    {totalSlots} Termine über {activeDayEntries.reduce((s, [dow]) => s + getDatesInRange(bulkDateFrom, toDate, [dow]).length, 0)} Tage
                                  </p>
                                </div>
                              )}

                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleBulkGenerate}
                                  disabled={!canGenerate}
                                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40"
                                  style={{ background: '#6366F1', color: '#FFFFFF' }}
                                >
                                  {canGenerate ? `${totalSlots} Termine hinzufügen` : 'Slots generieren'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowBulkGen(false)}
                                  className="px-4 py-2.5 rounded-xl text-[13px] transition-all"
                                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Slot list */}
                        {flatSlots.length > 0 ? (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                            {flatSlots.map(({ date, time }, idx) => {
                              const prevDate = idx > 0 ? flatSlots[idx - 1].date : null
                              const isNewDate = date !== prevDate
                              const endTime = computeEndTime(time, form.duration_minutes)
                              return (
                                <div key={`${date}-${time}`}>
                                  {isNewDate && (
                                    <div className="px-4 py-2" style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                      </p>
                                    </div>
                                  )}
                                  <div
                                    className="flex items-center justify-between px-4 py-3"
                                    style={{ borderBottom: idx < flatSlots.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                                      <span className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                        {time} – {endTime}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeSpecificSlot(date, time)}
                                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl py-8 flex flex-col items-center gap-2" style={{ border: '1px dashed var(--border-color)' }}>
                            <Calendar className="w-5 h-5" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Noch keine Termine — füge einzelne Slots hinzu oder nutze den Bulk-Generator</p>
                          </div>
                        )}

                      </div>
                    )
                  })()}

                  {/* Request mode info */}
                  {form.availability_type === 'request' && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <p className="text-[13px]" style={{ color: '#6366F1' }}>
                        Der Kunde sieht kein Kalender. Er füllt ein Formular aus mit Name, E-Mail, Wunschdatum und Wunschort — du erhältst eine Buchungsanfrage per E-Mail.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Questions tab ── */}
              {activeTab === 'questions' && (
                <>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Zusätzliche Fragen, die der Kunde beim Buchen beantworten soll.
                  </p>
                  <div className="space-y-3">
                    {form.questions.map((q, i) => (
                      <div key={q.id} className="rounded-xl p-3 space-y-2" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-[13px]"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            placeholder="Frage..."
                            value={q.label}
                            onChange={e => updateQuestion(i, { label: e.target.value })}
                          />
                          <select
                            className="px-2 py-1.5 rounded-lg text-[12px]"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={q.type}
                            onChange={e => updateQuestion(i, { type: e.target.value as Question['type'] })}
                          >
                            <option value="text">Kurztext</option>
                            <option value="textarea">Langtext</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                          <label className="flex items-center gap-1 text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, { required: e.target.checked })} />
                            Pflicht
                          </label>
                          <button onClick={() => removeQuestion(i)} style={{ color: '#EF4444' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {(q.type === 'dropdown' || q.type === 'checkbox') && (
                          <div className="space-y-1.5 mt-1">
                            {(q.options ?? ['']).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-1.5">
                                <input
                                  className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px]"
                                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                  placeholder={`Option ${oi + 1}`}
                                  value={opt}
                                  onChange={e => {
                                    const next = [...(q.options ?? [])]
                                    next[oi] = e.target.value
                                    updateQuestion(i, { options: next })
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = (q.options ?? []).filter((_, idx) => idx !== oi)
                                    updateQuestion(i, { options: next.length ? next : [''] })
                                  }}
                                  className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-red-50"
                                  style={{ color: '#EF4444', opacity: (q.options ?? []).length <= 1 ? 0.3 : 1 }}
                                  disabled={(q.options ?? []).length <= 1}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateQuestion(i, { options: [...(q.options ?? []), ''] })}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                              style={{ border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}
                            >
                              <Plus className="w-3 h-3" /> Option hinzufügen
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-2 text-[13px] font-semibold px-3 py-2 rounded-xl transition-colors"
                    style={{ border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}
                  >
                    <Plus className="w-4 h-4" /> Frage hinzufügen
                  </button>
                </>
              )}

              {/* ── Deposit tab ── */}
              {activeTab === 'deposit' && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.anzahlung_enabled}
                        onChange={e => setForm(f => ({ ...f, anzahlung_enabled: e.target.checked }))}
                      />
                      <div className="w-10 h-6 rounded-full peer-checked:bg-green-500 bg-gray-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Anzahlung aktivieren</span>
                  </div>

                  {form.anzahlung_enabled && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {(['fixed', 'percent'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setForm(f => ({ ...f, anzahlung_type: t }))}
                            className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
                            style={{
                              background: form.anzahlung_type === t ? 'var(--accent)' : 'var(--bg-hover)',
                              color: form.anzahlung_type === t ? '#1A1A18' : 'var(--text-muted)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {t === 'fixed' ? 'Fixer Betrag (€)' : 'Prozentuell (%)'}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                            {form.anzahlung_type === 'percent' ? 'Prozentsatz (%)' : 'Betrag (€)'}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full px-3 py-2 rounded-xl text-[14px]"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={(form.anzahlung_amount ?? 0) === 0 ? '' : (form.anzahlung_amount ?? 0) / 100}
                            placeholder="0"
                            onChange={e => {
                              const raw = e.target.value.replace(',', '.')
                              const v = parseFloat(raw) || 0
                              setForm(f => ({ ...f, anzahlung_amount: Math.round(v * 100) }))
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Zahlungsfrist (Tage vor Shooting)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full px-3 py-2 rounded-xl text-[14px]"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={form.anzahlung_days_due ?? ''}
                            placeholder="14"
                            onChange={e => setForm(f => ({ ...f, anzahlung_days_due: parseInt(e.target.value) || null }))}
                          />
                        </div>
                      </div>

                      {/* Preview */}
                      {form.price > 0 && form.anzahlung_amount && (
                        <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                          <p className="text-[12px]" style={{ color: '#3B82F6' }}>
                            Vorschau: Bei einem Preis von {formatPrice(form.price)} beträgt die Anzahlung{' '}
                            <strong>
                              {form.anzahlung_type === 'percent'
                                ? formatPrice(Math.round((form.anzahlung_amount / 10000) * form.price))
                                : formatPrice(form.anzahlung_amount)
                              }
                            </strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#1A1A18' }}
              >
                {saving ? 'Wird gespeichert…' : editingId ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
