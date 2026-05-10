import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  let query = supabase
    .from('photographer_content_presets')
    .select('id, preset_type, name, data, created_at')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('preset_type', type)

  const { data } = await query
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { preset_type, name, data: presetData } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!['intro', 'link', 'textblock'].includes(preset_type)) {
    return NextResponse.json({ error: 'invalid preset_type' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('photographer_content_presets')
    .insert({
      photographer_id: user.id,
      preset_type,
      name: name.trim(),
      data: presetData || {},
    })
    .select('id, preset_type, name, data, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
