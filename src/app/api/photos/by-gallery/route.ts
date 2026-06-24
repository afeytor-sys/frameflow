import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const PAGE = 1000

async function fetchAllPhotos(supabase: ReturnType<typeof createServiceClient>, galleryId: string) {
  const all: unknown[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('photos')
      .select('id, storage_url, thumbnail_url, filename, file_size, display_order, is_favorite, is_private, section_id')
      .eq('gallery_id', galleryId)
      .order('display_order', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

export async function GET(req: NextRequest) {
  const galleryId = req.nextUrl.searchParams.get('galleryId')
  if (!galleryId) return NextResponse.json({ error: 'galleryId required' }, { status: 400 })

  const supabase = createServiceClient()

  try {
    const photos = await fetchAllPhotos(supabase, galleryId)
    return NextResponse.json({ photos: photos.map((p: unknown) => ({ ...(p as Record<string, unknown>), is_private: (p as Record<string, unknown>).is_private ?? false })) })
  } catch {
    // Fallback without is_private column
    try {
      const all: unknown[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('photos')
          .select('id, storage_url, thumbnail_url, filename, file_size, display_order, is_favorite, section_id')
          .eq('gallery_id', galleryId)
          .order('display_order', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error || !data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE) break
        from += PAGE
      }
      return NextResponse.json({ photos: all.map((p: unknown) => ({ ...(p as Record<string, unknown>), is_private: false })) })
    } catch (err2) {
      return NextResponse.json({ error: String(err2) }, { status: 500 })
    }
  }
}
