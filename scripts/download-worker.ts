/**
 * Fotonizer — standalone download worker
 *
 * Polls gallery_download_jobs every 5 s for pending work.
 * Runs independently of Vercel — no request timeout, no memory cap beyond the host.
 *
 * Usage (local dev):
 *   npx tsx scripts/download-worker.ts
 *
 * Deploy to any Node.js host (Railway, Fly.io, Render, VPS, etc.) with the same
 * env vars that Vercel uses:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
 *   RESEND_API_KEY, NEXT_PUBLIC_APP_URL
 *
 * Architecture:
 *   • picks up 'pending' jobs — and 'processing' jobs stuck > STUCK_THRESHOLD_MS
 *   • processes ONE job at a time (no concurrent race conditions)
 *   • CAS-style atomic claim: only one worker wins when multiple run
 *   • reuses streamZipToR2 + sendDownloadReadyEmail unchanged
 */

// Load .env.local in development (silently ignored if file absent).
// In production, env vars are injected by the host — override: false keeps them.
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local', override: false })

import { createClient } from '@supabase/supabase-js'
import { streamZipToR2 } from '../src/lib/zipStreamUpload'
import { sendDownloadReadyEmail } from '../src/lib/downloadEmail'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS  = 5_000          // how often to check for new jobs
const ZIP_CHUNK_SIZE    = 100            // photos per ZIP file
const STUCK_THRESHOLD_MS = 15 * 60_000  // treat processing jobs older than this as crashed

// ---------------------------------------------------------------------------
// Supabase service client (bypasses RLS — service role key required)
// ---------------------------------------------------------------------------

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type Supabase = ReturnType<typeof makeSupabase>

// ---------------------------------------------------------------------------
// Job claiming (compare-and-swap)
// ---------------------------------------------------------------------------

interface ClaimedJob {
  id: string
  gallery_id: string
  email: string | null
  download_token: string | null
}

/**
 * Finds the next actionable job and claims it atomically.
 *
 * "Actionable" means:
 *   - status = 'pending'                          (never started)
 *   - status = 'processing' AND stuck > 15 min   (Vercel killed the Lambda without catch)
 *
 * The two-step select→update is race-safe because the update includes
 * the status condition: if another worker claimed first, the update
 * matches 0 rows and this worker skips it.
 */
async function claimNextJob(supabase: Supabase): Promise<ClaimedJob | null> {
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString()

  // Step 1 — find a candidate (read-only, no lock needed at this point)
  const { data: candidate } = await supabase
    .from('gallery_download_jobs')
    .select('id, status')
    .or(`status.eq.pending,and(status.eq.processing,updated_at.lt.${stuckBefore})`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!candidate) return null

  // Step 2 — CAS-style claim: only succeeds if status still matches what we saw
  const validStatuses = candidate.status === 'pending' ? ['pending'] : ['processing']
  const { data: claimed } = await supabase
    .from('gallery_download_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', candidate.id)
    .in('status', validStatuses)
    .select('id, gallery_id, email, download_token')
    .maybeSingle()

  return claimed ?? null
}

// ---------------------------------------------------------------------------
// Job processing — mirrors worker/route.ts logic exactly
// ---------------------------------------------------------------------------

interface DownloadPart {
  name: string
  key: string
  photo_count: number
  part_number: number
  total_parts: number
}

async function processJob(supabase: Supabase, job: ClaimedJob): Promise<void> {
  const { id: jobId, gallery_id: galleryId, email, download_token: downloadToken } = job

  console.log(`[worker] job ${jobId} — fetching gallery + photos`)

  const [{ data: gallery }, { data: allPhotos }] = await Promise.all([
    supabase.from('galleries').select('title').eq('id', galleryId).single(),
    supabase
      .from('photos')
      .select('id, storage_url, filename, file_size')
      .eq('gallery_id', galleryId)
      .order('display_order', { ascending: true }),
  ])

  if (!allPhotos?.length) throw new Error('No photos found for this gallery')

  console.log(`[worker] ${allPhotos.length} photos — email=${email ?? 'none'}`)

  const baseTitle =
    (gallery?.title ?? 'gallery').replace(/[^\w\s\-_.äöüÄÖÜß]/g, '').trim() || 'gallery'

  // Split into ZIP chunks
  const chunks: typeof allPhotos[] = []
  for (let i = 0; i < allPhotos.length; i += ZIP_CHUNK_SIZE) {
    chunks.push(allPhotos.slice(i, i + ZIP_CHUNK_SIZE))
  }
  const totalChunks = chunks.length

  console.log(`[worker] ${totalChunks} ZIP(s) × ${ZIP_CHUNK_SIZE} photos`)

  const timestamp = String(Date.now())
  const parts: DownloadPart[] = []

  // Build each ZIP sequentially — memory is bounded to ~1 photo at a time
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const partNumber = i + 1
    const partName =
      totalChunks === 1
        ? `${baseTitle}.zip`
        : `${baseTitle} - Teil ${partNumber} von ${totalChunks}.zip`
    const key = `gallery-downloads/${galleryId}/${timestamp}-part${partNumber}.zip`

    console.log(`[worker] building ZIP ${partNumber}/${totalChunks} — ${chunk.length} photos → ${key}`)
    const uploadedKey = await streamZipToR2(chunk, key, partName)
    console.log(`[worker] ZIP ${partNumber} uploaded OK`)

    parts.push({ name: partName, key: uploadedKey, photo_count: chunk.length, part_number: partNumber, total_parts: totalChunks })

    // Persist progress so the download page can show partial state
    await supabase
      .from('gallery_download_jobs')
      .update({ parts, processed_parts: partNumber, updated_at: new Date().toISOString() })
      .eq('id', jobId)
  }

  // Mark ready
  await supabase
    .from('gallery_download_jobs')
    .update({ status: 'ready', parts, processed_parts: totalChunks, updated_at: new Date().toISOString() })
    .eq('id', jobId)

  console.log(`[worker] job ${jobId} marked ready`)

  // Send email
  if (email && email.includes('@') && downloadToken) {
    // Guard against duplicate sends (e.g. Vercel worker also finished)
    const { data: fresh } = await supabase
      .from('gallery_download_jobs')
      .select('email_sent_at')
      .eq('id', jobId)
      .single()

    if (fresh?.email_sent_at) {
      console.log(`[worker] email already sent — skipping`)
    } else {
      console.log(`[worker] sending email to ${email}`)
      await sendDownloadReadyEmail(galleryId, email, downloadToken, parts.length)
      await supabase
        .from('gallery_download_jobs')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', jobId)
      console.log(`[worker] email sent OK`)
    }
  }
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function poll() {
  const supabase = makeSupabase()
  console.log(`[worker] started — polling every ${POLL_INTERVAL_MS / 1000}s`)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await claimNextJob(supabase)

      if (job) {
        console.log(`[worker] claimed job ${job.id}`)
        try {
          await processJob(supabase, job)
          console.log(`[worker] job ${job.id} done ✓`)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`[worker] job ${job.id} FAILED:`, message)
          await supabase
            .from('gallery_download_jobs')
            .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
            .eq('id', job.id)
        }
      }
    } catch (err) {
      console.error('[worker] poll error:', err)
    }

    await sleep(POLL_INTERVAL_MS)
  }
}

poll().catch(err => {
  console.error('[worker] fatal:', err)
  process.exit(1)
})
