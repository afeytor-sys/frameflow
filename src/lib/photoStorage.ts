/**
 * Shared helper to permanently delete photo files from storage (R2 + legacy
 * Supabase Storage) given their public storage_url values. Used by bulk
 * delete routes (gallery, project) so removing a gallery/project doesn't
 * just drop DB rows and leave orphaned files behind in the cloud.
 */
import { DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, R2_PUBLIC_URL, extractR2Key } from '@/lib/r2'
import type { SupabaseClient } from '@supabase/supabase-js'

const R2_BATCH_SIZE = 1000 // S3 DeleteObjects API limit per request

export async function deletePhotoStorageFiles(
  urls: string[],
  supabase: SupabaseClient,
): Promise<void> {
  const r2Keys: string[] = []
  const supabaseKeys: string[] = []

  for (const url of urls) {
    if (!url) continue
    if (url.includes(R2_PUBLIC_URL) || url.includes('r2.dev')) {
      const key = extractR2Key(url) || url.replace(`${R2_PUBLIC_URL}/`, '')
      if (key) r2Keys.push(key)
    } else if (url.includes('supabase.co')) {
      const cleanUrl = url.split('?')[0]
      const match = cleanUrl.match(/\/(?:object|render\/image)\/public\/photos\/(.+)$/)
      if (match) supabaseKeys.push(match[1])
    }
  }

  const tasks: Promise<unknown>[] = []

  for (let i = 0; i < r2Keys.length; i += R2_BATCH_SIZE) {
    const chunk = r2Keys.slice(i, i + R2_BATCH_SIZE)
    tasks.push(
      r2.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: chunk.map(Key => ({ Key })), Quiet: true },
      })).catch(err => console.warn('[photoStorage] R2 batch delete failed:', err))
    )
  }

  // Supabase Storage .remove() also accepts a batch of paths
  const SUPABASE_BATCH_SIZE = 1000
  for (let i = 0; i < supabaseKeys.length; i += SUPABASE_BATCH_SIZE) {
    const chunk = supabaseKeys.slice(i, i + SUPABASE_BATCH_SIZE)
    tasks.push(
      supabase.storage.from('photos').remove(chunk)
        .then(({ error }) => { if (error) console.warn('[photoStorage] Supabase Storage batch delete failed:', error) })
    )
  }

  await Promise.all(tasks)
}
