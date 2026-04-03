import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 10

// A job is considered "stuck" if it has been pending/processing for more than 8 minutes
// without reaching 'ready'. This prevents zombie jobs from blocking new requests.
const STUCK_THRESHOLD_MS = 8 * 60 * 1000

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
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString()

  // Only reuse a READY job, or a pending/processing job that is recent (< 8 min old).
  // Stuck jobs (old pending/processing) are ignored so a fresh job + worker call is created.
  const { data: existingJob } = await service
    .from('gallery_download_jobs')
    .select('id, status, parts')
    .eq('gallery_id', galleryId)
    .in('status', ['pending', 'processing', 'ready'])
    .gt('expires_at', new Date().toISOString())
    .gt('created_at', stuckCutoff)   // ignore jobs older than 8 min that never finished
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingJob) {
    await service
      .from('gallery_download_jobs')
      .update({ email, download_token: downloadToken, token_expires_at: tokenExpiresAt })
      .eq('id', existingJob.id)

    if (existingJob.status === 'ready') {
      const partCount = Array.isArray(existingJob.parts) ? existingJob.parts.length : 1
      waitUntil(sendDownloadReadyEmail(galleryId, email, downloadToken, partCount).catch(console.error))
    }
    // If pending/processing and recent — worker is still running, it will send email when done.

    return Response.json({ jobId: existingJob.id, reused: true })
  }

  // Create a fresh job
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
    console.error('[download/prepare] insert error:', insertErr)
    return Response.json({ error: 'Could not create download job', detail: insertErr?.message }, { status: 500 })
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  console.log(`[prepare] triggering worker — jobId=${job.id} tokenDefined=${!!process.env.INTERNAL_TOKEN} base=${base}`)

  // waitUntil guarantees the fetch is sent before Vercel terminates this function.
  waitUntil(
    fetch(`${base}/api/galleries/${galleryId}/download/worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_TOKEN ?? ''}`,
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => console.error('[prepare] worker trigger failed:', err))
  )

  return Response.json({ jobId: job.id })
}
