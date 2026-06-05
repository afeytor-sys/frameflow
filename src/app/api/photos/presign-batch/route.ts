/**
 * POST /api/photos/presign-batch
 *
 * Generates up to 20 presigned PUT URLs in a single request,
 * reducing Vercel function calls from N (one per file) to ceil(N/20).
 *
 * Request body:
 *   { galleryId: string, files: Array<{ filename: string, contentType: string, fileSize: number }> }
 *
 * Response:
 *   { urls: Array<{ presignedUrl: string, publicUrl: string, key: string }> }
 */
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET, getR2PublicUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

const MAX_BATCH = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { galleryId, files } = await request.json()

    if (!galleryId || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (files.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_BATCH} files per batch` }, { status: 400 })
    }

    const urls = await Promise.all(
      files.map(async ({ filename, contentType }: { filename: string; contentType: string; fileSize: number }) => {
        const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase()
        const key = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const command = new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          // ContentType intentionally omitted — same reason as single presign route
        })

        const presignedUrl = await getSignedUrl(r2, command, {
          expiresIn: 900,
          unhoistableHeaders: new Set(['x-amz-checksum-crc32', 'content-type']),
        })

        return { presignedUrl, publicUrl: getR2PublicUrl(key), key }
      })
    )

    return NextResponse.json({ urls }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[presign-batch]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Presign-batch failed' },
      { status: 500 }
    )
  }
}
