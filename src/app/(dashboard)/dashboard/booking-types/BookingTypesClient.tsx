'use client'

import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, Euro, ExternalLink, Trash2, Edit2, ToggleLeft, ToggleRight, Video, Users, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateSlug } from '@/lib/bookingSlots'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecurringAvailability {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
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
  availability_type: 'recurring' | 'slots'
  buffer_minutes: number
  max_advance_days: number
  min_notice_hours: number
  questions: Question[]
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

  const photographerSlug = photographer.slug ?? ''
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fotonizer.com'

  const openCreate = () => {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setRecurringAvailability(DEFAULT_RECURRING)
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
      price: bt.price,
      currency: bt.currency,
      availability_type: bt.availability_type,
      buffer_minutes: bt.buffer_minutes,
      max_advance_days: bt.max_advance_days,
      min_notice_hours: bt.min_notice_hours,
      questions: bt.questions ?? [],
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
        price: Math.round((form.price as unknown as number) * 100),  // convert euros to cents
        recurring_availability: form.availability_type === 'recurring' ? recurringAvailability : [],
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

  // Display price: form.price is in euros for display, convert to cents on save
  const displayPrice = typeof form.price === 'number' ? form.price / 100 : 0

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
          style={{ background: 'var(--text-primary)', color: '#fff' }}
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
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold" style={{ background: 'var(--text-primary)', color: '#fff' }}>
            <Plus className="w-4 h-4" /> Neuer Typ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookingTypes.map(bt => (
            <div
              key={bt.id}
              className="rounded-2xl p-5"
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${bt.active ? 'var(--card-border)' : 'var(--border-color)'}`,
                opacity: bt.active ? 1 : 0.6,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{bt.title}</h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: bt.active ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover)', color: bt.active ? '#10B981' : 'var(--text-muted)' }}
                    >
                      {bt.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  {bt.description && (
                    <p className="text-[13px] mb-2" style={{ color: 'var(--text-muted)' }}>{bt.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      <Clock className="w-3.5 h-3.5" />{bt.duration_minutes} Min.
                    </span>
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      {LOCATION_ICONS[bt.location_type]}{LOCATION_LABELS[bt.location_type]}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--accent, #C9A96E)' }}>
                      <Euro className="w-3.5 h-3.5" />{formatPrice(bt.price)}
                    </span>
                    {bt.anzahlung_enabled && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
                        Anzahlung
                      </span>
                    )}
                  </div>

                  {/* Public link */}
                  {photographerSlug && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[11px] font-mono truncate max-w-[280px]" style={{ color: 'var(--text-muted)' }}>
                        /b/{photographerSlug}/{bt.slug}
                      </span>
                      <button
                        onClick={() => copyLink(bt.slug)}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                      >
                        {copiedSlug === bt.slug ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedSlug === bt.slug ? 'Kopiert' : 'Kopieren'}
                      </button>
                      <a
                        href={`/b/${photographerSlug}/${bt.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] px-2 py-0.5 rounded-lg"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(bt)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title={bt.active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {bt.active
                      ? <ToggleRight className="w-5 h-5" style={{ color: '#10B981' }} />
                      : <ToggleLeft className="w-5 h-5" />
                    }
                  </button>
                  <button onClick={() => openEdit(bt)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(bt.id)} className="p-2 rounded-lg transition-colors" style={{ color: '#EF4444' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
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
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
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
                        type="number" min="15" step="15"
                        className="w-full px-3 py-2 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={form.duration_minutes}
                        onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Preis (€)</label>
                      <input
                        type="number" min="0" step="0.01"
                        className="w-full px-3 py-2 rounded-xl text-[14px]"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        value={displayPrice}
                        onChange={e => setForm(f => ({ ...f, price: Math.round(parseFloat(e.target.value || '0') * 100) }))}
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
                            background: form.location_type === loc ? 'var(--text-primary)' : 'var(--bg-hover)',
                            color: form.location_type === loc ? '#fff' : 'var(--text-muted)',
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
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Lege fest, an welchen Wochentagen und Uhrzeiten Buchungen möglich sind.
                  </p>
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                      const window = recurringAvailability.find(w => w.day_of_week === dow)
                      const isActive = !!window
                      return (
                        <div key={dow} className="flex items-center gap-3">
                          <button
                            onClick={() => toggleRecurringDay(dow)}
                            className="w-10 text-[12px] font-bold rounded-lg py-1.5 flex-shrink-0 transition-all"
                            style={{
                              background: isActive ? 'var(--text-primary)' : 'var(--bg-hover)',
                              color: isActive ? '#fff' : 'var(--text-muted)',
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
                        {q.type === 'dropdown' && (
                          <input
                            className="w-full px-2.5 py-1.5 rounded-lg text-[12px]"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            placeholder="Optionen, kommagetrennt: Option A, Option B, ..."
                            value={(q.options ?? []).join(', ')}
                            onChange={e => updateQuestion(i, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
                          />
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
                              background: form.anzahlung_type === t ? 'var(--text-primary)' : 'var(--bg-hover)',
                              color: form.anzahlung_type === t ? 'var(--bg-page)' : 'var(--text-muted)',
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
                            type="number" min="0"
                            className="w-full px-3 py-2 rounded-xl text-[14px]"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={form.anzahlung_type === 'percent'
                              ? (form.anzahlung_amount ?? 0) / 100
                              : (form.anzahlung_amount ?? 0) / 100
                            }
                            onChange={e => {
                              const v = parseFloat(e.target.value || '0')
                              setForm(f => ({
                                ...f,
                                anzahlung_amount: form.anzahlung_type === 'percent'
                                  ? Math.round(v * 100)   // store as basis points (30% → 3000)
                                  : Math.round(v * 100),   // store as cents
                              }))
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Zahlungsfrist (Tage vor Shooting)</label>
                          <input
                            type="number" min="1"
                            className="w-full px-3 py-2 rounded-xl text-[14px]"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            value={form.anzahlung_days_due ?? 14}
                            onChange={e => setForm(f => ({ ...f, anzahlung_days_due: Number(e.target.value) }))}
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
                style={{ background: 'var(--text-primary)', color: '#fff' }}
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
