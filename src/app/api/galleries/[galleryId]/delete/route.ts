/**
 * DELETE /api/galleries/[galleryId]/delete
 *
 * Permanently deletes a gallery: removes every photo's file from storage
 * (R2 + legacy Supabase Storage) then deletes the gallery row, which
 * cascade-deletes its `photos` rows in the DB.
 *
 * Deleting the gallery row directly (client-side `.delete()`) only ever
 * removed DB rows — the underlying storage files were orphaned forever.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deletePhotoStorageFiles } from '@/lib/photoStorage'

const PAGE = 1000

async function fetchAllStorageUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  galleryId: string,
): Promise<string[]> {
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
    urls.push(...data.map(p => p.storage_url).filter((u): u is string => !!u))
    if (data.length < PAGE) break
    from += PAGE
  }
  return urls
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: gallery, error: fetchError } = await supabase
    .from('galleries')
    .select('id, photographer_id')
    .eq('id', galleryId)
    .single()

  if (fetchError || !gallery) {
    return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
  }
  if (gallery.photographer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const urls = await fetchAllStorageUrls(supabase, galleryId)
    await deletePhotoStorageFiles(urls, supabase)
  } catch (err) {
    // Log but proceed — an orphaned file is better than photos the
    // photographer can no longer get rid of because storage cleanup failed.
    console.warn('[Gallery Delete] Storage cleanup failed:', err)
  }

  const { error: dbError } = await supabase.from('galleries').delete().eq('id', galleryId)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
