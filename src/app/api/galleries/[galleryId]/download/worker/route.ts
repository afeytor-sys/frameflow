/**
 * Long-running ZIP worker.
 *
 * Called by /prepare as a fire-and-forget request.
 * Protected by INTERNAL_TOKEN so it cannot be triggered externally.
 *
 * Flow:
 *   1. Load all photos for the gallery from Supabase
 *   2. Split into 700 MB batches
 *   3. For each batch: stream photos → ZIP → R2 multipart upload
 *   4. Store presigned GET URLs (24 h) in the job record
 *   5. Mark job as 'ready' (or 'failed' on error)
 *
 * maxDuration=300 supports galleries up to ~10 GB on Vercel Pro.
 * For larger galleries consider moving this to a dedicated long-running service.
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { batchBySize } from '@/lib/zipBatcher'
import { streamZipToR2 } from '@/lib/zipStreamUpload'

export const maxDuration = 300
export const runtime = 'nodejs'

interface DownloadPart {
  name: string
  url: string
  photo_count: number
  part_number: number
  total_parts: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  // Internal-only endpoint — reject requests without the secret token.
  const token = req.headers.get('x-internal-token')
  if (!token || token !== process.env.INTERNAL_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { galleryId } = await params
  const { jobId } = (await req.json()) as { jobId: string }
  const supabase = createServiceClient()

  // Mark the job as processing so the client knows work has started.
  await supabase
    .from('gallery_download_jobs')
    .update({ status: 'processing' })
    .eq('id', jobId)

  try {
    // Load gallery metadata and photos.
    const [{ data: gallery }, { data: photos }] = await Promise.all([
      supabase.from('galleries').select('title').eq('id', galleryId).single(),
      supabase
        .from('photos')
        .select('id, storage_url, filename, file_size')
        .eq('gallery_id', galleryId)
        .order('display_order', { ascending: true }),
    ])

    if (!photos?.length) throw new Error('No photos found for this gallery')

    // Safe base name for ZIP files.
    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    // Split into ≤700 MB batches.
    const batches = batchBySize(photos, 700 * 1024 * 1024)
    const totalParts = batches.length
    const timestamp = Date.now()
    const parts: DownloadPart[] = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const partName =
        totalParts === 1 ? `${baseTitle}.zip` : `${baseTitle} - Teil ${i + 1} von ${totalParts}.zip`

      // Unique key under gallery-downloads/ — never conflicts with photo keys.
      const key = `gallery-downloads/${galleryId}/${timestamp}-part${i + 1}.zip`

      // Stream photos → ZIP → R2. Returns a presigned GET URL.
      const url = await streamZipToR2(batch, key, partName)

      parts.push({
        name: partName,
        url,
        photo_count: batch.length,
        part_number: i + 1,
        total_parts: totalParts,
      })

      // Update progress after each part so the client can show partial progress.
      await supabase
        .from('gallery_download_jobs')
        .update({ parts, processed_parts: i + 1 })
        .eq('id', jobId)
    }

    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'ready', parts, processed_parts: totalParts })
      .eq('id', jobId)

    return Response.json({ ok: true, parts: parts.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: message })
      .eq('id', jobId)

    return Response.json({ error: message }, { status: 500 })
  }
}
