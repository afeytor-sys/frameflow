import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const galleryId = req.nextUrl.searchParams.get('galleryId')
  if (!galleryId) return NextResponse.json({ error: 'galleryId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, file_size, display_order, is_favorite, is_private, section_id')
    .eq('gallery_id', galleryId)
    .order('display_order', { ascending: true })

  if (error) {
    // Fallback without is_private
    const { data: fallback, error: err2 } = await supabase
      .from('photos')
      .select('id, storage_url, thumbnail_url, filename, file_size, display_order, is_favorite, section_id')
      .eq('gallery_id', galleryId)
      .order('display_order', { ascending: true })

    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 })
    return NextResponse.json({ photos: (fallback || []).map(p => ({ ...p, is_private: false })) })
  }

  return NextResponse.json({ photos: (data || []).map(p => ({ ...p, is_private: p.is_private ?? false })) })
}
