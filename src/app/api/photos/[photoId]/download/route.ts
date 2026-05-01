import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params
  const service = createServiceClient()

  const { data: photo } = await service
    .from('photos')
    .select('storage_url, filename')
    .eq('id', photoId)
    .single()

  if (!photo?.storage_url) {
    return new Response('Photo not found', { status: 404 })
  }

  const upstream = await fetch(photo.storage_url)
  if (!upstream.ok) {
    return new Response('Failed to fetch photo', { status: 502 })
  }

  const safe = (photo.filename || 'photo.jpg').replace(/[^\w\s\-_.()]/g, '_')

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}
