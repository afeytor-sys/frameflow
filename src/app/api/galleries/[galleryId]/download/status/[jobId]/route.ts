import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 10

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string; jobId: string }> },
) {
  const { galleryId, jobId } = await params
  // Service client: needs email/token fields that RLS may restrict
  const supabase = createServiceClient()

  const { data: job } = await supabase
    .from('gallery_download_jobs')
    .select('id, status, parts, processed_parts, error, expires_at, email, download_token, email_sent_at')
    .eq('id', jobId)
    .eq('gallery_id', galleryId)
    .single()

  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })

  if (job.expires_at && new Date(job.expires_at) < new Date()) {
    return Response.json({ status: 'expired' })
  }

  // Fallback email: if CF Worker failed to send, Vercel sends it here.
  // Atomic claim via IS NULL update prevents duplicate sends across concurrent polls.
  if (
    job.status === 'ready' &&
    !job.email_sent_at &&
    job.email &&
    job.download_token
  ) {
    const { data: claimed } = await supabase
      .from('gallery_download_jobs')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', job.id)
      .is('email_sent_at', null)
      .select('id')
      .maybeSingle()

    if (claimed) {
      const partCount = Array.isArray(job.parts) ? Math.max(job.parts.length, 1) : 1
      console.log(`[status/fallback] sending download email job=${job.id} email=${job.email} parts=${partCount}`)
      waitUntil(
        sendDownloadReadyEmail(galleryId, job.email, job.download_token, partCount)
          .catch(err => {
            console.error('[status/fallback] email failed, resetting email_sent_at:', err)
            // Reset so next poll retries
            void supabase
              .from('gallery_download_jobs')
              .update({ email_sent_at: null })
              .eq('id', job.id)
          }),
      )
    }
  }

  return Response.json({
    status: job.status,
    parts: job.parts ?? [],
    processedParts: job.processed_parts ?? 0,
    error: job.error ?? null,
  })
}
