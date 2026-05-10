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
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.intro_text !== undefined) update.intro_text = body.intro_text
  if (body.base_price !== undefined) update.base_price = body.base_price
  if (body.services !== undefined) update.services = body.services
  if (body.extras !== undefined) update.extras = body.extras
  if (body.gallery_links !== undefined) update.gallery_links = body.gallery_links

  const service = createServiceClient()
  const { data, error } = await service
    .from('photographer_offer_templates')
    .update(update)
    .eq('id', id)
    .eq('photographer_id', user.id)
    .select('id, name, intro_text, base_price, services, extras, gallery_links')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service
    .from('photographer_offer_templates')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
