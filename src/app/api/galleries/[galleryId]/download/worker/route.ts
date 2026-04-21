/**
 * Single-invocation ZIP worker.
 *
 * One function call handles all batches sequentially.
 * maxDuration=300 supports galleries up to ~10 GB on Vercel Pro.
 *
 * Flow:
 *   1. Load all photos for the gallery
 *   2. Split into ≤2 GB batches by actual file_size
 *   3. Per batch: stream photos → ZIP → R2
 *   4. Mark job 'ready', send email
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
  key: string
  photo_count: number
  part_number: number
  total_parts: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const legacyToken = (req.headers.get('x-internal-token') ?? '').trim()
  const expected = (process.env.INTERNAL_TOKEN ?? '').trim()

  if (!expected || (bearerToken !== expected && legacyToken !== expected)) {
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
    const [{ data: gallery }, { data: allPhotos }, { data: job }] = await Promise.all([
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

    if (!allPhotos?.length) throw new Error('No photos found for this gallery')

    console.log(`[worker] ${allPhotos.length} photos, jobId=${jobId}`)

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    // Split by actual file size — 2 GB per ZIP
    const batches = batchBySize(allPhotos, 2000 * 1024 * 1024)
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
      console.log(`[worker] building part ${i + 1}/${totalParts} — ${batch.length} photos`)

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

    // Re-read to get latest email/token in case /prepare updated while we ran
    const { data: updatedJob } = await supabase
      .from('gallery_download_jobs')
      .select('email, download_token, email_sent_at')
      .eq('id', jobId)
      .single()

    const email = updatedJob?.email ?? job?.email
    const downloadToken = updatedJob?.download_token ?? job?.download_token

    if (email && downloadToken && !updatedJob?.email_sent_at) {
      console.log(`[worker] sending email to ${email}`)
      await sendDownloadReadyEmail(galleryId, email, downloadToken, parts.length)
      await supabase
        .from('gallery_download_jobs')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', jobId)
      console.log(`[worker] email sent OK`)
    }

    return Response.json({ ok: true, parts: parts.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[worker] FATAL error:', message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: message })
      .eq('id', jobId)
    return Response.json({ error: message }, { status: 500 })
  }
}
