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
  availability_type: 'recurring' | 'slots' | 'request'
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

type Step = 'calendar' | 'form' | 'submitting' | 'request' | 'request_done'

export default function BookingPageClient({ photographer, bookingType: bt }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(bt.availability_type === 'request' ? 'request' : 'calendar')

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
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  // Request-only mode state
  const [reqName,     setReqName]     = useState('')
  const [reqEmail,    setReqEmail]    = useState('')
  const [reqDate,     setReqDate]     = useState('')
  const [reqLocation, setReqLocation] = useState('')
  const [reqMessage,  setReqMessage]  = useState('')
  const [reqError,    setReqError]    = useState('')
  const [reqPrivacyAccepted, setReqPrivacyAccepted] = useState(false)

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

  // Build calendar grid — week starts Monday (European)
  const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const firstDay = (rawFirstDay + 6) % 7 // convert to 0=Mon, 1=Tue … 6=Sun
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
    if (!privacyAccepted) { setFormError('Bitte akzeptiere die Datenschutzerklärung'); return }
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

  const handleRequestSubmit = async () => {
    if (!reqName.trim()) { setReqError('Name ist erforderlich'); return }
    if (!reqEmail.trim() || !reqEmail.includes('@')) { setReqError('Gültige E-Mail angeben'); return }
    if (!reqDate.trim()) { setReqError('Bitte ein Wunschdatum angeben'); return }
    if (!reqPrivacyAccepted) { setReqError('Bitte akzeptiere die Datenschutzerklärung'); return }
    setReqError('')
    setStep('submitting')

    const notes = [
      reqLocation ? `Wunschort: ${reqLocation}` : null,
      reqMessage  ? `Nachricht: ${reqMessage}`   : null,
    ].filter(Boolean).join('\n')

    // Use the desired date as booked_date; time placeholder '00:00'
    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photographerSlug: photographer.slug,
        bookingTypeSlug: bt.slug,
        client_name: reqName,
        client_email: reqEmail,
        booked_date: reqDate,
        booked_time: '00:00',
        answers: {},
        notes,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setReqError(data.error ?? 'Fehler beim Senden')
      setStep('request')
      return
    }

    setStep('request_done')
  }

  const depositAmount = getDepositAmount(bt)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F7', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-black text-[24px]" style={{ letterSpacing: '-0.03em', color: '#111' }}>
            {bt.title}
          </h1>
        </div>

        {/* ── Step: Calendar ── */}
        {step === 'calendar' && (
          <div className="flex flex-col sm:flex-row-reverse gap-4 items-start">

            {/* Right — Calendar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0 w-full sm:w-auto" style={{ minWidth: '300px' }}>
              {/* Month nav */}
              <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <h2 className="font-bold text-[15px] capitalize" style={{ color: '#111' }}>{monthLabel}</h2>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-3 pt-3 pb-1 gap-1">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                  <div key={d} className="text-center text-[12px] font-bold py-1" style={{ color: '#374151' }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 px-3 pb-5 gap-1">
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
                      className="aspect-square rounded-xl flex items-center justify-center text-[14px] transition-all"
                      style={{
                        background: isSelected ? '#1A1A18' : isAvailable && !isPast ? '#F0FDF4' : 'transparent',
                        color: isSelected ? '#fff' : isAvailable && !isPast ? '#059669' : '#6B7280',
                        cursor: isAvailable && !isPast ? 'pointer' : 'default',
                        fontWeight: isAvailable && !isPast ? '700' : '500',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Left — Info panel / Time slots */}
            <div className="flex-1 min-w-0 w-full">
              {/* No date selected — service info */}
              {!selectedDate && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                  {/* Photographer mini card */}
                  <div className="flex items-center gap-3">
                    {photographer.logoUrl
                      ? <img src={photographer.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[15px] font-bold text-white" style={{ background: '#C9A96E' }}>{(photographer.studioName || photographer.fullName).charAt(0)}</div>
                    }
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] truncate" style={{ color: '#111' }}>{photographer.studioName || photographer.fullName}</p>
                      <p className="text-[11px] text-gray-400">Fotograf</p>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#F3F4F6' }} />

                  {/* Service details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5 text-[13px]" style={{ color: '#374151' }}>
                      <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span>{bt.duration_minutes} Minuten</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px]" style={{ color: '#374151' }}>
                      {bt.location_type === 'online' ? <Video className="w-4 h-4 flex-shrink-0 text-gray-400" /> : <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />}
                      <span>{LOCATION_LABEL[bt.location_type]}</span>
                    </div>
                    {bt.price > 0 && (
                      <div className="flex items-center gap-2.5 text-[13px]" style={{ color: '#C9A96E' }}>
                        <Euro className="w-4 h-4 flex-shrink-0" />
                        <span className="font-bold">{formatPrice(bt.price)}</span>
                      </div>
                    )}
                    {bt.anzahlung_enabled && depositAmount > 0 && (
                      <div className="flex items-center gap-2.5 text-[13px] text-blue-600">
                        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-[9px] font-black">%</span>
                        <span>Anzahlung: {formatPrice(depositAmount)}</span>
                      </div>
                    )}
                  </div>

                  {bt.description && (
                    <>
                      <div style={{ height: 1, background: '#F3F4F6' }} />
                      <div className="space-y-3">
                        {bt.description.split(/\n\n+/).map((para, i) => (
                          <p key={i} className="text-[13px] leading-relaxed" style={{ color: '#4B5563' }}>
                            {para.split('\n').map((line, j, arr) => (
                              <span key={j}>
                                {line}
                                {j < arr.length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ height: 1, background: '#F3F4F6' }} />

                  {/* Hint */}
                  <p className="text-[11px] text-center" style={{ color: '#9CA3AF' }}>
                    ← Wähle einen Tag im Kalender
                  </p>
                </div>
              )}

              {/* Date selected — time slots */}
              {selectedDate && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <p className="font-bold text-[13px]" style={{ color: '#111' }}>{formatDate(selectedDate)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{bt.duration_minutes} Min. · {LOCATION_LABEL[bt.location_type]}</p>
                  </div>

                  <div className="p-4">
                    {loadingSlots && (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin" />
                      </div>
                    )}

                    {!loadingSlots && slotsForSelected.length === 0 && (
                      <p className="text-center text-[12px] text-gray-400 py-6">Keine freien Slots an diesem Tag.</p>
                    )}

                    {!loadingSlots && slotsForSelected.length > 0 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {slotsForSelected.map(slot => (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className="py-2 rounded-xl text-[12px] font-bold transition-all border"
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
                          <button
                            onClick={() => setStep('form')}
                            className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all mt-1"
                            style={{ background: '#1A1A18', color: '#fff' }}
                          >
                            Weiter — {selectedTime} Uhr →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    <div className="space-y-2">
                      {(q.options && q.options.length > 0 ? q.options : ['Ja']).map(opt => {
                        const selected: string[] = answers[q.id] ? answers[q.id].split('||') : []
                        const checked = selected.includes(opt)
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked ? selected.filter(s => s !== opt) : [...selected, opt]
                                setAnswers(a => ({ ...a, [q.id]: next.join('||') }))
                              }}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-[14px] text-gray-700">{opt}</span>
                          </label>
                        )
                      })}
                    </div>
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

              {/* DSGVO consent checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={e => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
                  style={{ accentColor: '#1A1A18' }}
                />
                <span className="text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>
                  Ich habe die{' '}
                  <a
                    href="/datenschutz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: '#1A1A18' }}
                  >
                    Datenschutzerklärung
                  </a>{' '}
                  gelesen und akzeptiere sie. *
                </span>
              </label>

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

        {/* ── Step: Request form ── */}
        {step === 'request' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <h2 className="font-bold text-[17px] mb-1" style={{ color: '#111' }}>Anfrage senden</h2>
              <p className="text-[13px] text-gray-500">
                Teile uns deinen Wunschtermin mit — wir melden uns so schnell wie möglich bei dir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Name *</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Dein vollständiger Name"
                  value={reqName}
                  onChange={e => setReqName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">E-Mail *</label>
                <input
                  type="email"
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="deine@email.de"
                  value={reqEmail}
                  onChange={e => setReqEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Wunschdatum *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={reqDate}
                  onChange={e => setReqDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Wunschort</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="z.B. Berlin Mitte, Outdoor, Studio…"
                  value={reqLocation}
                  onChange={e => setReqLocation(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Nachricht (optional)</label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                rows={3}
                placeholder="Weitere Infos oder Wünsche…"
                value={reqMessage}
                onChange={e => setReqMessage(e.target.value)}
              />
            </div>

            {/* DSGVO consent checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={reqPrivacyAccepted}
                onChange={e => setReqPrivacyAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
                style={{ accentColor: '#1A1A18' }}
              />
              <span className="text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>
                Ich habe die{' '}
                <a
                  href="/datenschutz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: '#1A1A18' }}
                >
                  Datenschutzerklärung
                </a>{' '}
                gelesen und akzeptiere sie. *
              </span>
            </label>

            {reqError && (
              <p className="text-[13px] font-medium text-red-600">{reqError}</p>
            )}

            <button
              onClick={handleRequestSubmit}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all"
              style={{ background: '#1A1A18', color: '#fff' }}
            >
              Anfrage senden →
            </button>
          </div>
        )}

        {/* ── Step: Request done ── */}
        {step === 'request_done' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#ECFDF5' }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-black text-[20px] mb-2" style={{ letterSpacing: '-0.03em', color: '#111' }}>
              Anfrage gesendet!
            </h2>
            <p className="text-[14px] text-gray-500 max-w-sm mx-auto">
              {photographer.studioName || photographer.fullName} wird sich so schnell wie möglich bei dir melden.
            </p>
          </div>
        )}

        {/* ── Step: Submitting ── */}
        {step === 'submitting' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            <p className="font-semibold text-gray-700">Wird gesendet…</p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-8">Powered by Fotonizer</p>
      </div>
    </div>
  )
}
