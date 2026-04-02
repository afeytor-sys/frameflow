import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params
  const supabase = await createClient()

  // Verify gallery exists and download is enabled (no auth check — public client gallery also uses this)
  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, download_enabled')
    .eq('id', galleryId)
    .single()

  if (!gallery) return Response.json({ error: 'Gallery not found' }, { status: 404 })
  if (!gallery.download_enabled) return Response.json({ error: 'Download not enabled' }, { status: 403 })

  // Reuse an existing job that is still valid (pending / processing / ready, not yet expired).
  // This lets pollers reuse the same jobId if the page is refreshed mid-preparation.
  const { data: existingJob } = await supabase
    .from('gallery_download_jobs')
    .select('id, status')
    .eq('gallery_id', galleryId)
    .in('status', ['pending', 'processing', 'ready'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingJob) {
    return Response.json({ jobId: existingJob.id, reused: true })
  }

  // Create a new job record (status: pending).
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { data: job, error: insertErr } = await supabase
    .from('gallery_download_jobs')
    .insert({ gallery_id: galleryId, status: 'pending', expires_at: expiresAt })
    .select('id')
    .single()

  if (insertErr || !job) {
    return Response.json({ error: 'Could not create download job' }, { status: 500 })
  }

  // Fire the worker as an independent request — it responds instantly while the
  // worker runs in its own Vercel function invocation (up to maxDuration=300 s).
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
  }).catch(() => {
    // Fire-and-forget — worker updates the job via Supabase regardless.
  })

  return Response.json({ jobId: job.id })
}
