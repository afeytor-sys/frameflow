/**
 * Cloudflare Worker — Fotonizer ZIP orchestrator
 *
 * This Worker does NOT generate ZIP files.
 * Heavy processing (streaming R2 reads, ZIP archiving, multipart upload) runs
 * on the Railway service — which has no CPU/memory limits.
 *
 * Architecture:
 *   HTTP handler  — auth → load photos → batch → INSERT gallery_download_parts rows
 *                   → enqueue one {jobId, partId} message per batch → return immediately
 *
 *   Queue consumer — load part row → mark processing
 *                    → POST to Railway /zip (synchronous, waits up to 12 min)
 *                    → mark done → check completion → send email if last part
 *
 * Race condition eliminated: each consumer owns exactly one gallery_download_parts row
 * (UNIQUE job_id + part_number). No JSONB read-modify-write.
 * max_concurrency=5 → up to 5 Railway ZIP builds run simultaneously.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface Env {
  R2: R2Bucket
  ZIP_QUEUE: Queue<ZipJobMessage>
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  INTERNAL_TOKEN: string
  RESEND_API_KEY: string
  APP_URL: string
  RAILWAY_ZIP_URL: string  // e.g. https://your-app.up.railway.app
}

interface Photo {
  id: string
  storage_url: string
  filename: string
  file_size: number
}

interface ZipJobMessage {
  jobId: string
  partId: string
}

interface DownloadPart {
  id: string
  job_id: string
  part_number: number
  total_parts: number
  gallery_id: string
  part_name: string
  r2_key: string
  photo_ids: string[]
  photo_count: number
  timestamp: string
  status: string
}

export default {
  // ── HTTP handler: auth → batch → INSERT parts → enqueue ──────────────────

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const auth = request.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token || token !== env.INTERNAL_TOKEN.trim()) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { jobId?: string; galleryId?: string }
    try {
      body = await request.json() as { jobId?: string; galleryId?: string }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { jobId, galleryId } = body
    if (!jobId || !galleryId) {
      return Response.json({ error: 'Missing jobId or galleryId' }, { status: 400 })
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    try {
      // Idempotency: skip if parts already inserted for this job
      const { count: existingCount } = await supabase
        .from('gallery_download_parts')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)

      if (existingCount && existingCount > 0) {
        console.log(`[dispatch] job ${jobId} already dispatched — ${existingCount} parts exist`)
        return Response.json({ ok: true, jobId, totalParts: existingCount, skipped: true })
      }

      const [{ data: allPhotos, error: photosErr }, { data: gallery }] = await Promise.all([
        supabase
          .from('photos')
          .select('id, storage_url, filename, file_size')
          .eq('gallery_id', galleryId)
          .order('display_order', { ascending: true }),
        supabase
          .from('galleries')
          .select('title')
          .eq('id', galleryId)
          .single(),
      ])

      if (photosErr || !allPhotos?.length) {
        throw new Error(`No photos: ${photosErr?.message ?? 'empty gallery'}`)
      }

      const baseTitle = (gallery?.title ?? 'gallery')
        .replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

      const batches = batchPhotos(allPhotos)
      const totalParts = batches.length
      const timestamp = String(Date.now())

      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'processing', total_parts: totalParts, processed_parts: 0 })
        .eq('id', jobId)

      for (let i = 0; i < batches.length; i++) {
        const partNumber = i + 1
        const batch = batches[i]
        const partName = totalParts === 1
          ? `${baseTitle}.zip`
          : `${baseTitle} - Teil ${partNumber} von ${totalParts}.zip`
        const r2Key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`

        const { data: part, error: insertErr } = await supabase
          .from('gallery_download_parts')
          .insert({
            job_id: jobId,
            part_number: partNumber,
            total_parts: totalParts,
            gallery_id: galleryId,
            part_name: partName,
            r2_key: r2Key,
            photo_ids: batch.map(p => p.id),
            photo_count: batch.length,
            timestamp,
          })
          .select('id')
          .single()

        if (insertErr || !part) {
          throw new Error(`Failed to insert part ${partNumber}: ${insertErr?.message ?? 'no id returned'}`)
        }

        await env.ZIP_QUEUE.send({ jobId, partId: part.id })
        console.log(`[dispatch] queued part ${partNumber}/${totalParts} — ${batch.length} photos — partId=${part.id}`)
      }

      return Response.json({ ok: true, jobId, totalParts })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[dispatch] fatal:', msg)
      await supabase
        .from('gallery_download_jobs')
        .update({ status: 'failed', error: msg })
        .eq('id', jobId)
      return Response.json({ error: msg }, { status: 500 })
    }
  },

  // ── Queue consumer ────────────────────────────────────────────────────────

  async queue(batch: MessageBatch<ZipJobMessage>, env: Env): Promise<void> {
    // DLQ handler — mark part + job as permanently failed
    if (batch.queue === 'fotonizer-zip-dlq') {
      for (const msg of batch.messages) {
        await handleDlqMessage(msg.body, env)
        msg.ack()
      }
      return
    }

    // Normal processing — max_batch_size=1 so this loop runs once
    for (const msg of batch.messages) {
      const { jobId, partId } = msg.body
      console.log(`[consumer] START partId=${partId} jobId=${jobId}`)

      try {
        await processZipPart(msg.body, env)
        msg.ack()
        console.log(`[consumer] Part completed — partId=${partId}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[consumer] FAIL partId=${partId}:`, message)

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        })
        await supabase
          .from('gallery_download_parts')
          .update({ status: 'failed', error: message })
          .eq('id', partId)

        msg.retry()
      }
    }
  },
}

// ── Part processor ────────────────────────────────────────────────────────────

async function processZipPart(job: ZipJobMessage, env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Load the part row
  const { data: part, error: partErr } = await supabase
    .from('gallery_download_parts')
    .select('*')
    .eq('id', job.partId)
    .single()

  if (partErr || !part) {
    throw new Error(`Part ${job.partId} not found: ${partErr?.message ?? 'null'}`)
  }

  const p = part as DownloadPart

  // Idempotency: skip if already completed (duplicate delivery)
  if (p.status === 'done') {
    console.log(`[consumer] part ${p.part_number}/${p.total_parts} already done — skipping`)
    return
  }

  // Mark processing
  await supabase
    .from('gallery_download_parts')
    .update({ status: 'processing' })
    .eq('id', job.partId)

  // Dispatch to Railway (responds 200 immediately, processes ZIP in background)
  // callRailwayZip polls DB until Railway marks the part done
  await callRailwayZip(p, env, supabase)

  console.log(`[consumer] part ${p.part_number}/${p.total_parts} marked done`)

  // Update progress counter on job (best-effort)
  const { count: doneCount } = await supabase
    .from('gallery_download_parts')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', job.jobId)
    .eq('status', 'done')

  await supabase
    .from('gallery_download_jobs')
    .update({ processed_parts: doneCount ?? 0 })
    .eq('id', job.jobId)

  // Completion check — count parts that are NOT done yet
  const { count: remaining } = await supabase
    .from('gallery_download_parts')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', job.jobId)
    .neq('status', 'done')

  if (remaining !== 0) {
    console.log(`[consumer] ${remaining} parts still pending`)
    return
  }

  // Atomic claim: only one consumer sends the email
  const { data: claimed } = await supabase
    .from('gallery_download_jobs')
    .update({ status: 'ready' })
    .eq('id', job.jobId)
    .neq('status', 'ready')
    .select('id, email, download_token')
    .maybeSingle()

  if (!claimed?.email || !claimed?.download_token) return

  console.log(`[consumer] all ${p.total_parts} parts done — sending email to ${claimed.email}`)
  await sendDownloadReadyEmail(
    p.gallery_id,
    claimed.email,
    claimed.download_token,
    p.total_parts,
    env,
    supabase,
  )
  await supabase
    .from('gallery_download_jobs')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', job.jobId)
  console.log('[consumer] email sent OK')
}

// ── Railway ZIP call ──────────────────────────────────────────────────────────

async function callRailwayZip(part: DownloadPart, env: Env, supabase: SupabaseClient): Promise<void> {
  if (!env.RAILWAY_ZIP_URL) throw new Error('RAILWAY_ZIP_URL not configured')

  const url = `${env.RAILWAY_ZIP_URL.replace(/\/$/, '')}/zip`

  console.log(`[consumer] Dispatching part to Railway — partId=${part.id} photos=${part.photo_count}`)

  // Railway responds 200 immediately and processes ZIP in background.
  // We use a 30s timeout just to confirm Railway accepted the request.
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({
      partId: part.id,
      photoIds: part.photo_ids,
      r2Key: part.r2_key,
      partName: part.part_name,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`Railway rejected ZIP request ${res.status}: ${body}`)
  }

  console.log(`[consumer] Railway accepted — polling DB for completion partId=${part.id}`)

  // Poll Supabase every 15s until Railway marks the part done (max 12 min)
  await pollPartCompletion(part.id, supabase)

  console.log(`[consumer] Railway response received — part=${part.part_number}/${part.total_parts}`)
}

async function pollPartCompletion(
  partId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const MAX_WAIT_MS = 12 * 60 * 1000  // 12 minutes
  const POLL_INTERVAL_MS = 15_000      // 15 seconds
  const start = Date.now()

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))

    const { data } = await supabase
      .from('gallery_download_parts')
      .select('status, error')
      .eq('id', partId)
      .single() as { data: { status: string; error: string | null } | null }

    if (data?.status === 'done') return
    if (data?.status === 'failed') {
      throw new Error(`Railway ZIP failed: ${data.error ?? 'unknown error'}`)
    }

    console.log(`[consumer] polling... status=${data?.status ?? 'unknown'} elapsed=${Math.round((Date.now() - start) / 1000)}s`)
  }

  throw new Error('Timeout: Railway ZIP did not complete within 12 minutes')
}

// ── DLQ handler ───────────────────────────────────────────────────────────────

async function handleDlqMessage(job: ZipJobMessage, env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  console.error(`[dlq] permanently failed partId=${job.partId} jobId=${job.jobId}`)
  await supabase
    .from('gallery_download_parts')
    .update({ status: 'failed', error: 'max retries exhausted — moved to DLQ' })
    .eq('id', job.partId)
  await supabase
    .from('gallery_download_jobs')
    .update({ status: 'failed', error: 'Part permanently failed (DLQ) — see gallery_download_parts' })
    .eq('id', job.jobId)
    .neq('status', 'ready')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function batchPhotos(photos: Photo[]): Photo[][] {
  const MAX_BYTES = 3_500_000_000 // 3.5 GB per ZIP
  const MAX_COUNT = 200            // photos per ZIP

  const batches: Photo[][] = []
  let current: Photo[] = []
  let currentBytes = 0

  for (const photo of photos) {
    if (
      (current.length >= MAX_COUNT || currentBytes + photo.file_size > MAX_BYTES)
      && current.length > 0
    ) {
      batches.push(current)
      current = []
      currentBytes = 0
    }
    current.push(photo)
    currentBytes += photo.file_size
  }

  if (current.length > 0) batches.push(current)
  return batches
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendDownloadReadyEmail(
  galleryId: string,
  email: string,
  downloadToken: string,
  partCount: number,
  env: Env,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: raw } = await supabase
    .from('galleries')
    .select(`
      title,
      project:projects(
        portal_locale,
        photographer:photographers(studio_name, full_name, email, locale)
      )
    `)
    .eq('id', galleryId)
    .single()

  const gallery = raw as {
    title: string | null
    project: {
      portal_locale: string | null
      photographer: { studio_name: string | null; full_name: string | null; email: string | null; locale: string | null } | null
    } | null
  } | null

  const project = Array.isArray(gallery?.project) ? gallery?.project[0] : gallery?.project
  const photographerRaw = project?.photographer
  const photographer = Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw

  // portal_locale controls client-facing email language.
  // photographer.locale is the dashboard UI language — intentionally excluded here.
  const locale = project?.portal_locale === 'en' ? 'en' : 'de'
  const studioName = photographer?.studio_name || photographer?.full_name || (locale === 'en' ? 'Your Photographer' : 'Ihr Fotograf')
  const replyEmail = photographer?.email || undefined
  const galleryTitle = gallery?.title || (locale === 'en' ? 'your gallery' : 'deine Galerie')

  const appUrl = env.APP_URL || 'https://fotonizer.com'
  const downloadUrl = `${appUrl}/download/${downloadToken}`

  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const t = {
    subject:    locale === 'en' ? 'Your photos are ready ✨'     : 'Deine Fotos sind fertig ✨',
    heading:    locale === 'en' ? 'Your photos<br>are ready ✨'   : 'Deine Fotos<br>sind fertig ✨',
    body:       locale === 'en'
      ? 'Your photos are now ready for you.<br>I hope you enjoy looking through them ✨'
      : 'Deine Fotos stehen jetzt für dich bereit.<br>Ich wünsche dir ganz viel Freude beim Anschauen ✨',
    cta:        locale === 'en' ? 'View photos'                   : 'Fotos ansehen',
    expiryLine: locale === 'en'
      ? `The link is valid until <strong style="color:#888;">${expiryDate}</strong>.<br>If you have any questions, just reply to this email.`
      : `Der Link ist gültig bis <strong style="color:#888;">${expiryDate}</strong>.<br>Bei Fragen antworte einfach auf diese E-Mail.`,
    footer:     locale === 'en' ? 'Delivered by your photographer' : 'Bereitgestellt von deinem Fotografen',
    partsNote:  locale === 'en'
      ? `<p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.7;">Your photos were split into <strong style="color:#111;">${partCount} parts</strong> — you can download all of them on the download page.</p>`
      : `<p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.7;">Deine Fotos wurden in <strong style="color:#111;">${partCount} Teile</strong> aufgeteilt — du kannst alle auf der Download-Seite herunterladen.</p>`,
  }

  const partNote = partCount > 1 ? t.partsNote : ''
  const galleryLine = galleryTitle.trim()
    ? `<p style="margin:6px 0 0;font-size:13px;color:#aaa;letter-spacing:0.01em;">Galerie: ${galleryTitle}</p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px 64px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">
        <tr><td style="height:4px;background:#111;"></td></tr>
        <tr><td style="padding:32px 48px 0;"><p style="margin:0;font-size:12px;color:#bbb;letter-spacing:0.08em;text-transform:uppercase;">${studioName}</p></td></tr>
        <tr><td style="padding:16px 48px 0;"><h1 style="margin:0;font-size:28px;font-weight:700;color:#111;letter-spacing:-0.02em;line-height:1.2;">${t.heading}</h1>${galleryLine}</td></tr>
        <tr><td style="padding:28px 48px 0;"><p style="margin:0;font-size:16px;color:#555;line-height:1.75;">${t.body}</p></td></tr>
        ${partNote ? `<tr><td style="padding:20px 48px 0;">${partNote}</td></tr>` : ''}
        <tr><td style="padding:36px 48px 0;"><a href="${downloadUrl}" style="display:inline-block;background:#111;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:15px 40px;border-radius:999px;letter-spacing:-0.01em;">${t.cta}</a></td></tr>
        <tr><td style="padding:24px 48px 0;"><p style="margin:0;font-size:13px;color:#bbb;line-height:1.6;">${t.expiryLine}</p></td></tr>
        <tr><td style="padding:16px 48px 0;"><p style="margin:0;font-size:11px;color:#ccc;line-height:1.6;word-break:break-all;"><a href="${downloadUrl}" style="color:#ccc;">${downloadUrl}</a></p></td></tr>
        <tr><td style="padding:40px 48px 36px;"><p style="margin:0;font-size:11px;color:#ccc;">${t.footer}</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const payload: Record<string, unknown> = {
    from: `${studioName} <noreply@fotonizer.com>`,
    to: email,
    subject: t.subject,
    html,
  }
  if (replyEmail) payload.reply_to = replyEmail

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const resBody = await emailRes.json() as { id?: string; statusCode?: number; message?: string }
  if (!emailRes.ok) throw new Error(`Resend error ${emailRes.status}: ${JSON.stringify(resBody)}`)
  console.log(`[email] sent id=${resBody.id}`)
}
