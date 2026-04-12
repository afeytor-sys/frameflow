import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import BookingPageClient from './BookingPageClient'

interface Props {
  params: Promise<{ photographerSlug: string; bookingTypeSlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { photographerSlug, bookingTypeSlug } = await params
  const supabase = createServiceClient()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('full_name, studio_name')
    .eq('slug', photographerSlug)
    .maybeSingle()

  const { data: bt } = await supabase
    .from('booking_types')
    .select('title')
    .eq('slug', bookingTypeSlug)
    .maybeSingle()

  const name = photographer?.studio_name || photographer?.full_name || photographerSlug
  return { title: bt?.title ? `${bt.title} — ${name}` : name }
}

export default async function BookingPage({ params }: Props) {
  const { photographerSlug, bookingTypeSlug } = await params
  const supabase = createServiceClient()

  // Fetch photographer
  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, full_name, studio_name, logo_url, slug')
    .eq('slug', photographerSlug)
    .maybeSingle()

  if (!photographer) notFound()

  // Fetch booking type
  const { data: bt } = await supabase
    .from('booking_types')
    .select('*')
    .eq('photographer_id', photographer.id)
    .eq('slug', bookingTypeSlug)
    .eq('active', true)
    .maybeSingle()

  if (!bt) notFound()

  // Fetch recurring availability
  const { data: recurringAvailability } = await supabase
    .from('booking_recurring_availability')
    .select('day_of_week, start_time, end_time')
    .eq('booking_type_id', bt.id)

  return (
    <BookingPageClient
      photographer={{
        slug: photographer.slug ?? photographerSlug,
        fullName: photographer.full_name ?? '',
        studioName: photographer.studio_name ?? '',
        logoUrl: photographer.logo_url ?? null,
      }}
      bookingType={{
        ...bt,
        booking_recurring_availability: recurringAvailability ?? [],
      }}
    />
  )
}
