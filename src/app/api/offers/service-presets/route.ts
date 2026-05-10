import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('photographer_service_presets')
    .select('id, title, description, price, sort_order')
    .eq('photographer_id', user.id)
    .order('sort_order')
    .order('created_at')

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, price } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('photographer_service_presets')
    .insert({
      photographer_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      price: price ?? null,
    })
    .select('id, title, description, price, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
