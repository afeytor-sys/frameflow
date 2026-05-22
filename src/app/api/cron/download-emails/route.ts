import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendDownloadReadyEmail } from '@/lib/downloadEmail'

export const maxDuration = 60

// Runs every 5 minutes. Finds download jobs that are ready but whose email
// was never sent (e.g. client closed the tab before polling finished, or the
// CF Worker queue consumer failed to send after marking the job ready).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()
  // Only look at jobs created > 3 minutes ago — gives the CF Worker time to send first.
  const minAgeCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()

  const { data: jobs, error } = await supabase
    .from('gallery_download_jobs')
    .select('id, gallery_id, email, download_token, parts')
    .eq('status', 'ready')
    .is('email_sent_at', null)
    .gt('expires_at', now)
    .lt('created_at', minAgeCutoff)
    .limit(20)

  if (error) {
    console.error('[cron/download-emails] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!jobs?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  for (const job of jobs) {
    if (!job.email || !job.download_token) continue

    // Atomic claim — prevents duplicate send if two cron invocations overlap
    const { data: claimed } = await supabase
      .from('gallery_download_jobs')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', job.id)
      .is('email_sent_at', null)
      .select('id')
      .maybeSingle()

    if (!claimed) continue  // another instance already claimed this job

    const partCount = Array.isArray(job.parts) ? Math.max(job.parts.length, 1) : 1
    console.log(`[cron/download-emails] sending to ${job.email} job=${job.id} parts=${partCount}`)

    try {
      await sendDownloadReadyEmail(job.gallery_id, job.email, job.download_token, partCount)
      sent++
      console.log(`[cron/download-emails] sent OK job=${job.id}`)
    } catch (err) {
      // Reset claim so next cron run retries
      console.error(`[cron/download-emails] send failed job=${job.id}:`, err)
      await supabase
        .from('gallery_download_jobs')
        .update({ email_sent_at: null })
        .eq('id', job.id)
    }
  }

  return NextResponse.json({ ok: true, sent, checked: jobs.length })
}
