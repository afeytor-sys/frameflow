/**
 * Single-invocation ZIP worker.
 *
 * One function call handles all batches sequentially.
 * maxDuration=300 (5 min) covers galleries up to ~10 GB on Vercel Pro.
 *
 * Resume logic: if the job already has completed parts (from a previous
 * interrupted run), those batches are skipped. Only missing parts are built.
 *
 * Flow:
 *   1. Validate auth
 *   2. Mark job → 'processing'
 *   3. Load all photos + existing job.parts from DB
 *   4. Split photos into ≤3 GB batches (by file_size)
 *   5. For each batch:
 *        - Skip if already in job.parts (resume)
 *        - Stream photos → ZIP → R2 (streamZipToR2)
 *        - Persist part immediately in DB
 *   6. Mark job → 'ready'
 *   7. Send email (only once, only when all done)
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
  // Auth: accept Bearer token (current) or x-internal-token (legacy header)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const legacyToken = (req.headers.get('x-internal-token') ?? '').trim()
  const expected = (process.env.INTERNAL_TOKEN ?? '').trim()

  if (!expected || (bearerToken !== expected && legacyToken !== expected)) {
    console.error('[worker] Unauthorized — token mismatch')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { galleryId } = await params
  const { jobId } = (await req.json()) as { jobId: string }
  const supabase = createServiceClient()

  console.log(`[worker] START — jobId=${jobId} galleryId=${galleryId}`)

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
        .select('email, download_token, parts, email_sent_at')
        .eq('id', jobId)
        .single(),
    ])

    if (!allPhotos?.length) throw new Error('No photos found for this gallery')

    // ── Resume: load already-completed parts ─────────────────────────────
    const existingParts: DownloadPart[] = Array.isArray(job?.parts)
      ? (job.parts as DownloadPart[])
      : []
    const completedNums = new Set(existingParts.map(p => p.part_number))

    console.log(
      `[worker] jobId=${jobId} photos=${allPhotos.length} existingParts=${existingParts.length}` +
      (existingParts.length > 0 ? ` completedNums=[${[...completedNums].join(',')}]` : ' (fresh start)')
    )

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    // ── Split into ≤3 GB batches by actual file_size ──────────────────────
    const batches = batchBySize(allPhotos, 3_000_000_000)
    const totalParts = batches.length

    // Reuse timestamp prefix from existing parts so R2 keys stay grouped
    const timestamp = existingParts.length > 0
      ? (() => {
          const m = existingParts[0]?.key?.match(/\/(\d+)-part\d+\.zip$/)
          return m ? m[1] : String(Date.now())
        })()
      : String(Date.now())

    console.log(`[worker] jobId=${jobId} totalParts=${totalParts} timestamp=${timestamp}`)

    // Start accumulator with already-completed parts
    const parts: DownloadPart[] = [...existingParts]

    // ── Process each batch ────────────────────────────────────────────────
    for (let i = 0; i < batches.length; i++) {
      const partNumber = i + 1

      // Resume: skip batches already stored in DB
      if (completedNums.has(partNumber)) {
        console.log(`[worker] jobId=${jobId} part ${partNumber}/${totalParts} — already uploaded, skipping`)
        continue
      }

      const batch = batches[i]
      const partName =
        totalParts === 1
          ? `${baseTitle}.zip`
          : `${baseTitle} - Teil ${partNumber} von ${totalParts}.zip`

      const key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`

      console.log(
        `[worker] jobId=${jobId} part ${partNumber}/${totalParts} START — ` +
        `${batch.length} photos, key=${key}`
      )

      const uploadedKey = await streamZipToR2(batch, key, partName)

      const newPart: DownloadPart = {
        name: partName,
        key: uploadedKey,
        photo_count: batch.length,
        part_number: partNumber,
        total_parts: totalParts,
      }

      // Upsert into accumulator — prevent duplicate entries
      const idx = parts.findIndex(p => p.part_number === partNumber)
      if (idx >= 0) parts[idx] = newPart
      else parts.push(newPart)
      parts.sort((a, b) => a.part_number - b.part_number)

      // Persist immediately — progress is never lost even if worker is interrupted
      await supabase
        .from('gallery_download_jobs')
        .update({ parts, processed_parts: parts.length })
        .eq('id', jobId)

      console.log(`[worker] jobId=${jobId} part ${partNumber}/${totalParts} DONE — ${uploadedKey}`)
    }

    // ── All batches complete → mark ready ────────────────────────────────
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'ready', parts, processed_parts: totalParts })
      .eq('id', jobId)

    console.log(`[worker] jobId=${jobId} marked ready — ${parts.length} parts total`)

    // ── Send email (once, only when fully ready) ──────────────────────────
    // Re-read from DB — /prepare may have updated email/token while we ran
    const { data: finalJob, error: finalJobErr } = await supabase
      .from('gallery_download_jobs')
      .select('email, download_token, email_sent_at')
      .eq('id', jobId)
      .single()

    const email = finalJob?.email ?? job?.email
    const downloadToken = finalJob?.download_token ?? job?.download_token

    // ── PRE-SEND DIAGNOSTIC ───────────────────────────────────────────────
    console.log(`[worker] EMAIL CHECK jobId=${jobId}`)
    console.log(`[worker]   status=ready processed_parts=${parts.length}/${totalParts}`)
    console.log(`[worker]   finalJob DB read error: ${finalJobErr?.message ?? 'none'}`)
    console.log(`[worker]   email="${email ?? 'MISSING'}"`)
    console.log(`[worker]   downloadToken="${downloadToken ? downloadToken.slice(0, 8) + '...' : 'MISSING'}"`)
    console.log(`[worker]   email_sent_at="${finalJob?.email_sent_at ?? 'null'}"`)

    if (finalJob?.email_sent_at) {
      console.log(`[worker] jobId=${jobId} email already sent at ${finalJob.email_sent_at} — skipping`)
    } else if (email && downloadToken) {
      console.log(`[worker] SENDING EMAIL jobId=${jobId} to="${email}" parts=${parts.length}`)
      await sendDownloadReadyEmail(galleryId, email, downloadToken, parts.length)
      await supabase
        .from('gallery_download_jobs')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', jobId)
      console.log(`[worker] jobId=${jobId} email sent OK`)
    } else {
      console.warn(`[worker] SKIPPING EMAIL jobId=${jobId} — email="${email ?? 'null'}" token="${downloadToken ? 'present' : 'null'}"`)
    }

    return Response.json({ ok: true, parts: parts.length })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[worker] FATAL jobId=${jobId}:`, message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: message })
      .eq('id', jobId)
    return Response.json({ error: message }, { status: 500 })
  }
}
