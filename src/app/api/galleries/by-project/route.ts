/**
 * GET /api/galleries/by-project?projectId=xxx
 *
 * Returns all galleries for a project using the service role (bypasses RLS).
 * Security: verifies the project belongs to the authenticated photographer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  // Verify project belongs to this photographer
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('photographer_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 403 })

  const service = createServiceClient()

  // Fetch galleries (no embedded photos — we fetch them separately to avoid RLS join issues)
  const { data: galleriesRaw, error } = await service
    .from('galleries')
    .select('*')
    .eq('project_id', projectId)
    .eq('photographer_id', user.id)
    .order('created_at')

  if (error) {
    console.error('[galleries/by-project]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!galleriesRaw || galleriesRaw.length === 0) {
    return NextResponse.json({ galleries: [] })
  }

  // Fetch photos for all galleries with pagination to bypass Supabase's 1000-row limit
  const galleryIds = galleriesRaw.map(g => g.id)
  const allPhotos: { id: string; gallery_id: string; storage_url: string; thumbnail_url: string | null; filename: string; display_order: number; is_favorite: boolean; is_private: boolean; file_size: number; section_id: string | null }[] = []
  const PG = 1000
  for (let from = 0; ; from += PG) {
    const { data: page } = await service
      .from('photos')
      .select('id, gallery_id, storage_url, thumbnail_url, filename, display_order, is_favorite, is_private, file_size, section_id')
      .in('gallery_id', galleryIds)
      .order('display_order', { ascending: true })
      .range(from, from + PG - 1)
    if (!page || page.length === 0) break
    allPhotos.push(...page)
    if (page.length < PG) break
  }

  // Group photos by gallery_id
  const photosByGallery: Record<string, typeof allPhotos> = {}
  for (const photo of allPhotos || []) {
    if (!photosByGallery[photo.gallery_id]) photosByGallery[photo.gallery_id] = []
    photosByGallery[photo.gallery_id]!.push(photo)
  }

  const galleries = galleriesRaw.map(g => ({
    ...g,
    photos: photosByGallery[g.id] || [],
  }))

  return NextResponse.json({ galleries })
}
