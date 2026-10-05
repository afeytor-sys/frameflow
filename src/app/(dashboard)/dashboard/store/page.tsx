import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreClient from './StoreClient'

export const metadata = { title: 'Store — Fotonizer' }

export default async function StorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, slug')
    .eq('id', user.id)
    .single()
  if (!photographer) redirect('/login')

  const [{ data: products }, { data: galleries }, { data: orders }, { data: coupons }] = await Promise.all([
    supabase
      .from('store_products')
      .select('id, slug, title, description, active, gallery_id, store_product_variants(id, label, price_cents, sort_order)')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('galleries')
      .select('id, title')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('store_orders')
      .select('*')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('store_coupons')
      .select('*')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <StoreClient
      photographerId={user.id}
      photographerSlug={photographer.slug}
      initialProducts={products ?? []}
      galleries={galleries ?? []}
      initialOrders={orders ?? []}
      initialCoupons={coupons ?? []}
    />
  )
}
