import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import OfferPublicClient from './OfferPublicClient'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params) {
  const { slug } = await params
  const service = createServiceClient()
  const { data } = await service
    .from('offers')
    .select('title, photographer:photographers(studio_name, full_name)')
    .eq('slug', slug)
    .single()
  if (!data) return { title: 'Angebot' }
  const photo = Array.isArray(data.photographer) ? data.photographer[0] : data.photographer
  const studio = photo?.studio_name || photo?.full_name || ''
  return { title: `${data.title}${studio ? ` · ${studio}` : ''}` }
}

export default async function OfferPublicPage({ params }: Params) {
  const { slug } = await params
  const service = createServiceClient()

  const { data: raw } = await service
    .from('offers')
    .select(`
      id, title, slug, status, event_date, valid_until,
      base_price, currency, deposit_amount, intro_text, notes, gallery_links,
      photographer:photographers(id, full_name, studio_name, logo_url, email, website),
      client:clients(full_name),
      services:offer_services(id, title, description, included, price, sort_order),
      extras:offer_extras(id, title, description, price, selectable, sort_order)
    `)
    .eq('slug', slug)
    .single()

  if (!raw) notFound()

  // Mark as viewed if currently 'sent'
  if (raw.status === 'sent') {
    service.from('offers').update({ status: 'viewed' }).eq('id', raw.id).then(() => {})
  }

  const photographer = Array.isArray(raw.photographer) ? raw.photographer[0] : raw.photographer
  const client = Array.isArray(raw.client) ? raw.client[0] : raw.client
  const services = [...(raw.services || [])].sort((a, b) => a.sort_order - b.sort_order)
  const extras = [...(raw.extras || [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <OfferPublicClient
      offer={{ ...raw, status: raw.status === 'sent' ? 'viewed' : raw.status }}
      photographer={photographer}
      clientName={client?.full_name || null}
      services={services}
      extras={extras}
    />
  )
}
