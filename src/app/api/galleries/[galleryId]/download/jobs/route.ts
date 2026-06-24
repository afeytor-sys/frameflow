import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// DELETE /api/galleries/[galleryId]/download/jobs
// Deletes all download jobs for the gallery so the next request rebuilds fresh.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // photographer_id on galleries IS the auth user.id — one query is enough
  const { data: gallery } = await supabase
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('photographer_id', user.id)
    .single()

  if (!gallery) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { error } = await service
    .from('gallery_download_jobs')
    .delete()
    .eq('gallery_id', galleryId)

  if (error) {
    console.error('[delete jobs]', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
