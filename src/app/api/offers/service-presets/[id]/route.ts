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
  if (body.title !== undefined) update.title = body.title.trim()
  if (body.description !== undefined) update.description = body.description?.trim() || null
  if (body.price !== undefined) update.price = body.price

  const service = createServiceClient()
  const { data, error } = await service
    .from('photographer_service_presets')
    .update(update)
    .eq('id', id)
    .eq('photographer_id', user.id)
    .select('id, title, description, price, sort_order, preset_type')
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
    .from('photographer_service_presets')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
