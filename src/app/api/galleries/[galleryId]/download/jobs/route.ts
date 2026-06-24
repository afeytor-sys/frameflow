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

  // Get the authenticated user via cookie (needs user client)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service client to bypass RLS for all DB operations
  const service = createServiceClient()

  // Verify ownership: galleries.photographer_id = auth user ID
  const { data: gallery } = await service
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('photographer_id', user.id)
    .maybeSingle()

  if (!gallery) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Delete all jobs for this gallery
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
