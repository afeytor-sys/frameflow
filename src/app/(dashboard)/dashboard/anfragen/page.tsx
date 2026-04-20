import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnfragenClient from './AnfragenClient'

export const metadata = { title: 'Buchungen — Fotonizer' }

export default async function AnfragenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, booking_types(title, price, duration_minutes, location_type, currency)')
    .eq('photographer_id', user.id)
    .order('booked_date', { ascending: true })

  const { data: settings } = await supabase
    .from('automation_settings')
    .select('auto_invoice_on_complete')
    .eq('photographer_id', user.id)
    .maybeSingle()

  return (
    <AnfragenClient
      initialBookings={bookings ?? []}
      autoInvoice={settings?.auto_invoice_on_complete ?? true}
    />
  )
}
