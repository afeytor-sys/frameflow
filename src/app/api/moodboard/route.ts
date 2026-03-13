import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch moodboard items for a project (via token, public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const token = searchParams.get('token')

  if (!projectId || !token) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = await createClient()

  // Validate token
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('client_token', token)
    .single()

  if (!project) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const { data, error } = await supabase
    .from('moodboard_items')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — client adds a moodboard item (image URL or link)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, token, type, url, caption } = body

  if (!project_id || !token || !url) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Validate token
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .eq('client_token', token)
    .single()

  if (!project) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  // Get current max order
  const { data: existing } = await supabase
    .from('moodboard_items')
    .select('display_order')
    .eq('project_id', project_id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1

  const { data, error } = await supabase
    .from('moodboard_items')
    .insert({
      project_id,
      type: type || 'link',
      url: url.trim(),
      caption: caption?.trim() || null,
      display_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — photographer deletes a moodboard item (authenticated)
export async function DELETE(req: NextRequest) {
  const { itemId } = await req.json()
  const supabase = await createClient()

  const { error } = await supabase
    .from('moodboard_items')
    .delete()
    .eq('id', itemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
