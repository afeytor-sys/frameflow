import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

function generateSlug(): string {
  return (
    Math.random().toString(36).slice(2, 7) +
    Math.random().toString(36).slice(2, 7)
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, client_id, client_name, event_date, valid_until, base_price,
    deposit_amount, intro_text, notes, gallery_links,
    services, extras,
  } = body

  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const service = createServiceClient()

  let slug = generateSlug()
  // Ensure slug uniqueness (retry on collision)
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await service.from('offers').select('id').eq('slug', slug).single()
    if (!existing) break
    slug = generateSlug()
  }

  const { data: offer, error } = await service
    .from('offers')
    .insert({
      photographer_id: user.id,
      title: title.trim(),
      slug,
      client_id: client_id || null,
      client_name: client_id ? null : (client_name?.trim() || null),
      event_date: event_date || null,
      valid_until: valid_until || null,
      base_price: base_price ?? 0,
      deposit_amount: deposit_amount || null,
      intro_text: intro_text?.trim() || null,
      notes: notes?.trim() || null,
      gallery_links: gallery_links ?? [],
    })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert services
  if (Array.isArray(services) && services.length > 0) {
    const rows = services.map((s: { title: string; description?: string; included?: boolean; price?: number }, i: number) => ({
      offer_id: offer.id,
      title: s.title,
      description: s.description || null,
      included: s.included ?? true,
      price: s.price ?? null,
      sort_order: i,
    }))
    await service.from('offer_services').insert(rows)
  }

  // Insert extras
  if (Array.isArray(extras) && extras.length > 0) {
    const rows = extras.map((e: { title: string; description?: string; price?: number; selectable?: boolean }, i: number) => ({
      offer_id: offer.id,
      title: e.title,
      description: e.description || null,
      price: e.price ?? 0,
      selectable: e.selectable ?? true,
      sort_order: i,
    }))
    await service.from('offer_extras').insert(rows)
  }

  return NextResponse.json({ id: offer.id, slug: offer.slug }, { status: 201 })
}
