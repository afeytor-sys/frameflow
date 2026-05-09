import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import BookingPortalClient from './BookingPortalClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Buchungsdetails — Fotonizer' }

export default async function BookingPortalPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, booking_types(title, duration_minutes, location_type, price, currency, questions)')
    .eq('id', id)
    .maybeSingle()

  if (!booking) notFound()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('full_name, studio_name, logo_url, locale')
    .eq('id', booking.photographer_id)
    .maybeSingle()

  if (!photographer) notFound()

  const bt = booking.booking_types as {
    title: string
    duration_minutes: number
    location_type: string
    price: number
    currency: string
    questions: Array<{ id: string; label: string; type: string; required: boolean; options?: string[] }>
  } | null

  return (
    <BookingPortalClient
      booking={{
        id: booking.id,
        client_name: booking.client_name,
        client_email: booking.client_email,
        booked_date: booking.booked_date,
        booked_time: String(booking.booked_time).slice(0, 5),
        status: booking.status,
        payment_reference: booking.payment_reference ?? null,
        deposit_amount: booking.deposit_amount ?? null,
        google_meet_link: booking.google_meet_link ?? null,
        notes: booking.notes ?? null,
        answers: (booking.answers ?? {}) as Record<string, string>,
      }}
      bookingType={{
        title: bt?.title ?? '',
        duration_minutes: bt?.duration_minutes ?? 60,
        location_type: bt?.location_type ?? 'external',
        price: bt?.price ?? 0,
        currency: bt?.currency ?? 'EUR',
        questions: bt?.questions ?? [],
      }}
      photographer={{
        studioName: photographer.studio_name || photographer.full_name || '',
        logoUrl: photographer.logo_url ?? null,
        locale: photographer.locale ?? 'de',
      }}
    />
  )
}
