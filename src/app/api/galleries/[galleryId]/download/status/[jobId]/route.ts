import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string; jobId: string }> },
) {
  const { galleryId, jobId } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('gallery_download_jobs')
    .select('id, status, parts, processed_parts, error, expires_at')
    .eq('id', jobId)
    .eq('gallery_id', galleryId)
    .single()

  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })

  // Treat expired jobs as failed.
  if (job.expires_at && new Date(job.expires_at) < new Date()) {
    return Response.json({ status: 'expired' })
  }

  return Response.json({
    status: job.status,
    parts: job.parts ?? [],
    processedParts: job.processed_parts ?? 0,
    error: job.error ?? null,
  })
}
