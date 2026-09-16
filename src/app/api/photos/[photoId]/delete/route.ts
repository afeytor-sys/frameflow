/**
 * DELETE /api/photos/[photoId]/delete
 *
 * Deletes a photo from:
 *   1. Cloudflare R2 (if the URL is an R2 URL)
 *   2. Supabase Storage (if the URL is a Supabase URL) — kept for backward compat
 *   3. The Supabase `photos` table
 *
 * Body JSON: { storageUrl: string }
 *
 * Only the authenticated photographer who owns the gallery can delete photos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let storageUrl = ''
  try {
    const body = await request.json()
    storageUrl = body.storageUrl || ''
  } catch {
    // storageUrl is optional — we can still delete the DB record
  }

  // Verify the photo belongs to this photographer's gallery. Galleries carry
  // their own photographer_id directly (project_id is optional — migration 101 —
  // so checking ownership via the linked project misses project-less galleries).
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('id, storage_url, gallery:galleries(photographer_id)')
    .eq('id', photoId)
    .single()

  if (fetchError || !photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  const gallery = Array.isArray(photo.gallery) ? photo.gallery[0] : photo.gallery
  const photographerId = gallery?.photographer_id

  if (!photographerId || photographerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = storageUrl || photo.storage_url || ''

  // ── Delete from storage ──────────────────────────────────────────────────
  if (url) {
    try {
      if (url.includes(R2_PUBLIC_URL) || url.includes('r2.dev')) {
        // R2 URL — extract the key from the URL
        const key = url.replace(`${R2_PUBLIC_URL}/`, '')
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
      } else if (url.includes('supabase.co')) {
        // Legacy Supabase Storage URL — extract path and delete
        // Format: .../storage/v1/object/public/photos/<path>
        // or render URL: .../storage/v1/render/image/public/photos/<path>?...
        const cleanUrl = url.split('?')[0]
        const match = cleanUrl.match(/\/(?:object|render\/image)\/public\/photos\/(.+)$/)
        if (match) {
          await supabase.storage.from('photos').remove([match[1]])
        }
      }
    } catch (storageErr) {
      // Log but don't fail — we still want to remove the DB record
      console.warn('[Photo Delete] Storage deletion failed:', storageErr)
    }
  }

  // ── Delete from database ─────────────────────────────────────────────────
  // Supabase/Postgres RLS quirk: if the DELETE policy doesn't match, the
  // query still comes back with no error — it just deletes 0 rows. Without
  // .select() to check what was actually deleted, that silent no-op looks
  // identical to success and the photo just... stays there.
  const { data: deletedRows, error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .select('id')

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  if (!deletedRows || deletedRows.length === 0) {
    console.error(`[Photo Delete] DELETE affected 0 rows for photo ${photoId} — ownership check passed (photographerId ${photographerId}) but the DB delete didn't match. Likely an RLS policy mismatch.`)
    return NextResponse.json({ error: 'Delete did not remove the photo (permission mismatch)' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
