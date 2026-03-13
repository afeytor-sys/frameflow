import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params
  const supabase = await createClient()

  // Fetch gallery + photos
  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, download_enabled, project:projects(photographer_id)')
    .eq('id', galleryId)
    .single()

  if (!gallery || !gallery.download_enabled) {
    return NextResponse.json({ error: 'Download not available' }, { status: 403 })
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_url, filename')
    .eq('gallery_id', galleryId)
    .order('display_order', { ascending: true })

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No photos found' }, { status: 404 })
  }

  // For large galleries, streaming ZIP would be ideal.
  // For now, we redirect to a simple approach: return a JSON list of URLs
  // that the client can use to download individually.
  // Full ZIP streaming requires a worker/edge function — scaffold here.

  // Return photo URLs as JSON for client-side batch download
  return NextResponse.json({
    title: gallery.title,
    photos: photos.map((p) => ({ url: p.storage_url, filename: p.filename })),
  })
}
