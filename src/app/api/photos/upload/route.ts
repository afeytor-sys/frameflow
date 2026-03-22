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
 *
 * NOTE: Vercel Hobby has a 4.5 MB body limit per serverless invocation.
 * For larger files, the R2 CORS must be configured and presigned URLs used instead.
 * This route handles files up to 4.5 MB reliably on Vercel Hobby.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, getR2PublicUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

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
      })
    )

    const publicUrl = getR2PublicUrl(key)

    return NextResponse.json({ url: publicUrl, thumbnailUrl: publicUrl, key })
  } catch (err) {
    console.error('[R2 Upload] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
