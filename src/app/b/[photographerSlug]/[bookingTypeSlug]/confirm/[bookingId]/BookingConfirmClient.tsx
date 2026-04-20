'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Clock, Calendar, Video, Copy, Check, Upload, X, CalendarPlus } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  status: string
  client_name: string
  client_email: string
  booked_date: string
  booked_time: string
  payment_reference: string | null
  deposit_amount: number | null
  google_meet_link: string | null
}

interface BookingTypeInfo {
  title: string
  duration_minutes: number
  location_type: string
}

interface PhotographerInfo {
  studioName: string
  logoUrl: string | null
  bankAccountHolder: string | null
  bankName: string | null
  bankIban: string | null
  bankBic: string | null
}

interface Props {
  booking: Booking
  bookingType: BookingTypeInfo
  photographer: PhotographerInfo
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

function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

// ── Main Component ────────────────────────────────────────────────────────────

function generateIcs(booking: Booking, bookingType: BookingTypeInfo, studioName: string): string {
  const [year, month, day] = booking.booked_date.split('-').map(Number)
  const [hour, minute] = booking.booked_time.split(':').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  const endDate = new Date(year, month - 1, day, hour, minute + bookingType.duration_minutes)
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  const description = booking.google_meet_link ? `Google Meet: ${booking.google_meet_link}` : ''
  const location = booking.google_meet_link ?? ''

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fotonizer//Booking//DE',
    'BEGIN:VEVENT',
    `UID:${booking.id}@fotonizer.com`,
    `DTSTAMP:${now}Z`,
    `DTSTART;TZID=Europe/Berlin:${start}`,
    `DTEND;TZID=Europe/Berlin:${end}`,
    `SUMMARY:${bookingType.title} — ${studioName}`,
    description ? `DESCRIPTION:${description}` : '',
    location ? `LOCATION:${location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export default function BookingConfirmClient({ booking, bookingType, photographer }: Props) {
  const [depositMarked, setDepositMarked] = useState(booking.status === 'deposit_received' || booking.status === 'confirmed')
  const [marking, setMarking] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed'
  const requiresDeposit = !!booking.deposit_amount && booking.deposit_amount > 0
  const showBankDetails = requiresDeposit && !depositMarked && !isConfirmed

  const downloadIcs = () => {
    const ics = generateIcs(booking, bookingType, photographer.studioName)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `buchung-${booking.booked_date}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
    toast.success('Kopiert!')
  }

  const handleMarkPaid = async () => {
    setMarking(true)
    try {
      let proofUrl: string | null = null

      // Upload proof if provided (Supabase Storage via presigned URL would be ideal;
      // here we skip the upload for simplicity — just mark as paid)
      if (proofFile) {
        // In production: upload to Supabase Storage and get URL
        // For now: ignore proof and just mark as paid
        proofUrl = null
      }

      const res = await fetch(`/api/bookings/${booking.id}/deposit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_proof_url: proofUrl }),
      })

      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? 'Fehler')
        return
      }

      setDepositMarked(true)
      toast.success('Zahlung wurde gemeldet!')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F7', fontFamily: 'system-ui, sans-serif' }}>
      <div className="max-w-lg mx-auto px-4 py-10 sm:py-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {photographer.logoUrl && (
            <img src={photographer.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          )}
          <p className="text-[14px] font-semibold text-gray-600">{photographer.studioName}</p>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: isConfirmed ? '#ECFDF5' : depositMarked ? '#EFF6FF' : '#FFF7ED',
              }}
            >
              <CheckCircle2
                className="w-6 h-6"
                style={{ color: isConfirmed ? '#10B981' : depositMarked ? '#3B82F6' : '#F59E0B' }}
              />
            </div>
            <div>
              <h1 className="font-black text-[20px] mb-1" style={{ letterSpacing: '-0.03em', color: '#111' }}>
                {isConfirmed
                  ? 'Buchung bestätigt!'
                  : depositMarked
                    ? 'Zahlung gemeldet!'
                    : requiresDeposit
                      ? 'Buchungsanfrage eingegangen'
                      : 'Buchungsanfrage eingegangen'
                }
              </h1>
              <p className="text-[13px] text-gray-500">
                {isConfirmed
                  ? 'Dein Termin ist bestätigt. Du erhältst eine Bestätigungsmail.'
                  : depositMarked
                    ? 'Wir haben deine Meldung erhalten. Der Fotograf wird nach Eingang des Geldes bestätigen.'
                    : requiresDeposit
                      ? `Bitte überweise die Anzahlung, damit dein Termin reserviert wird.`
                      : 'Der Fotograf wird deine Anfrage in Kürze bestätigen.'
                }
              </p>
            </div>
          </div>

          {/* Appointment summary */}
          <div className="mt-5 pt-5 space-y-2" style={{ borderTop: '1px solid #F3F4F6' }}>
            <div className="flex items-center gap-2 text-[13px] text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{formatDate(booking.booked_date)} um <strong>{booking.booked_time} Uhr</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-700">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{bookingType.title} · {bookingType.duration_minutes} Min.</span>
            </div>
            {booking.google_meet_link && (
              <div className="flex items-center gap-2 text-[13px]">
                <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <a
                  href={booking.google_meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 underline"
                >
                  Google Meet beitreten
                </a>
              </div>
            )}
          </div>

          {/* Add to calendar */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
            <button
              onClick={downloadIcs}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors hover:bg-gray-50 border border-gray-200"
              style={{ color: '#374151' }}
            >
              <CalendarPlus className="w-4 h-4 text-gray-400" />
              Zum Kalender hinzufügen
            </button>
          </div>
        </div>

        {/* Bank details card — only shown if deposit required and not yet marked */}
        {showBankDetails && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-5">
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#111' }}>Anzahlung überweisen</h2>
            <p className="text-[13px] text-gray-500 mb-4">
              Überweise <strong>{formatPrice(booking.deposit_amount!)}</strong> mit dem folgenden Verwendungszweck:
            </p>

            {/* Bank details */}
            <div className="space-y-3">
              {[
                { label: 'Empfänger', value: photographer.bankAccountHolder, field: 'holder' },
                { label: 'IBAN', value: photographer.bankIban ? formatIban(photographer.bankIban) : null, field: 'iban', raw: photographer.bankIban },
                { label: 'BIC', value: photographer.bankBic, field: 'bic' },
                { label: 'Bank', value: photographer.bankName, field: 'bank' },
              ].filter(f => f.value).map(({ label, value, field, raw }) => (
                <div key={field} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="text-[14px] font-semibold text-gray-800 font-mono">{value}</p>
                  </div>
                  <button
                    onClick={() => copy(raw ?? value!, field)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                  >
                    {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>
              ))}

              {/* Payment reference — highlighted */}
              {booking.payment_reference && (
                <div className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-orange-500">Verwendungszweck</p>
                    <p className="text-[16px] font-black tracking-widest text-orange-700">{booking.payment_reference}</p>
                  </div>
                  <button
                    onClick={() => copy(booking.payment_reference!, 'ref')}
                    className="p-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    {copiedField === 'ref' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-orange-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Proof upload */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p className="text-[13px] font-semibold text-gray-700 mb-2">
                Überweisungsbeleg (optional)
              </p>
              {proofFile ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[13px] text-gray-700 flex-1 truncate">{proofFile.name}</span>
                  <button onClick={() => setProofFile(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Beleg hochladen
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setProofFile(f) }}
              />
            </div>

            <button
              onClick={handleMarkPaid}
              disabled={marking}
              className="w-full mt-4 py-3 rounded-xl text-[14px] font-bold transition-all disabled:opacity-50"
              style={{ background: '#1A1A18', color: '#fff' }}
            >
              {marking ? 'Wird gespeichert…' : 'Ich habe den Betrag überwiesen'}
            </button>
          </div>
        )}

        {/* Deposit paid confirmation */}
        {depositMarked && !isConfirmed && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 mb-5">
            <p className="text-[13px] text-blue-700">
              <strong>Was passiert als nächstes?</strong> Der Fotograf prüft den Eingang der Zahlung und bestätigt deinen Termin. Du erhältst eine E-Mail-Bestätigung.
            </p>
          </div>
        )}

        {/* Confirmed details */}
        {isConfirmed && booking.google_meet_link && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-5">
            <p className="font-semibold text-green-800 mb-2">Online-Termin</p>
            <a
              href={booking.google_meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-green-600 text-white"
            >
              <Video className="w-4 h-4" /> Google Meet beitreten
            </a>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-10">Powered by Fotonizer</p>
      </div>
    </div>
  )
}
