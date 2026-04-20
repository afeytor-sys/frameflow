import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingTypesClient from './BookingTypesClient'

export const metadata = { title: 'Booking Types — Fotonizer' }

export default async function BookingTypesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, slug, email, full_name, studio_name, bank_account_holder, bank_iban, bank_bic, plan, google_calendar_refresh_token')
    .eq('id', user.id)
    .single()

  if (!photographer) redirect('/login')

  const { data: bookingTypes } = await supabase
    .from('booking_types')
    .select('*, booking_recurring_availability(*)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <BookingTypesClient
      photographer={photographer}
      initialBookingTypes={bookingTypes ?? []}
    />
  )
}
