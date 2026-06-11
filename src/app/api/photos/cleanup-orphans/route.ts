/**
 * POST /api/photos/cleanup-orphans
 *
 * Deletes R2 objects that were uploaded successfully but whose Supabase
 * DB insert failed — leaving orphaned files in storage.
 *
 * Called automatically by UploadContext after any upload batch that
 * ends with a DB insert error. Only the authenticated photographer
 * can trigger this.
 *
 * Body: { keys: string[] }   — R2 object keys (not full URLs)
 * Response: { deleted: number, failed: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

const MAX_KEYS = 100 // guard against accidental bulk deletes

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let keys: string[]
  try {
    const body = await req.json()
    keys = body.keys
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'keys must be a non-empty array' }, { status: 400 })
    }
    if (keys.length > MAX_KEYS) {
      return NextResponse.json({ error: `Max ${MAX_KEYS} keys per request` }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Only allow deleting keys that belong to this photographer's galleries.
  // Extract galleryId from key pattern galleries/${galleryId}/filename and
  // verify the gallery belongs to the authenticated user.
  const galleryIds = [...new Set(
    keys
      .map(k => k.match(/^galleries\/([^/]+)\//)?.[1])
      .filter((id): id is string => !!id)
  )]

  if (galleryIds.length === 0) {
    return NextResponse.json({ error: 'No valid gallery keys found' }, { status: 400 })
  }

  const { data: ownedGalleries } = await supabase
    .from('galleries')
    .select('id')
    .in('id', galleryIds)
    .eq('photographer_id', user.id)

  const ownedIds = new Set((ownedGalleries ?? []).map(g => g.id))

  // Filter to only keys the authenticated user owns
  const allowedKeys = keys.filter(k => {
    const gid = k.match(/^galleries\/([^/]+)\//)?.[1]
    return gid && ownedIds.has(gid)
  })

  if (allowedKeys.length === 0) {
    return NextResponse.json({ error: 'No authorized keys to delete' }, { status: 403 })
  }

  let deleted = 0
  let failed = 0

  await Promise.all(
    allowedKeys.map(async key => {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
        deleted++
      } catch (err) {
        failed++
        console.error('[cleanup-orphans] failed to delete', key, err)
      }
    })
  )

  return NextResponse.json({ deleted, failed })
}
