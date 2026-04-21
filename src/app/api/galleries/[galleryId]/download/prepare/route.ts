import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 10

// A processing job that hasn't reached 'ready' after 10 min is considered stuck.
// maxDuration on the worker is 300 s (5 min), so 10 min gives generous margin.
const STUCK_THRESHOLD_MS = 10 * 60 * 1000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params
  const body = await req.json().catch(() => ({})) as { email?: string }
  const email = (body.email ?? '').trim()

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required' }, { status: 400 })
  }

  const supabase = await createClient()
  const service = createServiceClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, download_enabled')
    .eq('id', galleryId)
    .single()

  if (!gallery) return Response.json({ error: 'Gallery not found' }, { status: 404 })
  if (!gallery.download_enabled) return Response.json({ error: 'Download not enabled' }, { status: 403 })

  const downloadToken = crypto.randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString()

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const cfWorkerUrl = process.env.CF_WORKER_URL?.trim()
  const triggerWorker = (jobId: string) => {
    const url = cfWorkerUrl
      ? cfWorkerUrl
      : `${base}/api/galleries/${galleryId}/download/worker`
    const body = cfWorkerUrl
      ? JSON.stringify({ jobId, galleryId })
      : JSON.stringify({ jobId })
    console.log(`[prepare] triggering ${cfWorkerUrl ? 'CF Worker' : 'Vercel worker'} jobId=${jobId}`)
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_TOKEN ?? ''}`,
      },
      body,
    }).catch(err => console.error('[prepare] worker trigger failed:', err))
  }

  // ── 1. Ready job — reuse immediately, send email now ─────────────────────
  const { data: readyJob } = await service
    .from('gallery_download_jobs')
    .select('id, parts')
    .eq('gallery_id', galleryId)
    .eq('status', 'ready')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (readyJob) {
    console.log(`[prepare] reusing ready job ${readyJob.id}`)
    await service
      .from('gallery_download_jobs')
      .update({ email, download_token: downloadToken, token_expires_at: tokenExpiresAt })
      .eq('id', readyJob.id)
    const partCount = Array.isArray(readyJob.parts) ? readyJob.parts.length : 1
    waitUntil(sendDownloadReadyEmail(galleryId, email, downloadToken, partCount).catch(console.error))
    return Response.json({ jobId: readyJob.id, downloadToken, reused: true })
  }

  // ── 2. Active job — worker is still running, update email/token and wait ─
  const { data: activeJob } = await service
    .from('gallery_download_jobs')
    .select('id')
    .eq('gallery_id', galleryId)
    .in('status', ['pending', 'processing'])
    .gt('expires_at', now)
    .gt('created_at', stuckCutoff)   // younger than 10 min → still running
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeJob) {
    console.log(`[prepare] job ${activeJob.id} still active — updating email/token`)
    await service
      .from('gallery_download_jobs')
      .update({ email, download_token: downloadToken, token_expires_at: tokenExpiresAt })
      .eq('id', activeJob.id)
    return Response.json({ jobId: activeJob.id, downloadToken, reused: true })
  }

  // ── 3. Stuck job — processing > 10 min with no result → resume it ────────
  // The worker's resume logic will skip already-completed parts and continue
  // from where it left off, so no work is duplicated.
  const { data: stuckJob } = await service
    .from('gallery_download_jobs')
    .select('id, parts')
    .eq('gallery_id', galleryId)
    .eq('status', 'processing')
    .gt('expires_at', now)
    .lt('created_at', stuckCutoff)   // older than 10 min → stuck
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (stuckJob) {
    console.log(`[prepare] resuming stuck job ${stuckJob.id} — ${Array.isArray(stuckJob.parts) ? stuckJob.parts.length : 0} parts already done`)
    await service
      .from('gallery_download_jobs')
      .update({ status: 'pending', email, download_token: downloadToken, token_expires_at: tokenExpiresAt })
      .eq('id', stuckJob.id)
    waitUntil(triggerWorker(stuckJob.id))
    return Response.json({ jobId: stuckJob.id, downloadToken, resumed: true })
  }

  // ── 4. No usable job → create fresh ──────────────────────────────────────
  const { data: job, error: insertErr } = await service
    .from('gallery_download_jobs')
    .insert({
      gallery_id: galleryId,
      status: 'pending',
      expires_at: tokenExpiresAt,
      email,
      download_token: downloadToken,
      token_expires_at: tokenExpiresAt,
    })
    .select('id')
    .single()

  if (insertErr || !job) {
    console.error('[prepare] insert error:', insertErr)
    return Response.json({ error: 'Could not create download job', detail: insertErr?.message }, { status: 500 })
  }

  console.log(`[prepare] fresh job ${job.id} — triggering worker`)
  waitUntil(triggerWorker(job.id))

  return Response.json({ jobId: job.id, downloadToken })
}
