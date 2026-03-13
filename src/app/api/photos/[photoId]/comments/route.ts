import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch comments for a photo (photographer only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photo_comments')
    .select('*')
    .eq('photo_id', photoId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — client adds a comment (no auth, validated by token)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params
  const body = await req.json()
  const { client_name, comment, project_id, token } = body

  if (!client_name?.trim() || !comment?.trim() || !project_id || !token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Validate token belongs to this project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .eq('client_token', token)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  // Check comments are enabled for this gallery
  const { data: gallery } = await supabase
    .from('galleries')
    .select('comments_enabled')
    .eq('project_id', project_id)
    .single()

  if (gallery && gallery.comments_enabled === false) {
    return NextResponse.json({ error: 'Comments disabled' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('photo_comments')
    .insert({ photo_id: photoId, project_id, client_name: client_name.trim(), comment: comment.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — photographer deletes a comment
export async function DELETE(req: NextRequest) {
  const { commentId } = await req.json()
  const supabase = await createClient()

  const { error } = await supabase
    .from('photo_comments')
    .delete()
    .eq('id', commentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
