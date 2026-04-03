import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'

export const maxDuration = 10

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

  // Gallery read uses regular client — public SELECT via RLS is fine.
  // All job writes go through service client to bypass RLS.
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

  // Reuse an existing valid (non-expired) job — avoids re-zipping the same gallery.
  const { data: existingJob } = await service
    .from('gallery_download_jobs')
    .select('id, status, parts')
    .eq('gallery_id', galleryId)
    .in('status', ['pending', 'processing', 'ready'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingJob) {
    // Stamp the new email + fresh token so the new recipient gets their own link.
    await service
      .from('gallery_download_jobs')
      .update({ email, download_token: downloadToken, token_expires_at: tokenExpiresAt })
      .eq('id', existingJob.id)

    if (existingJob.status === 'ready') {
      // ZIPs already exist — send email immediately (fire-and-forget).
      const partCount = Array.isArray(existingJob.parts) ? existingJob.parts.length : 1
      void sendDownloadReadyEmail(galleryId, email, downloadToken, partCount).catch(console.error)
    }
    // If pending/processing — worker will pick up the updated email + token from DB when done.

    return Response.json({ jobId: existingJob.id, reused: true })
  }

  // No valid job — create one.
  const expiresAt = tokenExpiresAt
  const { data: job, error: insertErr } = await service
    .from('gallery_download_jobs')
    .insert({
      gallery_id: galleryId,
      status: 'pending',
      expires_at: expiresAt,
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

  fetch(`${base}/api/galleries/${galleryId}/download/worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': process.env.INTERNAL_TOKEN ?? '',
    },
    body: JSON.stringify({ jobId: job.id }),
  }).catch(() => {})

  return Response.json({ jobId: job.id })
}
