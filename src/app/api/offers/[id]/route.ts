import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const service = createServiceClient()

  // Verify ownership
  const { data: existing } = await service.from('offers').select('id').eq('id', id).eq('photographer_id', user.id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const {
    title, client_id, event_date, valid_until, base_price,
    deposit_amount, intro_text, notes, gallery_links, status,
    services, extras,
  } = body

  // Update offer fields
  const patch: Record<string, unknown> = {}
  if (title !== undefined) patch.title = title?.trim()
  if (client_id !== undefined) patch.client_id = client_id || null
  if (event_date !== undefined) patch.event_date = event_date || null
  if (valid_until !== undefined) patch.valid_until = valid_until || null
  if (base_price !== undefined) patch.base_price = base_price
  if (deposit_amount !== undefined) patch.deposit_amount = deposit_amount || null
  if (intro_text !== undefined) patch.intro_text = intro_text?.trim() || null
  if (notes !== undefined) patch.notes = notes?.trim() || null
  if (gallery_links !== undefined) patch.gallery_links = gallery_links
  if (status !== undefined) patch.status = status

  if (Object.keys(patch).length > 0) {
    const { error } = await service.from('offers').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace services if provided
  if (Array.isArray(services)) {
    await service.from('offer_services').delete().eq('offer_id', id)
    if (services.length > 0) {
      await service.from('offer_services').insert(
        services.map((s: { title: string; description?: string; included?: boolean; price?: number }, i: number) => ({
          offer_id: id,
          title: s.title,
          description: s.description || null,
          included: s.included ?? true,
          price: s.price ?? null,
          sort_order: i,
        }))
      )
    }
  }

  // Replace extras if provided
  if (Array.isArray(extras)) {
    await service.from('offer_extras').delete().eq('offer_id', id)
    if (extras.length > 0) {
      await service.from('offer_extras').insert(
        extras.map((e: { title: string; description?: string; price?: number; selectable?: boolean }, i: number) => ({
          offer_id: id,
          title: e.title,
          description: e.description || null,
          price: e.price ?? 0,
          selectable: e.selectable ?? true,
          sort_order: i,
        }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()

  const { error } = await service
    .from('offers')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
