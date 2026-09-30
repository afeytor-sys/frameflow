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
import { deleteGalleryWithStorage } from '@/lib/deleteGallery'

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
    await deleteGalleryWithStorage(galleryId, supabase)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete gallery'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
