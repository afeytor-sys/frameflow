/**
 * Self-chaining ZIP worker.
 *
 * Each invocation handles ONE chunk of up to ZIP_CHUNK_SIZE photos → one ZIP file.
 * Photos within a chunk are streamed sequentially (no memory spikes).
 * After finishing a chunk it chains to the next via waitUntil.
 *
 * Example: 800 photos, ZIP_CHUNK_SIZE=250
 *   chunkIndex=0 → Teil 1 von 4 (photos 0–249)
 *   chunkIndex=1 → Teil 2 von 4 (photos 250–499)
 *   chunkIndex=2 → Teil 3 von 4 (photos 500–749)
 *   chunkIndex=3 → Teil 4 von 4 (photos 750–799) → marks ready, sends email
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { streamZipToR2 } from '@/lib/zipStreamUpload'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 300
export const runtime = 'nodejs'

/** Photos per ZIP file. Kept at 100 to stay within Hobby plan RAM (1 GB). */
const ZIP_CHUNK_SIZE = 100

interface DownloadPart {
  name: string
  key: string
  photo_count: number
  part_number: number
  total_parts: number
}

async function triggerNextChunk(base: string, galleryId: string, jobId: string, chunkIndex: number) {
  const res = await fetch(`${base}/api/galleries/${galleryId}/download/worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_TOKEN ?? ''}`,
    },
    body: JSON.stringify({ jobId, chunkIndex }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[worker] next-chunk ${chunkIndex} trigger failed: ${res.status} ${text}`)
  } else {
    console.log(`[worker] next-chunk ${chunkIndex} triggered OK`)
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
    console.error(`[worker] sendEmailOnce: invalid email="${email}" on job ${jobId}`)
    return
  }
  if (!downloadToken) {
    console.error(`[worker] sendEmailOnce: missing download_token on job ${jobId}`)
    return
  }

  // Re-read fresh from DB — /prepare may have updated email/token after job started
  const { data: freshJob } = await supabase
    .from('gallery_download_jobs')
    .select('email, download_token, email_sent_at')
    .eq('id', jobId)
    .single()

  const finalEmail = freshJob?.email || email
  const finalToken = freshJob?.download_token || downloadToken

  if (freshJob?.email_sent_at) {
    console.log(`[worker] email already sent at ${freshJob.email_sent_at} — skipping`)
    return
  }

  console.log(`[worker] sending email to ${finalEmail} for job ${jobId}`)
  try {
    await sendDownloadReadyEmail(galleryId, finalEmail, finalToken, partCount)
    await supabase
      .from('gallery_download_jobs')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', jobId)
    console.log(`[worker] email sent OK for job ${jobId}`)
  } catch (err) {
    console.error(`[worker] email send FAILED for job ${jobId}:`, err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader).trim()
  const expected = (process.env.INTERNAL_TOKEN ?? '').trim()

  console.log(`[worker] auth — len=${token.length}/${expected.length} match=${token === expected}`)

  if (!token || !expected || token !== expected) {
    console.error(`[worker] Unauthorized — token mismatch`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { galleryId } = await params
  // Accept both `chunkIndex` (new) and `batchIndex` (legacy) so old in-flight jobs still work
  const body = (await req.json()) as { jobId: string; chunkIndex?: number; batchIndex?: number }
  const { jobId } = body
  const chunkIndex = body.chunkIndex ?? body.batchIndex ?? 0
  const supabase = createServiceClient()

  console.log(`[worker] chunkIndex=${chunkIndex} jobId=${jobId} galleryId=${galleryId}`)

  if (chunkIndex === 0) {
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
        .select('email, download_token, parts')
        .eq('id', jobId)
        .single(),
    ])

    if (!allPhotos?.length) throw new Error('No photos found for this gallery')

    console.log(`[worker] ${allPhotos.length} photos total, email=${job?.email ?? 'none'}`)

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    // Split all photos into chunks of ZIP_CHUNK_SIZE — one ZIP per chunk
    const chunks: typeof allPhotos[] = []
    for (let i = 0; i < allPhotos.length; i += ZIP_CHUNK_SIZE) {
      chunks.push(allPhotos.slice(i, i + ZIP_CHUNK_SIZE))
    }
    const totalChunks = chunks.length

    console.log(`[worker] totalChunks=${totalChunks} (${ZIP_CHUNK_SIZE} photos/ZIP) chunkIndex=${chunkIndex}`)

    if (chunkIndex >= totalChunks) {
      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'ready' })
        .eq('id', jobId)
      return Response.json({ ok: true })
    }

    const chunk = chunks[chunkIndex]
    const partNumber = chunkIndex + 1
    const partName =
      totalChunks === 1
        ? `${baseTitle}.zip`
        : `${baseTitle} - Teil ${partNumber} von ${totalChunks}.zip`

    // Reuse same timestamp prefix across all chunks for consistent R2 key grouping
    const existingParts: DownloadPart[] = Array.isArray(job?.parts) ? job.parts as DownloadPart[] : []
    const timestamp = existingParts.length > 0
      ? (() => {
          const m = existingParts[0].key.match(/gallery-downloads\/[^/]+\/(\d+)-/)
          return m ? m[1] : String(Date.now())
        })()
      : String(Date.now())

    const key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`
    console.log(`[worker] building ZIP ${partNumber}/${totalChunks} — ${chunk.length} photos → ${key}`)

    // streamZipToR2 iterates photos sequentially — memory bounded regardless of chunk size
    const uploadedKey = await streamZipToR2(chunk, key, partName)
    console.log(`[worker] ZIP part ${partNumber} uploaded OK`)

    const newPart: DownloadPart = {
      name: partName,
      key: uploadedKey,
      photo_count: chunk.length,
      part_number: partNumber,
      total_parts: totalChunks,
    }
    const updatedParts = [
      ...existingParts.filter(p => p.part_number !== partNumber),
      newPart,
    ].sort((a, b) => a.part_number - b.part_number)

    const isLast = chunkIndex === totalChunks - 1

    if (isLast) {
      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'ready', parts: updatedParts, processed_parts: totalChunks })
        .eq('id', jobId)

      console.log(`[worker] job ${jobId} marked ready — sending email via waitUntil`)
      waitUntil(
        sendEmailOnce(supabase, galleryId, jobId, job?.email ?? '', job?.download_token ?? '', updatedParts.length)
      )
    } else {
      await supabase
        .from('gallery_download_jobs')
        .update({ parts: updatedParts, processed_parts: partNumber })
        .eq('id', jobId)

      const base =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

      waitUntil(triggerNextChunk(base, galleryId, jobId, chunkIndex + 1))
    }

    return Response.json({ ok: true, chunkIndex, totalChunks, photoCount: chunk.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[worker] FATAL error at chunkIndex=${chunkIndex}:`, message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: `Chunk ${chunkIndex + 1}: ${message}` })
      .eq('id', jobId)
    return Response.json({ error: message }, { status: 500 })
  }
}
