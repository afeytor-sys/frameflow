'use client'

import { Calendar, Clock, MapPin, Video, User, FileText } from 'lucide-react'
import Image from 'next/image'

const STATUS_DE: Record<string, { label: string; bg: string; color: string }> = {
  pending:          { label: 'Warten auf Anzahlung', bg: '#FEF3C7', color: '#D97706' },
  deposit_received: { label: 'Anzahlung erhalten',   bg: '#DBEAFE', color: '#2563EB' },
  confirmed:        { label: 'Bestätigt ✓',           bg: '#D1FAE5', color: '#059669' },
  completed:        { label: 'Abgeschlossen',          bg: '#F1F5F9', color: '#64748B' },
  cancelled:        { label: 'Storniert',              bg: '#FEE2E2', color: '#DC2626' },
}
const STATUS_EN: Record<string, { label: string; bg: string; color: string }> = {
  pending:          { label: 'Awaiting deposit',  bg: '#FEF3C7', color: '#D97706' },
  deposit_received: { label: 'Deposit received',  bg: '#DBEAFE', color: '#2563EB' },
  confirmed:        { label: 'Confirmed ✓',        bg: '#D1FAE5', color: '#059669' },
  completed:        { label: 'Completed',          bg: '#F1F5F9', color: '#64748B' },
  cancelled:        { label: 'Cancelled',          bg: '#FEE2E2', color: '#DC2626' },
}

interface Props {
  booking: {
    id: string
    client_name: string
    client_email: string
    booked_date: string
    booked_time: string
    status: string
    payment_reference: string | null
    deposit_amount: number | null
    google_meet_link: string | null
    notes: string | null
    answers: Record<string, string>
  }
  bookingType: {
    title: string
    duration_minutes: number
    location_type: string
    price: number
    currency: string
    questions: Array<{ id: string; label: string; type: string; required: boolean; options?: string[] }>
  }
  photographer: {
    studioName: string
    logoUrl: string | null
    locale: string
  }
}

export default function BookingPortalClient({ booking, bookingType, photographer }: Props) {
  const de = photographer.locale !== 'en'
  const STATUS_MAP = de ? STATUS_DE : STATUS_EN
  const st = STATUS_MAP[booking.status] ?? STATUS_MAP.pending

  const dateLabel = new Date(booking.booked_date + 'T00:00:00').toLocaleDateString(
    de ? 'de-DE' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  )

  const answeredQs = bookingType.questions.filter(q => booking.answers[q.id])

  const isOnline = bookingType.location_type === 'online'

  const depositFormatted = booking.deposit_amount
    ? new Intl.NumberFormat(de ? 'de-DE' : 'en-GB', { style: 'currency', currency: bookingType.currency }).format(booking.deposit_amount / 100)
    : null

  return (
    <div className="min-h-screen" style={{ background: '#F7F5F2' }}>
      <div className="max-w-lg mx-auto px-4 py-12 pb-20">

        {/* Studio header */}
        <div className="flex items-center gap-3 mb-8">
          {photographer.logoUrl ? (
            <Image src={photographer.logoUrl} alt={photographer.studioName} width={36} height={36} className="rounded-full object-cover" style={{ width: 36, height: 36 }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-black" style={{ background: '#C4A47C' }}>
              {photographer.studioName.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-[13px] font-semibold" style={{ color: '#8A8278' }}>{photographer.studioName}</p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 32px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)' }}>

          {/* Card header */}
          <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid #F0EDE8' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[20px] font-black leading-tight mb-2" style={{ color: '#1C1C1A', letterSpacing: '-0.02em' }}>{bookingType.title}</h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              {isOnline && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
                  <Video className="w-4 h-4" style={{ color: '#6366F1' }} />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-3.5" style={{ borderBottom: '1px solid #F0EDE8' }}>
            <div className="flex items-center gap-3 text-[14px]">
              <User className="w-4 h-4 flex-shrink-0" style={{ color: '#B5ADA3' }} />
              <span style={{ color: '#1C1C1A', fontWeight: 600 }}>{booking.client_name}</span>
              <span style={{ color: '#B5ADA3' }}>·</span>
              <span style={{ color: '#9A9188' }}>{booking.client_email}</span>
            </div>
            <div className="flex items-center gap-3 text-[14px]">
              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#B5ADA3' }} />
              <span style={{ color: '#1C1C1A' }}>{dateLabel} · {booking.booked_time} {de ? 'Uhr' : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-[14px]">
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#B5ADA3' }} />
              <span style={{ color: '#1C1C1A' }}>{bookingType.duration_minutes} {de ? 'Minuten' : 'minutes'}</span>
            </div>
            {booking.payment_reference && (
              <div className="flex items-center gap-3 text-[14px]">
                <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#B5ADA3' }} />
                <div>
                  <span className="text-[12px] px-2 py-0.5 rounded" style={{ background: '#F5F2EE', color: '#7A7468', fontFamily: 'monospace' }}>
                    {booking.payment_reference}
                  </span>
                  {depositFormatted && (
                    <span className="ml-2 text-[13px]" style={{ color: '#9A9188' }}>
                      {de ? `Anzahlung: ${depositFormatted}` : `Deposit: ${depositFormatted}`}
                    </span>
                  )}
                </div>
              </div>
            )}
            {booking.google_meet_link && (
              <div className="flex items-center gap-3 text-[14px]">
                {bookingType.location_type === 'online'
                  ? <Video className="w-4 h-4 flex-shrink-0" style={{ color: '#6366F1' }} />
                  : <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#C4A47C' }} />
                }
                <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-70"
                  style={{ color: bookingType.location_type === 'online' ? '#6366F1' : '#C4A47C' }}>
                  {booking.google_meet_link.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-3 text-[14px]">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B5ADA3' }} />
                <span style={{ color: '#1C1C1A', whiteSpace: 'pre-wrap' }}>{booking.notes}</span>
              </div>
            )}
          </div>

          {/* Client answers */}
          {answeredQs.length > 0 && (
            <div className="px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: '#B5ADA3' }}>
                {de ? 'Deine Angaben' : 'Your responses'}
              </p>
              <div className="space-y-4">
                {answeredQs.map(q => {
                  const val = booking.answers[q.id]
                  const isMulti = val.includes('||')
                  return (
                    <div key={q.id}>
                      <p className="text-[12px] font-semibold mb-1.5" style={{ color: '#9A9188' }}>{q.label}</p>
                      {isMulti
                        ? (
                          <div className="flex flex-wrap gap-1.5">
                            {val.split('||').map(v => (
                              <span key={v} className="text-[13px] px-2.5 py-1 rounded-full" style={{ background: '#F5F2EE', color: '#1C1C1A' }}>{v}</span>
                            ))}
                          </div>
                        )
                        : <p className="text-[14px]" style={{ color: '#1C1C1A', whiteSpace: 'pre-wrap' }}>{val}</p>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] mt-8" style={{ color: '#C0B8AE' }}>
          {de ? `Bereitgestellt von ${photographer.studioName}` : `Provided by ${photographer.studioName}`}
        </p>
      </div>
    </div>
  )
}
