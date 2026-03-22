/**
 * scripts/migrate-photos-to-r2.ts
 *
 * Migrates existing photos from Supabase Storage → Cloudflare R2.
 * Uses supabase.storage.download() with service role key (works for
 * both public and private buckets, bypasses auth issues).
 *
 * Usage:
 *   npx tsx scripts/migrate-photos-to-r2.ts
 *   npx tsx scripts/migrate-photos-to-r2.ts --dry-run
 *   npx tsx scripts/migrate-photos-to-r2.ts --gallery-id=<uuid>
 *   npx tsx scripts/migrate-photos-to-r2.ts --limit=10
 */

import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
dotenvConfig({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ── Env ───────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const R2_ENDPOINT = process.env.R2_ENDPOINT!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

const missing = [
  ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_KEY],
  ['R2_ENDPOINT', R2_ENDPOINT],
  ['R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID],
  ['R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY],
  ['R2_BUCKET_NAME', R2_BUCKET],
  ['R2_PUBLIC_URL', R2_PUBLIC_URL],
].filter(([, v]) => !v).map(([k]) => k)

if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing.join(', '))
  process.exit(1)
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const GALLERY_ID = args.find(a => a.startsWith('--gallery-id='))?.split('=')[1]
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10)
const BATCH_SIZE = 3 // conservative to avoid memory issues with large photos

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSupabaseUrl(url: string): boolean {
  return url.includes('supabase.co')
}

function isR2Url(url: string): boolean {
  return url.includes('r2.dev') || url.includes('cloudflarestorage.com')
}

/**
 * Extract the Supabase Storage bucket path from a public URL.
 * Handles both:
 *   /storage/v1/object/public/photos/galleries/abc/photo.jpg  → galleries/abc/photo.jpg
 *   /storage/v1/render/image/public/photos/galleries/abc/...  → galleries/abc/photo.jpg
 */
function extractSupabasePath(url: string): string | null {
  // Strip query params
  const cleanUrl = url.split('?')[0]
  // Match both /object/public/ and /render/image/public/ patterns
  const match = cleanUrl.match(/\/(?:object|render\/image)\/public\/photos\/(.+)$/)
  if (match) return match[1]
  // Fallback: try to extract path after /photos/
  const fallback = cleanUrl.match(/\/photos\/(.+)$/)
  return fallback ? fallback[1] : null
}

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  }
  return map[ext || ''] || 'image/jpeg'
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Fotonizer Photo Migration: Supabase Storage → Cloudflare R2')
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '✏️  LIVE'}`)
  if (GALLERY_ID) console.log(`   Gallery filter: ${GALLERY_ID}`)
  if (LIMIT > 0) console.log(`   Limit: ${LIMIT} photos`)
  console.log()

  // ── Fetch photos ─────────────────────────────────────────────────────────
  let query = supabase
    .from('photos')
    .select('id, gallery_id, storage_url, thumbnail_url, filename, file_size')
    .ilike('storage_url', '%supabase%')
    .order('id', { ascending: true })

  if (GALLERY_ID) query = query.eq('gallery_id', GALLERY_ID)
  if (LIMIT > 0) query = query.limit(LIMIT)

  const { data: photos, error: fetchError } = await query

  if (fetchError) {
    console.error('❌ Failed to fetch photos:', fetchError.message)
    process.exit(1)
  }

  if (!photos || photos.length === 0) {
    console.log('🎉 No Supabase photos found — all already on R2!')
    return
  }

  // Double-check: skip any that are already on R2
  const toMigrate = photos.filter(p => !isR2Url(p.storage_url || ''))

  console.log(`📦 Photos with Supabase URLs: ${photos.length}`)
  console.log(`📦 To migrate now:            ${toMigrate.length}`)
  console.log()

  if (toMigrate.length === 0) {
    console.log('🎉 All photos are already on R2!')
    return
  }

  let migrated = 0
  let failed = 0
  let skipped = 0
  const failedIds: string[] = []

  // ── Process in batches ───────────────────────────────────────────────────
  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async (photo) => {
      const url = photo.storage_url || ''
      const supabasePath = extractSupabasePath(url)

      if (!supabasePath) {
        console.warn(`  ⚠️  [${photo.id}] Cannot extract path from: ${url}`)
        skipped++
        return
      }

      const r2Key = supabasePath // preserve same path structure
      const r2Url = `${R2_PUBLIC_URL}/${r2Key}`

      if (DRY_RUN) {
        console.log(`  🔍 [DRY RUN] ${photo.filename}`)
        console.log(`       path: ${supabasePath}`)
        console.log(`       r2:   ${r2Url}`)
        migrated++
        return
      }

      try {
        // ── Download from Supabase Storage using service role ──────────────
        // This works for both public and private buckets
        const { data: blob, error: dlError } = await supabase.storage
          .from('photos')
          .download(supabasePath)

        if (dlError || !blob) {
          // Fallback: try direct fetch (works if bucket is public)
          console.warn(`  ⚠️  Storage SDK download failed for ${photo.filename}: ${dlError?.message}. Trying direct fetch...`)
          
          const fetchRes = await fetch(url)
          if (!fetchRes.ok) {
            throw new Error(`Storage SDK: ${dlError?.message} | HTTP fetch: ${fetchRes.status} ${fetchRes.statusText}`)
          }
          
          const arrayBuffer = await fetchRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const contentType = fetchRes.headers.get('content-type') || getContentType(photo.filename)

          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buffer,
            ContentType: contentType,
          }))
        } else {
          // Convert Blob to Buffer
          const arrayBuffer = await blob.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const contentType = blob.type || getContentType(photo.filename)

          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buffer,
            ContentType: contentType,
          }))
        }

        // ── Update DB ──────────────────────────────────────────────────────
        const { error: updateError } = await supabase
          .from('photos')
          .update({
            storage_url: r2Url,
            thumbnail_url: r2Url,
          })
          .eq('id', photo.id)

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`)
        }

        migrated++
        const progress = `[${i + migrated}/${toMigrate.length}]`
        console.log(`  ✅ ${progress} ${photo.filename}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`  ❌ [${photo.id}] ${photo.filename}: ${message}`)
        failed++
        failedIds.push(photo.id)
      }
    }))

    // Small delay between batches
    if (i + BATCH_SIZE < toMigrate.length) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log()
  console.log('─────────────────────────────────────────')
  console.log('📊 Migration Summary')
  console.log('─────────────────────────────────────────')
  if (DRY_RUN) {
    console.log(`  🔍 Would migrate: ${migrated} photos`)
  } else {
    console.log(`  ✅ Migrated:  ${migrated}`)
    console.log(`  ❌ Failed:    ${failed}`)
    console.log(`  ⚠️  Skipped:   ${skipped}`)
    if (failedIds.length > 0) {
      console.log(`  Failed IDs: ${failedIds.join(', ')}`)
    }
  }
  console.log()

  // ── Verification query ────────────────────────────────────────────────────
  if (!DRY_RUN) {
    console.log('🔍 Verifying final state...')
    const { data: counts } = await supabase.rpc('exec_sql' as never, {
      sql: `SELECT 
        COUNT(*) FILTER (WHERE storage_url LIKE '%r2.dev%') as r2,
        COUNT(*) FILTER (WHERE storage_url LIKE '%supabase%') as supabase
      FROM photos`
    }).single() as { data: { r2: number; supabase: number } | null }

    if (counts) {
      console.log(`  R2 photos:       ${counts.r2}`)
      console.log(`  Supabase photos: ${counts.supabase}`)
      if (counts.supabase === 0) {
        console.log('  🎉 All photos migrated to R2!')
      } else {
        console.log(`  ⚠️  ${counts.supabase} photos still on Supabase — re-run to retry`)
      }
    } else {
      // Fallback: simple count
      const { count: r2Count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .ilike('storage_url', '%r2.dev%')
      
      const { count: supCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .ilike('storage_url', '%supabase%')

      console.log(`  R2 photos:       ${r2Count ?? '?'}`)
      console.log(`  Supabase photos: ${supCount ?? '?'}`)
      if ((supCount ?? 1) === 0) {
        console.log('  🎉 All photos migrated to R2!')
      } else {
        console.log(`  ⚠️  ${supCount} photos still on Supabase — re-run to retry`)
      }
    }
  }

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
