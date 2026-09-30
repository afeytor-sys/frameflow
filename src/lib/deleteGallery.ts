/**
 * Shared "delete a gallery for real" logic: cleans up every photo's
 * storage file (R2 + legacy Supabase Storage) before deleting the
 * gallery row (which cascade-deletes its `photos` rows in the DB).
 *
 * Used by both the authenticated delete route
 * (src/app/api/galleries/[galleryId]/delete/route.ts) and the
 * expired-galleries cron, which runs with a service-role client and no
 * user session to check ownership against.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { deletePhotoStorageFiles } from '@/lib/photoStorage'

const PAGE = 1000

async function fetchAllStorageUrls(supabase: SupabaseClient, galleryId: string): Promise<string[]> {
  const urls: string[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('photos')
      .select('storage_url')
      .eq('gallery_id', galleryId)
      .range(from, from + PAGE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    urls.push(...data.map((p: { storage_url: string | null }) => p.storage_url).filter((u: string | null): u is string => !!u))
    if (data.length < PAGE) break
    from += PAGE
  }
  return urls
}

export async function deleteGalleryWithStorage(galleryId: string, supabase: SupabaseClient): Promise<void> {
  try {
    const urls = await fetchAllStorageUrls(supabase, galleryId)
    await deletePhotoStorageFiles(urls, supabase)
  } catch (err) {
    // Log but proceed — an orphaned file is better than a gallery the
    // photographer can no longer get rid of because storage cleanup failed.
    console.warn('[deleteGalleryWithStorage] Storage cleanup failed:', err)
  }

  const { error: dbError } = await supabase.from('galleries').delete().eq('id', galleryId)
  if (dbError) throw dbError
}
