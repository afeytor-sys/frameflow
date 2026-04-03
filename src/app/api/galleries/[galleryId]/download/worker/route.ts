/**
 * Self-chaining ZIP worker.
 *
 * Processes ONE batch of photos per invocation to stay within Vercel's
 * function duration limits (10s on Hobby, 300s on Pro).
 *
 * Flow:
 *   1. Load all photos for the gallery, split into fixed-size batches
 *   2. Process the batch at index `batchIndex` — stream photos → ZIP → R2
 *   3. Store the result key in the job record
 *   4. If more batches remain, fire a new invocation for batchIndex + 1
 *   5. Last batch sends the "download ready" email
 *
 * Each batch is ≤ BATCH_PHOTOS photos, small enough to finish in under 10s
 * on Vercel Hobby for typical photo sizes.
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { streamZipToR2 } from '@/lib/zipStreamUpload'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 300 // capped at 10s on Hobby, 300s on Pro
export const runtime = 'nodejs'

// Max photos per batch invocation — keep small enough to finish in < 9s on Hobby.
// Each photo fetch+stream takes ~0.2–1s depending on size and connection.
const BATCH_PHOTOS = 25

interface DownloadPart {
  name: string
  key: string
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
  const { jobId, batchIndex = 0 } = (await req.json()) as { jobId: string; batchIndex?: number }
  const supabase = createServiceClient()

  // Mark as processing on first batch only
  if (batchIndex === 0) {
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)
  }

  try {
    // Load all photos + job metadata
    const [{ data: gallery }, { data: allPhotos }, { data: job }] = await Promise.all([
      supabase.from('galleries').select('title').eq('id', galleryId).single(),
      supabase
        .from('photos')
        .select('id, storage_url, filename, file_size')
        .eq('gallery_id', galleryId)
        .order('display_order', { ascending: true }),
      supabase
        .from('gallery_download_jobs')
        .select('email, download_token, parts, processed_parts')
        .eq('id', jobId)
        .single(),
    ])

    if (!allPhotos?.length) throw new Error('No photos found for this gallery')

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    // Split all photos into fixed-size batches
    const batches: typeof allPhotos[] = []
    for (let i = 0; i < allPhotos.length; i += BATCH_PHOTOS) {
      batches.push(allPhotos.slice(i, i + BATCH_PHOTOS))
    }
    const totalBatches = batches.length

    if (batchIndex >= totalBatches) {
      // Shouldn't happen, but guard anyway
      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'ready' })
        .eq('id', jobId)
      return Response.json({ ok: true })
    }

    const batch = batches[batchIndex]
    const partNumber = batchIndex + 1
    const partName =
      totalBatches === 1
        ? `${baseTitle}.zip`
        : `${baseTitle} - Teil ${partNumber} von ${totalBatches}.zip`

    const timestamp = job?.parts ?
      // Reuse same timestamp prefix so all parts have a consistent key prefix
      (() => {
        const existingParts = Array.isArray(job.parts) ? job.parts as DownloadPart[] : []
        if (existingParts.length > 0) {
          const match = existingParts[0].key.match(/gallery-downloads\/[^/]+\/(\d+)-/)
          return match ? match[1] : String(Date.now())
        }
        return String(Date.now())
      })()
      : String(Date.now())

    const key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`
    const uploadedKey = await streamZipToR2(batch, key, partName)

    // Merge new part into existing parts array
    const existingParts: DownloadPart[] = Array.isArray(job?.parts) ? job.parts as DownloadPart[] : []
    const newPart: DownloadPart = {
      name: partName,
      key: uploadedKey,
      photo_count: batch.length,
      part_number: partNumber,
      total_parts: totalBatches,
    }
    // Replace if re-running same batch index, otherwise append
    const updatedParts = [
      ...existingParts.filter(p => p.part_number !== partNumber),
      newPart,
    ].sort((a, b) => a.part_number - b.part_number)

    const isLastBatch = batchIndex === totalBatches - 1

    if (isLastBatch) {
      // All done — mark ready and send email
      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'ready', parts: updatedParts, processed_parts: totalBatches })
        .eq('id', jobId)

      const { data: finalJob } = await supabase
        .from('gallery_download_jobs')
        .select('email, download_token')
        .eq('id', jobId)
        .single()

      const email = finalJob?.email ?? job?.email
      const downloadToken = finalJob?.download_token ?? job?.download_token

      if (email && downloadToken) {
        await sendDownloadReadyEmail(galleryId, email, downloadToken, updatedParts.length)
      } else {
        console.warn('[worker] No email/token on job', jobId, '— skipping email')
      }
    } else {
      // Save progress and trigger next batch
      await supabase
        .from('gallery_download_jobs')
        .update({ parts: updatedParts, processed_parts: partNumber })
        .eq('id', jobId)

      const base =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

      // waitUntil ensures the next-batch fetch is sent before this function terminates
      waitUntil(
        fetch(`${base}/api/galleries/${galleryId}/download/worker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': process.env.INTERNAL_TOKEN ?? '',
          },
          body: JSON.stringify({ jobId, batchIndex: batchIndex + 1 }),
        }).catch(err => console.error('[worker] next-batch trigger failed:', err))
      )
    }

    return Response.json({ ok: true, batchIndex, totalBatches })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[worker] error at batchIndex', batchIndex, ':', message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: `Batch ${batchIndex + 1}: ${message}` })
      .eq('id', jobId)

    return Response.json({ error: message }, { status: 500 })
  }
}
