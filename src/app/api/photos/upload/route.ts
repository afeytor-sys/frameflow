/**
 * POST /api/photos/upload
 *
 * Receives a multipart/form-data request with:
 *   - file: the image File
 *   - galleryId: string
 *   - contentType: MIME type string
 *
 * Uploads the file to Cloudflare R2 and returns the public URL.
 * The caller (PhotoUploader) then inserts the photo record into Supabase.
 *
 * This route runs server-side only — the R2 credentials never reach the browser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, getR2PublicUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify the user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const galleryId = formData.get('galleryId') as string | null
    const contentType = (formData.get('contentType') as string | null) || 'image/jpeg'

    if (!file || !galleryId) {
      return NextResponse.json({ error: 'Missing file or galleryId' }, { status: 400 })
    }

    // Build a unique key: galleries/<galleryId>/<timestamp>-<random>.<ext>
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Convert File → ArrayBuffer → Buffer for the S3 SDK
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Make the object publicly readable via the R2 public bucket URL
        // (public access is configured at the bucket level in Cloudflare dashboard)
      })
    )

    const publicUrl = getR2PublicUrl(key)

    // thumbnail_url = same as storage_url for now.
    // Cloudflare Image Resizing (cdn-cgi/image) requires a Pro plan.
    // When upgraded, swap to: getPhotoThumbnailUrl(key)
    return NextResponse.json({ url: publicUrl, thumbnailUrl: publicUrl, key })
  } catch (err) {
    console.error('[R2 Upload] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// ── Next.js App Router route segment config ──────────────────────────────────
// Increase the max request body size for file uploads.
// Vercel Hobby: 4.5 MB hard limit (cannot be overridden).
// Vercel Pro/Enterprise: up to 4.5 MB per serverless function invocation.
// For larger files, use the presigned URL approach (/api/photos/presign).
export const maxDuration = 60  // seconds
export const dynamic = 'force-dynamic'
