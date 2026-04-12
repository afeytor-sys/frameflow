'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, Euro, Video, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingType {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  location_type: 'studio' | 'external' | 'online'
  price: number
  currency: string
  anzahlung_enabled: boolean
  anzahlung_type: 'fixed' | 'percent' | null
  anzahlung_amount: number | null
  anzahlung_days_due: number | null
  questions: Question[]
}

interface Question {
  id: string
  label: string
  type: 'text' | 'textarea' | 'dropdown' | 'checkbox'
  options?: string[]
  required: boolean
}

interface Photographer {
  slug: string
  fullName: string
  studioName: string
  logoUrl: string | null
}

interface Props {
  photographer: Photographer
  bookingType: BookingType & { booking_recurring_availability: unknown[] }
}

interface DaySlots {
  date: string
  slots: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function getDepositAmount(bt: BookingType): number {
  if (!bt.anzahlung_enabled || !bt.anzahlung_amount) return 0
  if (bt.anzahlung_type === 'fixed') return bt.anzahlung_amount
  if (bt.anzahlung_type === 'percent') return Math.round((bt.anzahlung_amount / 10000) * bt.price)
  return 0
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

const LOCATION_LABEL: Record<string, string> = {
  studio: 'Studio',
  external: 'Outdoor / Extern',
  online: 'Online (Google Meet)',
}

// ── Main Component ────────────────────────────────────────────────────────────

type Step = 'calendar' | 'form' | 'submitting'

export default function BookingPageClient({ photographer, bookingType: bt }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('calendar')

  // Calendar state
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [slotsCache, setSlotsCache] = useState<Record<string, DaySlots[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Form state
  const [clientName,  setClientName]  = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')

  const monthStr = monthKey(viewYear, viewMonth)

  const fetchSlots = useCallback(async (mk: string) => {
    if (slotsCache[mk] !== undefined) return
    setLoadingSlots(true)
    try {
      const res = await fetch(
        `/api/bookings/available-slots?photographerSlug=${photographer.slug}&bookingTypeSlug=${bt.slug}&month=${mk}`,
      )
      const data = await res.json()
      setSlotsCache(prev => ({ ...prev, [mk]: data.slots ?? [] }))
    } finally {
      setLoadingSlots(false)
    }
  }, [photographer.slug, bt.slug, slotsCache])

  useEffect(() => {
    fetchSlots(monthStr)
  }, [monthStr, fetchSlots])

  const currentSlots: DaySlots[] = slotsCache[monthStr] ?? []

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const availableDates = new Set(currentSlots.map(d => d.date))

  const prevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1)
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
    setSelectedDate(null); setSelectedTime(null)
  }
  const nextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1)
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
    setSelectedDate(null); setSelectedTime(null)
  }

  const selectDate = (dateStr: string) => {
    if (!availableDates.has(dateStr)) return
    setSelectedDate(dateStr)
    setSelectedTime(null)
  }

  const slotsForSelected = selectedDate
    ? (currentSlots.find(d => d.date === selectedDate)?.slots ?? [])
    : []

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return
    if (!clientName.trim()) { setFormError('Name ist erforderlich'); return }
    if (!clientEmail.trim() || !clientEmail.includes('@')) { setFormError('Gültige E-Mail angeben'); return }
    for (const q of bt.questions.filter(q => q.required)) {
      if (!answers[q.id]?.trim()) { setFormError(`Bitte "${q.label}" ausfüllen`); return }
    }
    setFormError('')
    setStep('submitting')

    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photographerSlug: photographer.slug,
        bookingTypeSlug: bt.slug,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || undefined,
        booked_date: selectedDate,
        booked_time: selectedTime,
        answers,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Fehler beim Buchen')
      setStep('form')
      return
    }

    // Redirect to confirmation page
    router.push(`/b/${photographer.slug}/${bt.slug}/confirm/${data.booking.id}`)
  }

  const depositAmount = getDepositAmount(bt)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F7', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {photographer.logoUrl && (
            <img src={photographer.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
          )}
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#6B7280' }}>
              {photographer.studioName || photographer.fullName}
            </p>
            <h1 className="font-black text-[22px]" style={{ letterSpacing: '-0.03em', color: '#111' }}>
              {bt.title}
            </h1>
          </div>
        </div>

        {/* Service info pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-gray-200 text-gray-700">
            <Clock className="w-3.5 h-3.5" />{bt.duration_minutes} Min.
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-gray-200 text-gray-700">
            {bt.location_type === 'online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
            {LOCATION_LABEL[bt.location_type]}
          </span>
          {bt.price > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-white border border-gray-200" style={{ color: '#C9A96E' }}>
              <Euro className="w-3.5 h-3.5" />{formatPrice(bt.price)}
            </span>
          )}
          {bt.anzahlung_enabled && depositAmount > 0 && (
            <span className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Anzahlung: {formatPrice(depositAmount)}
            </span>
          )}
        </div>

        {bt.description && (
          <p className="text-[14px] text-gray-600 mb-8 leading-relaxed">{bt.description}</p>
        )}

        {/* ── Step: Calendar ── */}
        {step === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Month nav */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <h2 className="font-bold text-[15px] capitalize" style={{ color: '#111' }}>{monthLabel}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-6 pt-3 pb-1">
              {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 px-6 pb-6 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isAvailable = availableDates.has(dateStr)
                const isSelected  = selectedDate === dateStr
                const isPast = new Date(dateStr + 'T00:00:00') < new Date(now.toISOString().slice(0, 10) + 'T00:00:00')

                return (
                  <button
                    key={day}
                    disabled={!isAvailable || isPast}
                    onClick={() => selectDate(dateStr)}
                    className="aspect-square rounded-xl flex items-center justify-center text-[13px] font-semibold transition-all"
                    style={{
                      background: isSelected ? '#1A1A18' : isAvailable && !isPast ? '#F0FDF4' : 'transparent',
                      color: isSelected ? '#fff' : isAvailable && !isPast ? '#10B981' : '#D1D5DB',
                      cursor: isAvailable && !isPast ? 'pointer' : 'default',
                      fontWeight: isAvailable && !isPast ? '700' : '400',
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {loadingSlots && (
              <p className="text-center text-[13px] text-gray-400 pb-4">Lade Verfügbarkeit…</p>
            )}

            {/* Time slots */}
            {selectedDate && slotsForSelected.length > 0 && (
              <div className="px-6 pb-6 space-y-3" style={{ borderTop: '1px solid #F3F4F6', paddingTop: '20px' }}>
                <p className="text-[13px] font-semibold text-gray-600">{formatDate(selectedDate)}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slotsForSelected.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className="py-2.5 rounded-xl text-[13px] font-bold transition-all border"
                      style={{
                        background: selectedTime === slot ? '#1A1A18' : 'white',
                        color: selectedTime === slot ? '#fff' : '#374151',
                        borderColor: selectedTime === slot ? '#1A1A18' : '#E5E7EB',
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {selectedTime && (
                  <div className="pt-2">
                    <button
                      onClick={() => setStep('form')}
                      className="w-full py-3 rounded-xl text-[14px] font-bold transition-all"
                      style={{ background: '#1A1A18', color: '#fff' }}
                    >
                      Weiter — {selectedTime} Uhr →
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedDate && slotsForSelected.length === 0 && !loadingSlots && (
              <div className="px-6 pb-6 pt-4 text-center text-[13px] text-gray-400" style={{ borderTop: '1px solid #F3F4F6' }}>
                Leider keine freien Slots an diesem Tag.
              </div>
            )}
          </div>
        )}

        {/* ── Step: Form ── */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Selected slot summary */}
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
              <button onClick={() => setStep('calendar')} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div>
                <p className="font-bold text-[14px]" style={{ color: '#111' }}>
                  {selectedDate && formatDate(selectedDate)} um {selectedTime} Uhr
                </p>
                <p className="text-[12px] text-gray-500">{bt.title} · {bt.duration_minutes} Min.</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Contact fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1 text-gray-500">Vollständiger Name *</label>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Max Mustermann"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1 text-gray-500">E-Mail *</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="max@beispiel.de"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide mb-1 text-gray-500">Telefon (optional)</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+49 …"
                />
              </div>

              {/* Custom questions */}
              {bt.questions.map(q => (
                <div key={q.id}>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1 text-gray-500">
                    {q.label}{q.required ? ' *' : ''}
                  </label>
                  {q.type === 'textarea' ? (
                    <textarea
                      className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      rows={3}
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    />
                  ) : q.type === 'dropdown' ? (
                    <select
                      className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    >
                      <option value="">Bitte wählen…</option>
                      {(q.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : q.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={answers[q.id] === 'true'}
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.checked ? 'true' : 'false' }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-[14px] text-gray-700">{q.label}</span>
                    </label>
                  ) : (
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              {/* Deposit info box */}
              {bt.anzahlung_enabled && depositAmount > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <p className="text-[13px] font-semibold text-blue-800 mb-1">Anzahlung erforderlich</p>
                  <p className="text-[12px] text-blue-700">
                    Nach dem Absenden erhältst du die Bankdaten mit deinem persönlichen Referenzcode.
                    Bitte überweise die Anzahlung von <strong>{formatPrice(depositAmount)}</strong> innerhalb von{' '}
                    {bt.anzahlung_days_due ?? 14} Tagen.
                  </p>
                </div>
              )}

              {formError && (
                <p className="text-[13px] font-medium text-red-600">{formError}</p>
              )}

              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all"
                style={{ background: '#1A1A18', color: '#fff' }}
              >
                {bt.anzahlung_enabled ? 'Buchung anfragen →' : 'Jetzt buchen →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Submitting ── */}
        {step === 'submitting' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            <p className="font-semibold text-gray-700">Buchung wird erstellt…</p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-8">Powered by Fotonizer</p>
      </div>
    </div>
  )
}
