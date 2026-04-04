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
 *   5. Last batch marks job 'ready', then sends email via waitUntil
 *      (waitUntil keeps the function alive after Response is returned,
 *      so the 10s Hobby limit does not kill the email send)
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { streamZipToR2 } from '@/lib/zipStreamUpload'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 300
export const runtime = 'nodejs'

const BATCH_PHOTOS = 25

interface DownloadPart {
  name: string
  key: string
  photo_count: number
  part_number: number
  total_parts: number
}

async function triggerNextBatch(base: string, galleryId: string, jobId: string, nextIndex: number) {
  const res = await fetch(`${base}/api/galleries/${galleryId}/download/worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_TOKEN ?? ''}`,
    },
    body: JSON.stringify({ jobId, batchIndex: nextIndex }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[worker] next-batch ${nextIndex} trigger failed: ${res.status} ${text}`)
  } else {
    console.log(`[worker] next-batch ${nextIndex} triggered OK`)
  }
}

async function sendEmailOnce(
  supabase: ReturnType<typeof createServiceClient>,
  galleryId: string,
  jobId: string,
  email: string,
  downloadToken: string,
  partCount: number,
) {
  if (!email || !email.includes('@')) {
    console.error(`[worker] sendEmailOnce: empty/invalid email on job ${jobId} — cannot send`)
    return
  }
  if (!downloadToken) {
    console.error(`[worker] sendEmailOnce: missing download_token on job ${jobId} — cannot send`)
    return
  }

  // Re-read fresh from DB to get latest email/token (may have been updated by /prepare after job started)
  const { data: freshJob } = await supabase
    .from('gallery_download_jobs')
    .select('email, download_token, email_sent_at')
    .eq('id', jobId)
    .single()

  const finalEmail = freshJob?.email || email
  const finalToken = freshJob?.download_token || downloadToken

  console.log(`[worker] sendEmailOnce: job=${jobId} email=${finalEmail} token=${finalToken.slice(0, 8)}...`)

  if (freshJob?.email_sent_at) {
    console.log(`[worker] email already sent for job ${jobId} at ${freshJob.email_sent_at} — skipping`)
    return
  }

  console.log(`[worker] sending download-ready email to ${finalEmail} for job ${jobId}`)
  try {
    await sendDownloadReadyEmail(galleryId, finalEmail, finalToken, partCount)

    await supabase
      .from('gallery_download_jobs')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', jobId)

    console.log(`[worker] email sent OK for job ${jobId}`)
  } catch (err) {
    console.error(`[worker] email send FAILED for job ${jobId}:`, err)
    // Do not throw — ZIP is ready, email failure should not mark job failed.
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader).trim()
  const expected = (process.env.INTERNAL_TOKEN ?? '').trim()

  console.log(`[worker] auth — received="${token.slice(0, 8)}..." expected="${expected.slice(0, 8)}..." len=${token.length}/${expected.length} match=${token === expected}`)

  if (!token || !expected || token !== expected) {
    console.error(`[worker] Unauthorized — token mismatch`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { galleryId } = await params
  const { jobId, batchIndex = 0 } = (await req.json()) as { jobId: string; batchIndex?: number }
  const supabase = createServiceClient()

  console.log(`[worker] starting batchIndex=${batchIndex} jobId=${jobId} galleryId=${galleryId}`)

  if (batchIndex === 0) {
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)
  }

  try {
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

    console.log(`[worker] ${allPhotos.length} total photos, email=${job?.email ?? 'none'}`)

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    const batches: typeof allPhotos[] = []
    for (let i = 0; i < allPhotos.length; i += BATCH_PHOTOS) {
      batches.push(allPhotos.slice(i, i + BATCH_PHOTOS))
    }
    const totalBatches = batches.length

    console.log(`[worker] totalBatches=${totalBatches} batchIndex=${batchIndex}`)

    if (batchIndex >= totalBatches) {
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

    const existingParts: DownloadPart[] = Array.isArray(job?.parts) ? job.parts as DownloadPart[] : []
    const timestamp = existingParts.length > 0
      ? (() => {
          const match = existingParts[0].key.match(/gallery-downloads\/[^/]+\/(\d+)-/)
          return match ? match[1] : String(Date.now())
        })()
      : String(Date.now())

    const key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`
    console.log(`[worker] uploading ZIP part ${partNumber}/${totalBatches} key=${key}`)

    const uploadedKey = await streamZipToR2(batch, key, partName)
    console.log(`[worker] ZIP part ${partNumber} uploaded OK`)

    const newPart: DownloadPart = {
      name: partName,
      key: uploadedKey,
      photo_count: batch.length,
      part_number: partNumber,
      total_parts: totalBatches,
    }
    const updatedParts = [
      ...existingParts.filter(p => p.part_number !== partNumber),
      newPart,
    ].sort((a, b) => a.part_number - b.part_number)

    const isLastBatch = batchIndex === totalBatches - 1

    if (isLastBatch) {
      // Mark ready BEFORE sending email so the job is complete even if email fails
      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'ready', parts: updatedParts, processed_parts: totalBatches })
        .eq('id', jobId)

      console.log(`[worker] job ${jobId} marked ready — scheduling email via waitUntil`)

      const email = job?.email ?? ''
      const downloadToken = job?.download_token ?? ''

      // waitUntil keeps the Vercel function alive after we return the Response,
      // so the 10s Hobby limit does not kill the email send.
      waitUntil(
        sendEmailOnce(supabase, galleryId, jobId, email, downloadToken, updatedParts.length)
      )
    } else {
      await supabase
        .from('gallery_download_jobs')
        .update({ parts: updatedParts, processed_parts: partNumber })
        .eq('id', jobId)

      const base =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

      waitUntil(triggerNextBatch(base, galleryId, jobId, batchIndex + 1))
    }

    return Response.json({ ok: true, batchIndex, totalBatches })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[worker] FATAL error at batchIndex=${batchIndex}:`, message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: `Batch ${batchIndex + 1}: ${message}` })
      .eq('id', jobId)

    return Response.json({ error: message }, { status: 500 })
  }
}
