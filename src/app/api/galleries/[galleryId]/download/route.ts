import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Zip, ZipPassThrough } from 'fflate'

// Allow up to 60 s on Vercel Pro; on Hobby the 10 s limit may apply for very
// large galleries, but streaming means the browser starts downloading immediately.
export const maxDuration = 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, download_enabled')
    .eq('id', galleryId)
    .single()

  if (!gallery?.download_enabled) {
    return new Response(JSON.stringify({ error: 'Download not available' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('storage_url, filename')
    .eq('gallery_id', galleryId)
    .order('display_order', { ascending: true })

  if (!photos?.length) {
    return new Response(JSON.stringify({ error: 'No photos found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Safe filename for the ZIP itself
  const zipName = (gallery.title || 'gallery')
    .replace(/[^\w\s\-_.]/g, '')
    .trim() || 'gallery'

  // Stream a ZIP — each photo is fetched from R2 and piped directly into
  // the response. Memory is bounded to ~1 batch (4 photos) at a time.
  const stream = new ReadableStream({
    async start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) { controller.error(err); return }
        controller.enqueue(chunk)
        if (final) controller.close()
      })

      const addPhoto = async (storage_url: string, filename: string) => {
        try {
          const r = await fetch(storage_url)
          if (!r.ok) return
          const data = new Uint8Array(await r.arrayBuffer())
          // Strip path separators to prevent ZIP-slip
          const safe = filename.replace(/[/\\]/g, '_') || 'photo.jpg'
          const entry = new ZipPassThrough(safe)  // STORE — images are already compressed
          zip.add(entry)
          entry.push(data, true)
        } catch {
          // Skip unreadable photos rather than aborting the whole ZIP
        }
      }

      // 4 concurrent fetches — fast without saturating memory
      for (let i = 0; i < photos.length; i += 4) {
        await Promise.all(photos.slice(i, i + 4).map(p => addPhoto(p.storage_url, p.filename)))
      }

      zip.end()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
