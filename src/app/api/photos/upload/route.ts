/**
 * POST /api/photos/upload
 *
 * Receives a file from the browser and uploads it to R2 server-side.
 * This avoids CORS issues with direct browser-to-R2 uploads.
 *
 * Body: multipart/form-data
 *   - file: the image file
 *   - galleryId: string
 *   - filename: string
 *   - contentType: string
 *   - fileSize: number (string)
 *
 * Returns: { publicUrl: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'
export const maxDuration = 60
// Disable Next.js body size limit so large photos can be uploaded
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const galleryId = formData.get('galleryId') as string | null
    const filename = formData.get('filename') as string | null
    const contentType = (formData.get('contentType') as string | null) || 'image/jpeg'

    if (!file || !galleryId || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify gallery belongs to this photographer
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, photographer_id')
      .eq('id', galleryId)
      .single()

    if (!gallery || gallery.photographer_id !== user.id) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 403 })
    }

    // Build R2 key
    const ext = filename.split('.').pop() || 'jpg'
    const key = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    }))

    const publicUrl = `${R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ publicUrl })
  } catch (err) {
    console.error('[photos/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
