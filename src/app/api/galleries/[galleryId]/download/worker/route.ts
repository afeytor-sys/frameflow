/**
 * Long-running ZIP worker.
 *
 * Flow:
 *   1. Load all photos for the gallery
 *   2. Split into ≤2 GB batches
 *   3. Per batch: stream photos → ZIP → R2 (stores key, not presigned URL)
 *   4. Persist R2 keys in the job record
 *   5. Send "download ready" email to job.email
 *   6. Mark job as 'ready' (or 'failed' on error)
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { batchBySize } from '@/lib/zipBatcher'
import { streamZipToR2 } from '@/lib/zipStreamUpload'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'

export const maxDuration = 300
export const runtime = 'nodejs'

interface DownloadPart {
  name: string
  key: string               // R2 object key — presigned URL generated on demand
  photo_count: number
  part_number: number
  total_parts: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const token = req.headers.get('x-internal-token')
  if (!token || token !== process.env.INTERNAL_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { galleryId } = await params
  const { jobId } = (await req.json()) as { jobId: string }
  const supabase = createServiceClient()

  await supabase
    .from('gallery_download_jobs')
    .update({ status: 'processing' })
    .eq('id', jobId)

  try {
    const [{ data: gallery }, { data: photos }, { data: job }] = await Promise.all([
      supabase.from('galleries').select('title').eq('id', galleryId).single(),
      supabase
        .from('photos')
        .select('id, storage_url, filename, file_size')
        .eq('gallery_id', galleryId)
        .order('display_order', { ascending: true }),
      supabase
        .from('gallery_download_jobs')
        .select('email, download_token')
        .eq('id', jobId)
        .single(),
    ])

    if (!photos?.length) throw new Error('No photos found for this gallery')

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    // 2 GB per ZIP — keeps individual files manageable for most systems
    const batches = batchBySize(photos, 2000 * 1024 * 1024)
    const totalParts = batches.length
    const timestamp = Date.now()
    const parts: DownloadPart[] = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const partName =
        totalParts === 1
          ? `${baseTitle}.zip`
          : `${baseTitle} - Teil ${i + 1} von ${totalParts}.zip`

      const key = `gallery-downloads/${galleryId}/${timestamp}-part${i + 1}.zip`

      // streamZipToR2 returns the R2 key (not a presigned URL)
      const uploadedKey = await streamZipToR2(batch, key, partName)

      parts.push({
        name: partName,
        key: uploadedKey,
        photo_count: batch.length,
        part_number: i + 1,
        total_parts: totalParts,
      })

      await supabase
        .from('gallery_download_jobs')
        .update({ parts, processed_parts: i + 1 })
        .eq('id', jobId)
    }

    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'ready', parts, processed_parts: totalParts })
      .eq('id', jobId)

    // Send email — re-read email/token in case /prepare updated them while we ran
    const { data: updatedJob } = await supabase
      .from('gallery_download_jobs')
      .select('email, download_token')
      .eq('id', jobId)
      .single()

    const email = updatedJob?.email ?? job?.email
    const downloadToken = updatedJob?.download_token ?? job?.download_token

    if (email && downloadToken) {
      await sendDownloadReadyEmail(galleryId, email, downloadToken, parts.length)
    } else {
      console.warn('[worker] No email/token on job', jobId, '— skipping email send')
    }

    return Response.json({ ok: true, parts: parts.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[worker] error:', message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: message })
      .eq('id', jobId)

    return Response.json({ error: message }, { status: 500 })
  }
}
