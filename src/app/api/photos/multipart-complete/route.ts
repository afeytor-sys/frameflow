/**
 * POST /api/photos/multipart-complete
 *
 * Finalises an S3 multipart upload after all parts have been PUT directly to R2.
 *
 * Body: { key, uploadId, parts: Array<{ partNumber: number, etag: string }> }
 * Response: { ok: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { key, uploadId, parts } = await req.json()
    if (!key || !uploadId || !Array.isArray(parts)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await r2.send(
      new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(({ partNumber, etag }: { partNumber: number; etag: string }) => ({
            PartNumber: partNumber,
            ETag: etag,
          })),
        },
      })
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[multipart-complete]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Complete failed' },
      { status: 500 }
    )
  }
}
