import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import BookingConfirmClient from './BookingConfirmClient'

interface Props {
  params: Promise<{ photographerSlug: string; bookingTypeSlug: string; bookingId: string }>
}

export const metadata = { title: 'Buchung bestätigt — Fotonizer' }

export default async function BookingConfirmPage({ params }: Props) {
  const { bookingId, photographerSlug } = await params
  const supabase = createServiceClient()

  // Fetch booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, booking_types(title, duration_minutes, location_type, price, currency)')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) notFound()

  // Fetch photographer (bank details only shown if deposit pending)
  const { data: photographer } = await supabase
    .from('photographers')
    .select('full_name, studio_name, logo_url, bank_account_holder, bank_name, bank_iban, bank_bic, slug')
    .eq('id', booking.photographer_id)
    .maybeSingle()

  if (!photographer) notFound()
  if (photographer.slug !== photographerSlug) notFound()

  return (
    <BookingConfirmClient
      booking={{
        id: booking.id,
        status: booking.status,
        client_name: booking.client_name,
        client_email: booking.client_email,
        booked_date: booking.booked_date,
        booked_time: String(booking.booked_time).slice(0, 5),
        payment_reference: booking.payment_reference,
        deposit_amount: booking.deposit_amount,
        google_meet_link: booking.google_meet_link,
      }}
      bookingType={{
        title: (booking.booking_types as { title: string })?.title ?? '',
        duration_minutes: (booking.booking_types as { duration_minutes: number })?.duration_minutes ?? 60,
        location_type: (booking.booking_types as { location_type: string })?.location_type ?? 'external',
      }}
      photographer={{
        studioName: photographer.studio_name || photographer.full_name || '',
        logoUrl: photographer.logo_url,
        bankAccountHolder: photographer.bank_account_holder,
        bankName: photographer.bank_name,
        bankIban: photographer.bank_iban,
        bankBic: photographer.bank_bic,
      }}
    />
  )
}
