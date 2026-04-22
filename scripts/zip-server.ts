process.on('uncaughtException', (err) => {
  console.error('[zip-server] CRASH uncaughtException:', err.message, err.stack)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[zip-server] CRASH unhandledRejection:', reason)
  process.exit(1)
})

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local', override: false })

import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { streamZipToR2 } from '../src/lib/zipStreamUpload'

const app = express()
app.use(express.json())

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || ''

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fotonizer-zip-server' })
})

app.post('/zip', async (req, res) => {
  console.log('[zip-server] ZIP endpoint hit')

  const auth = req.headers['authorization'] ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (INTERNAL_TOKEN && token !== INTERNAL_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { partId, photoIds, r2Key, partName } = req.body

  if (!partId || !Array.isArray(photoIds) || !photoIds.length || !r2Key || !partName) {
    res.status(400).json({ error: 'Missing partId, photoIds, r2Key, or partName' })
    return
  }

  console.log(`[zip-server] Files count: ${photoIds.length} — partId=${partId}`)

  // Respond immediately — CF Worker cannot wait for ZIP (Cloudflare 100s timeout)
  res.json({ ok: true, status: 'processing' })

  // Process ZIP in background — updates DB when done
  processZipBackground(partId, photoIds, r2Key, partName).catch(err => {
    console.error('[zip-server] background error:', err.message)
  })
})

async function processZipBackground(
  partId: string,
  photoIds: string[],
  r2Key: string,
  partName: string,
): Promise<void> {
  const supabase = makeSupabase()

  try {
    const { data: photos, error: photosErr } = await supabase
      .from('photos')
      .select('id, storage_url, filename, file_size')
      .in('id', photoIds)

    if (photosErr || !photos?.length) {
      throw new Error(`Failed to load photos: ${photosErr?.message ?? 'empty result'}`)
    }

    const photoMap = new Map(photos.map(p => [p.id, p]))
    const orderedPhotos = photoIds
      .map((id: string) => photoMap.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null)

    console.log(`[zip-server] ZIP started — ${orderedPhotos.length} files — key=${r2Key}`)

    await streamZipToR2(orderedPhotos, r2Key, partName)

    console.log(`[zip-server] ZIP uploaded — partId=${partId}`)

    await supabase
      .from('gallery_download_parts')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', partId)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[zip-server] ZIP failed partId=${partId}:`, msg)
    await supabase
      .from('gallery_download_parts')
      .update({ status: 'failed', error: msg })
      .eq('id', partId)
  }
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('[zip-server] ZIP server running on port', PORT)
})
