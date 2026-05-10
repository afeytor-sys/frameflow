import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('photographer_offer_templates')
    .select('id, name, intro_text, base_price, services, extras, gallery_links, created_at')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, intro_text, base_price, services, extras, gallery_links } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('photographer_offer_templates')
    .insert({
      photographer_id: user.id,
      name: name.trim(),
      intro_text: intro_text || null,
      base_price: base_price || null,
      services: services || [],
      extras: extras || [],
      gallery_links: gallery_links || [],
    })
    .select('id, name, intro_text, base_price, services, extras, gallery_links, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
