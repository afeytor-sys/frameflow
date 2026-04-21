'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Video, Euro, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface BookingType {
  title: string
  price: number
  duration_minutes: number
  location_type: string
  currency: string
}

interface Booking {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  booked_date: string
  booked_time: string
  status: string
  payment_reference: string | null
  deposit_amount: number | null
  google_meet_link: string | null
  notes: string | null
  answers: Record<string, string>
  invoice_id: string | null
  booking_types: BookingType | null
  created_at: string
}

interface Props {
  initialBookings: Booking[]
  autoInvoice: boolean
}

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:          { label: 'Ausstehend',       bg: 'rgba(245,158,11,0.12)',  color: '#D97706' },
  deposit_received: { label: 'Anzahlung erhalten', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  confirmed:        { label: 'Bestätigt',         bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  completed:        { label: 'Abgeschlossen',     bg: 'rgba(100,116,139,0.1)', color: '#64748B' },
  cancelled:        { label: 'Storniert',         bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
}

const LOCATION_LABEL: Record<string, string> = {
  studio: 'Studio',
  external: 'Outdoor / Extern',
  online: 'Online (Google Meet)',
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function AnfragenClient({ initialBookings, autoInvoice }: Props) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter)

  const active = bookings.filter(b => !['completed', 'cancelled'].includes(b.status))
  const done = bookings.filter(b => ['completed', 'cancelled'].includes(b.status))

  async function handleConfirm(id: string) {
    setLoading(id + '_confirm')
    const res = await fetch(`/api/bookings/${id}/confirm`, { method: 'PATCH' })
    if (res.ok) {
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
      toast.success('Buchung bestätigt')
    } else {
      toast.error('Fehler beim Bestätigen')
    }
    setLoading(null)
  }

  async function handleComplete(id: string) {
    setLoading(id + '_complete')
    const res = await fetch(`/api/bookings/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (res.ok) {
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'completed', invoice_id: data.invoiceId } : b))
      toast.success(data.invoiceId ? 'Abgeschlossen — Rechnung erstellt' : 'Als abgeschlossen markiert')
      if (data.invoiceId) router.push(`/dashboard/invoices/${data.invoiceId}`)
    } else {
      toast.error(data.error ?? 'Fehler')
    }
    setLoading(null)
  }

  async function handleCancel(id: string) {
    setLoading(id + '_cancel')
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: 'PATCH' })
    if (res.ok) {
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
      toast.success('Buchung storniert')
    } else {
      toast.error('Fehler beim Stornieren')
    }
    setLoading(null)
  }

  const filterTabs = [
    { key: 'all', label: 'Alle' },
    { key: 'pending', label: 'Ausstehend' },
    { key: 'deposit_received', label: 'Anzahlung' },
    { key: 'confirmed', label: 'Bestätigt' },
    { key: 'completed', label: 'Abgeschlossen' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            Buchungen
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {active.length} aktiv · {done.length} abgeschlossen
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: filter === tab.key ? 'var(--accent)' : 'var(--bg-hover)',
              color: filter === tab.key ? '#1A1A18' : 'var(--text-muted)',
            }}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 opacity-60">
                {bookings.filter(b => b.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-[15px]">Keine Buchungen</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(booking => {
            const bt = booking.booking_types
            const isExpanded = expanded === booking.id
            const st = STATUS[booking.status] ?? STATUS.pending
            const isLoading = loading?.startsWith(booking.id)

            return (
              <div
                key={booking.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Status dot */}
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.color }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                        {booking.client_name}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        <Calendar className="w-3 h-3" />{formatDate(booking.booked_date)} · {String(booking.booked_time).slice(0, 5)}
                      </span>
                      {bt && (
                        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {bt.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  {bt && bt.price > 0 && (
                    <div className="hidden sm:block flex-shrink-0 text-right">
                      <span className="text-[13px] font-bold" style={{ color: 'var(--accent, #C9A96E)' }}>
                        {formatPrice(bt.price)}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {booking.status === 'pending' || booking.status === 'deposit_received' ? (
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        disabled={!!isLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Bestätigen
                      </button>
                    ) : booking.status === 'confirmed' ? (
                      <button
                        onClick={() => handleComplete(booking.id)}
                        disabled={!!isLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                        style={{ background: 'rgba(196,164,124,0.15)', color: '#C9A96E' }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {autoInvoice ? 'Abschließen + Rechnung' : 'Abschließen'}
                      </button>
                    ) : booking.status === 'completed' && booking.invoice_id ? (
                      <button
                        onClick={() => router.push(`/dashboard/invoices/${booking.invoice_id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Rechnung
                      </button>
                    ) : null}

                    {!['completed', 'cancelled'].includes(booking.status) && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={!!isLoading}
                        className="p-1.5 rounded-xl transition-colors hover:bg-red-50 disabled:opacity-50"
                        style={{ color: '#EF4444', opacity: 0.6 }}
                        title="Stornieren"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setExpanded(isExpanded ? null : booking.id)}
                      className="p-1.5 rounded-xl transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="grid sm:grid-cols-2 gap-3 pt-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Kunde</p>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{booking.client_name}</p>
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{booking.client_email}</p>
                        {booking.client_phone && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{booking.client_phone}</p>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Termin</p>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatDate(booking.booked_date)} um {String(booking.booked_time).slice(0, 5)} Uhr
                        </p>
                        {bt && (
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            {bt.duration_minutes} Min. · {LOCATION_LABEL[bt.location_type] ?? bt.location_type}
                          </p>
                        )}
                      </div>
                      {booking.deposit_amount && booking.deposit_amount > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Anzahlung</p>
                          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {formatPrice(booking.deposit_amount)}
                          </p>
                          {booking.payment_reference && (
                            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Ref: {booking.payment_reference}</p>
                          )}
                        </div>
                      )}
                      {booking.google_meet_link && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Google Meet</p>
                          <a
                            href={booking.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[12px] font-semibold text-blue-600"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Link öffnen <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                    {booking.notes && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Notiz</p>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{booking.notes}</p>
                      </div>
                    )}
                    {booking.answers && Object.keys(booking.answers).length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Fragen & Antworten</p>
                        <div className="space-y-1">
                          {Object.entries(booking.answers).map(([k, v]) => v ? (
                            <p key={k} className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{k}:</span> {v}
                            </p>
                          ) : null)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
