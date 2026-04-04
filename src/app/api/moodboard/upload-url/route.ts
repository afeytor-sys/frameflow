import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createServiceClient } from '@/lib/supabase/service'
import { r2, R2_BUCKET, getR2PublicUrl } from '@/lib/r2'

/**
 * POST /api/moodboard/upload-url
 * Generates a presigned PUT URL so the client browser can upload
 * a moodboard photo directly to R2 without going through Vercel.
 *
 * Body: { project_id, token, filename, contentType }
 * Response: { presignedUrl, publicUrl }
 */
export async function POST(req: NextRequest) {
  const { project_id, token, filename, contentType } = await req.json()

  if (!project_id || !token || !filename) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Validate the client token — same check as the main moodboard route
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .or(`client_token.eq.${token},custom_slug.eq.${token}`)
    .eq('id', project_id)
    .single()

  if (!project) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const key = `moodboard/${project_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType || 'image/jpeg',
  })

  const presignedUrl = await getSignedUrl(r2, command, {
    expiresIn: 900,
    unhoistableHeaders: new Set(['x-amz-checksum-crc32']),
  })

  return NextResponse.json({ presignedUrl, publicUrl: getR2PublicUrl(key) })
}
