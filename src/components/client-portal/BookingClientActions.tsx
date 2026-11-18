'use client'

import { useState } from 'react'
import { Clock, Mail, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  bookingId: string
  status: string
  bookedDate: string
  bookedTime: string
  bookingTitle: string
  isOnline: boolean
  photographerEmail: string | null
  de?: boolean
  onCancelled: () => void
}

const CANCELLABLE = ['pending', 'deposit_received', 'confirmed']

/** Client-facing block on booking pages: arrival note, contact button and self-service cancellation. */
export default function BookingClientActions({
  bookingId, status, bookedDate, bookedTime, bookingTitle, isOnline, photographerEmail, de = true, onCancelled,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const isPast = new Date(`${bookedDate}T${bookedTime}:00`) < new Date()
  const isCancelled = status === 'cancelled'
  const canCancel = CANCELLABLE.includes(status) && !isPast

  const mailto = photographerEmail
    ? `mailto:${photographerEmail}?subject=${encodeURIComponent(`${de ? 'Frage zu meinem Termin' : 'Question about my booking'}: ${bookingTitle}`)}`
    : null

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/client-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(d.error ?? (de ? 'Stornierung fehlgeschlagen' : 'Cancellation failed'))
        return
      }
      toast.success(de ? 'Termin storniert' : 'Booking cancelled')
      setConfirming(false)
      onCancelled()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Arrival note */}
      {!isCancelled && !isPast && (
        <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: '#FBF7F1', border: '1px solid #EFE4D4' }}>
          <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#C4A47C' }} />
          <p className="text-[14px] leading-relaxed" style={{ color: '#5C5248' }}>
            {isOnline
              ? (de ? <>Bitte sei <strong>ein paar Minuten vor Beginn</strong> im Meeting, damit alles wie geplant läuft.</> : <>Please join the meeting <strong>a few minutes early</strong> so everything runs as planned.</>)
              : (de ? <>Bitte sei <strong>mindestens 10 Minuten vor Beginn</strong> da, damit alles wie geplant läuft.</> : <>Please arrive <strong>at least 10 minutes early</strong> so everything runs as planned.</>)}
          </p>
        </div>
      )}

      {/* Contact */}
      {mailto && (
        <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid #EEEBE6' }}>
          <p className="text-[14px] font-bold mb-3" style={{ color: '#1C1C1A' }}>
            {de ? 'Fragen zu deinem Termin?' : 'Questions about your booking?'}
          </p>
          <a
            href={mailto}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-opacity hover:opacity-90"
            style={{ background: '#1A1A18', color: '#fff' }}
          >
            <Mail className="w-4 h-4" />
            {de ? 'Kontakt aufnehmen' : 'Contact'}
          </a>
          <p className="text-center text-[13px] mt-2.5 break-all" style={{ color: '#9A9188' }}>
            {photographerEmail}
          </p>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid #EEEBE6' }}>
          {!confirming ? (
            <>
              <p className="text-[14px] font-bold mb-1" style={{ color: '#1C1C1A' }}>
                {de ? 'Du kannst nicht kommen?' : "Can't make it?"}
              </p>
              <p className="text-[13px] mb-3" style={{ color: '#9A9188' }}>
                {de ? 'Krank geworden oder etwas dazwischengekommen? Hier kannst du den Termin stornieren.' : 'Feeling ill or something came up? You can cancel your booking here.'}
              </p>
              <button
                onClick={() => setConfirming(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-colors hover:bg-red-50"
                style={{ border: '1px solid #FCA5A5', color: '#DC2626' }}
              >
                <XCircle className="w-4 h-4" />
                {de ? 'Termin stornieren' : 'Cancel booking'}
              </button>
            </>
          ) : (
            <>
              <p className="text-[14px] font-bold mb-1" style={{ color: '#1C1C1A' }}>
                {de ? 'Termin wirklich stornieren?' : 'Really cancel this booking?'}
              </p>
              <p className="text-[13px] mb-3" style={{ color: '#9A9188' }}>
                {de ? 'Der Fotograf wird informiert und der Termin wird freigegeben.' : 'The photographer will be notified and the slot released.'}
              </p>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={de ? 'Grund (optional)' : 'Reason (optional)'}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] mb-3 outline-none focus:ring-2 focus:ring-red-100"
                style={{ border: '1px solid #E5E1DB', color: '#1C1C1A' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ border: '1px solid #E5E1DB', color: '#5C5248' }}
                >
                  {de ? 'Zurück' : 'Back'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl text-[14px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#DC2626', color: '#fff' }}
                >
                  {cancelling ? (de ? 'Wird storniert…' : 'Cancelling…') : (de ? 'Ja, stornieren' : 'Yes, cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
