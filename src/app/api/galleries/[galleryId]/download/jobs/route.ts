import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// DELETE /api/galleries/[galleryId]/download/jobs
// Deletes all download jobs for the gallery so the next request rebuilds fresh.
// Auth: only the gallery owner (photographer) may call this.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params
  const supabase = await createClient()

  // Verify the caller owns this gallery
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, project_id')
    .eq('id', galleryId)
    .single()

  if (!gallery) return Response.json({ error: 'Not found' }, { status: 404 })

  // Confirm the photographer owns the project that owns this gallery
  const { data: project } = await supabase
    .from('projects')
    .select('photographer_id')
    .eq('id', gallery.project_id)
    .single()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!photographer || project?.photographer_id !== photographer.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service client to bypass RLS and delete all jobs for this gallery
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
