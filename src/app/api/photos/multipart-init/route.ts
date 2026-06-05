/**
 * POST /api/photos/multipart-init
 *
 * Initialises an S3 multipart upload and returns presigned PUT URLs for each
 * part so the browser can upload them directly to R2.
 *
 * Body: { galleryId, filename, contentType, fileSize }
 * Response: { uploadId, key, publicUrl, partUrls: string[] }
 *
 * Chunk size is 10 MB; the last part may be smaller (S3 requires ≥ 5 MB for
 * all parts except the last).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET, getR2PublicUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

const CHUNK_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { galleryId, filename, contentType, fileSize } = await req.json()
    if (!galleryId || !filename || !fileSize) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase()
    const key = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const type = contentType || 'image/jpeg'

    // 1. Create the multipart upload
    const { UploadId: uploadId } = await r2.send(
      new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: type,
      })
    )
    if (!uploadId) throw new Error('No uploadId returned')

    // 2. Pre-sign a PUT URL for each 10 MB part
    const partCount = Math.ceil(fileSize / CHUNK_SIZE)
    const partUrls = await Promise.all(
      Array.from({ length: partCount }, (_, i) =>
        getSignedUrl(
          r2,
          new UploadPartCommand({
            Bucket: R2_BUCKET,
            Key: key,
            UploadId: uploadId,
            PartNumber: i + 1,
          }),
          { expiresIn: 3600 } // 1 hour — large files can be slow
        )
      )
    )

    return NextResponse.json(
      { uploadId, key, publicUrl: getR2PublicUrl(key), partUrls },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[multipart-init]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Init failed' },
      { status: 500 }
    )
  }
}
