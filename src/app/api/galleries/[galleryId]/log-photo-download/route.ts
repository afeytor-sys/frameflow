import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params

  let body: { email?: string; photo_id?: string; filename?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, photo_id, filename } = body
  if (!email || !filename) {
    return NextResponse.json({ error: 'email and filename are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('gallery_photo_downloads')
    .insert({
      gallery_id: galleryId,
      photo_id: photo_id ?? null,
      email,
      filename,
    })

  if (error) {
    console.error('[log-photo-download]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
