/**
 * Cloudflare Worker — Fotonizer ZIP processor
 *
 * Receives a job payload, streams photos from R2 through the ZIP builder,
 * uploads resulting ZIPs back to R2, and sends the download-ready email.
 *
 * Lives in the same network as R2 → no Vercel timeout issues, no egress fees.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ZipStream } from './zip'

export interface Env {
  R2: R2Bucket
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  INTERNAL_TOKEN: string
  RESEND_API_KEY: string
  APP_URL: string
}

interface Photo {
  id: string
  storage_url: string
  filename: string
  file_size: number
}

interface DownloadPart {
  name: string
  key: string
  photo_count: number
  part_number: number
  total_parts: number
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const auth = request.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token || token !== (env.INTERNAL_TOKEN ?? '').trim()) {
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

    ctx.waitUntil(processJob(jobId, galleryId, env))
    return Response.json({ ok: true, jobId })
  },
}

// ── Main processing logic ─────────────────────────────────────────────────────

async function processJob(jobId: string, galleryId: string, env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  console.log(`[cf-worker] START jobId=${jobId} galleryId=${galleryId}`)

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

    // Resume: load already-completed parts
    const existingParts: DownloadPart[] = Array.isArray(job?.parts)
      ? (job.parts as DownloadPart[])
      : []
    const completedNums = new Set(existingParts.map(p => p.part_number))

    console.log(
      `[cf-worker] jobId=${jobId} photos=${allPhotos.length} existingParts=${existingParts.length}` +
      (existingParts.length > 0 ? ` completedNums=[${[...completedNums].join(',')}]` : ' (fresh start)'),
    )

    const baseTitle =
      (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

    const batches = batchBySize(allPhotos, 3_000_000_000)
    const totalParts = batches.length

    // Reuse timestamp from existing parts so R2 keys stay grouped
    const timestamp = existingParts.length > 0
      ? (() => {
          const m = existingParts[0]?.key?.match(/\/(\d+)-part\d+\.zip$/)
          return m ? m[1] : String(Date.now())
        })()
      : String(Date.now())

    console.log(`[cf-worker] jobId=${jobId} totalParts=${totalParts} timestamp=${timestamp}`)

    const parts: DownloadPart[] = [...existingParts]

    for (let i = 0; i < batches.length; i++) {
      const partNumber = i + 1

      if (completedNums.has(partNumber)) {
        console.log(`[cf-worker] part ${partNumber}/${totalParts} — already done, skipping`)
        continue
      }

      const batch = batches[i]
      const partName =
        totalParts === 1
          ? `${baseTitle}.zip`
          : `${baseTitle} - Teil ${partNumber} von ${totalParts}.zip`

      const key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`

      console.log(
        `[cf-worker] part ${partNumber}/${totalParts} START — ${batch.length} photos key=${key}`,
      )

      await buildZipPart(batch, key, partName, env)

      const newPart: DownloadPart = {
        name: partName,
        key,
        photo_count: batch.length,
        part_number: partNumber,
        total_parts: totalParts,
      }

      const idx = parts.findIndex(p => p.part_number === partNumber)
      if (idx >= 0) parts[idx] = newPart
      else parts.push(newPart)
      parts.sort((a, b) => a.part_number - b.part_number)

      await supabase
        .from('gallery_download_jobs')
        .update({ parts, processed_parts: parts.length })
        .eq('id', jobId)

      console.log(`[cf-worker] part ${partNumber}/${totalParts} DONE`)
    }

    // Mark ready
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'ready', parts, processed_parts: totalParts })
      .eq('id', jobId)

    console.log(`[cf-worker] jobId=${jobId} marked ready — ${parts.length} parts`)

    // Re-read to get potentially updated email/token from /prepare
    const { data: finalJob } = await supabase
      .from('gallery_download_jobs')
      .select('email, download_token, email_sent_at')
      .eq('id', jobId)
      .single()

    const email = finalJob?.email ?? job?.email
    const downloadToken = finalJob?.download_token ?? job?.download_token

    console.log(`[cf-worker] EMAIL CHECK email="${email ?? 'MISSING'}" token="${downloadToken ? downloadToken.slice(0, 8) + '...' : 'MISSING'}" sent_at="${finalJob?.email_sent_at ?? 'null'}"`)

    if (finalJob?.email_sent_at) {
      console.log(`[cf-worker] email already sent — skipping`)
    } else if (email && downloadToken) {
      console.log(`[cf-worker] SENDING EMAIL to="${email}" parts=${parts.length}`)
      await sendDownloadReadyEmail(galleryId, email, downloadToken, parts.length, env, supabase)
      await supabase
        .from('gallery_download_jobs')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', jobId)
      console.log(`[cf-worker] email sent OK`)
    } else {
      console.warn(`[cf-worker] SKIPPING EMAIL — no email or token`)
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[cf-worker] FATAL jobId=${jobId}:`, message)
    await supabase
      .from('gallery_download_jobs')
      .update({ status: 'failed', error: message })
      .eq('id', jobId)
  }
}

// ── ZIP building ──────────────────────────────────────────────────────────────

async function buildZipPart(
  photos: Photo[],
  key: string,
  filename: string,
  env: Env,
): Promise<void> {
  const mpu = await env.R2.createMultipartUpload(key, {
    httpMetadata: {
      contentType: 'application/zip',
      contentDisposition: `attachment; filename="${filename}"`,
    },
  })

  const zip = new ZipStream(mpu)
  try {
    for (const photo of photos) {
      const r2Key = r2KeyFromUrl(photo.storage_url)
      const obj = await env.R2.get(r2Key)
      if (!obj) {
        console.warn(`[cf-worker] R2 object not found: ${r2Key} — skipping`)
        continue
      }

      const safeName = (photo.filename || 'photo.jpg')
        .replace(/[/\\:*?"<>|]/g, '_')
        .replace(/^\.+/, '_') || 'photo.jpg'

      await zip.addFile(safeName, obj.body)
    }
    await zip.finalize()
  } catch (err) {
    await zip.abort()
    throw err
  }
}

function r2KeyFromUrl(storageUrl: string): string {
  try {
    return new URL(storageUrl).pathname.replace(/^\//, '')
  } catch {
    return storageUrl
  }
}

// ── Batching ──────────────────────────────────────────────────────────────────

function batchBySize(photos: Photo[], maxBytes: number): Photo[][] {
  const batches: Photo[][] = []
  let current: Photo[] = []
  let currentBytes = 0

  for (const photo of photos) {
    if (currentBytes + photo.file_size > maxBytes && current.length > 0) {
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

  const effectiveLocale = project?.portal_locale || photographer?.locale || 'de'
  const locale = effectiveLocale === 'en' ? 'en' : 'de'
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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:48px 16px 64px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">
          <tr><td style="height:4px;background:#111;"></td></tr>
          <tr>
            <td style="padding:32px 48px 0;">
              <p style="margin:0;font-size:12px;color:#bbb;letter-spacing:0.08em;text-transform:uppercase;">${studioName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 48px 0;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#111;letter-spacing:-0.02em;line-height:1.2;">${t.heading}</h1>
              ${galleryLine}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 48px 0;">
              <p style="margin:0;font-size:16px;color:#555;line-height:1.75;">${t.body}</p>
            </td>
          </tr>
          ${partNote ? `<tr><td style="padding:20px 48px 0;">${partNote}</td></tr>` : ''}
          <tr>
            <td style="padding:36px 48px 0;">
              <a href="${downloadUrl}" style="display:inline-block;background:#111;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:15px 40px;border-radius:999px;letter-spacing:-0.01em;">${t.cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px 0;">
              <p style="margin:0;font-size:13px;color:#bbb;line-height:1.6;">${t.expiryLine}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 48px 0;">
              <p style="margin:0;font-size:11px;color:#ccc;line-height:1.6;word-break:break-all;">
                <a href="${downloadUrl}" style="color:#ccc;">${downloadUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px 36px;">
              <p style="margin:0;font-size:11px;color:#ccc;">${t.footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const payload: Record<string, unknown> = {
    from: `${studioName} <noreply@fotonizer.com>`,
    to: email,
    subject: t.subject,
    html,
  }
  if (replyEmail) payload.reply_to = replyEmail

  console.log(`[cf-worker] resend.send from="${studioName}" to="${email}" replyTo=${replyEmail ?? 'none'}`)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const resBody = await res.json() as { id?: string; statusCode?: number; message?: string }
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(resBody)}`)
  }
  console.log(`[cf-worker] resend OK id=${resBody.id}`)
}
