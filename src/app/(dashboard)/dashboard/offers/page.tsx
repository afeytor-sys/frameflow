import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OffersClient from './OffersClient'

export const metadata = { title: 'Angebote' }

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: photographer }, { data: offers }, { data: clients }, { data: servicePresets }] = await Promise.all([
    supabase
      .from('photographers')
      .select('id, full_name, studio_name, logo_url, email')
      .eq('id', user.id)
      .single(),
    supabase
      .from('offers')
      .select(`
        id, title, slug, status, event_date, valid_until,
        base_price, currency, deposit_amount, intro_text, notes, gallery_links, created_at,
        client:clients(id, full_name, email),
        services:offer_services(id, title, description, included, price, sort_order),
        extras:offer_extras(id, title, description, price, selectable, sort_order)
      `)
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('photographer_id', user.id)
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('photographer_service_presets')
      .select('id, title, description, price, sort_order')
      .eq('photographer_id', user.id)
      .order('sort_order')
      .order('created_at'),
  ])

  return (
    <OffersClient
      initialOffers={offers || []}
      clients={clients || []}
      photographer={photographer}
      initialServicePresets={servicePresets || []}
    />
  )
}
