/**
 * POST /api/photos/presign
 *
 * Generates a presigned PUT URL so the browser can upload directly to R2
 * without routing the file through Vercel (which has a 4.5 MB body limit).
 *
 * Request body (JSON):
 *   { galleryId: string, filename: string, contentType: string, fileSize: number }
 *
 * Response:
 *   { presignedUrl: string, key: string, publicUrl: string }
 *
 * The browser then does:
 *   PUT presignedUrl  (with the raw file as body, Content-Type header)
 * And afterwards calls /api/photos/register to save the DB record.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET, getR2PublicUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { galleryId, filename, contentType, fileSize } = await request.json()

    if (!galleryId || !filename || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build a unique key
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Generate presigned PUT URL (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize,
    })

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 900 })
    const publicUrl = getR2PublicUrl(key)

    return NextResponse.json({ presignedUrl, key, publicUrl })
  } catch (err) {
    console.error('[Presign] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Presign failed' },
      { status: 500 }
    )
  }
}
