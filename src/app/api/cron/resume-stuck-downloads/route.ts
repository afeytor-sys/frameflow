import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

// Runs every 10 minutes. Finds download jobs stuck in 'processing' or 'pending'
// for > 6 minutes and re-triggers the worker so they resume automatically.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()
  // Jobs older than 6 min that haven't finished — the worker had 5 min to run
  const stuckCutoff = new Date(Date.now() - 6 * 60 * 1000).toISOString()

  // Only resume 'pending' jobs — the worker changes status to 'processing' within
  // seconds of being triggered, so any job still 'pending' after 6 min is truly stuck.
  // 'processing' jobs may still be actively running (Vercel worker has 5-min limit);
  // the /prepare route already handles stuck processing jobs when the user re-clicks.
  const { data: stuckJobs } = await supabase
    .from('gallery_download_jobs')
    .select('id, gallery_id, status, processed_parts, total_parts')
    .eq('status', 'pending')
    .gt('expires_at', now)
    .lt('created_at', stuckCutoff)
    .limit(5)

  if (!stuckJobs?.length) {
    return NextResponse.json({ ok: true, resumed: 0 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fotonizer.com'
  const cfWorkerUrl = process.env.CF_WORKER_URL?.trim()
  let resumed = 0

  for (const job of stuckJobs) {
    // Job is already 'pending' — just trigger the worker directly

    const url = cfWorkerUrl
      ? cfWorkerUrl
      : `${base}/api/galleries/${job.gallery_id}/download/worker`
    const body = cfWorkerUrl
      ? JSON.stringify({ jobId: job.id, galleryId: job.gallery_id })
      : JSON.stringify({ jobId: job.id })

    console.log(`[cron/resume] triggering worker for job=${job.id} parts=${job.processed_parts}/${job.total_parts}`)

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_TOKEN ?? ''}`,
      },
      body,
    }).catch(err => console.error(`[cron/resume] trigger failed for ${job.id}:`, err))

    resumed++
  }

  return NextResponse.json({ ok: true, resumed, checked: stuckJobs.length })
}
