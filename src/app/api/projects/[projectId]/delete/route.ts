/**
 * DELETE /api/projects/[projectId]/delete
 *
 * Permanently deletes a project: removes every photo file (across all of
 * the project's galleries) from storage (R2 + legacy Supabase Storage),
 * then deletes the project row, which cascade-deletes its `galleries` and
 * (transitively) their `photos` rows in the DB.
 *
 * Deleting the project row directly (client-side `.delete()`) only ever
 * removed DB rows — the underlying storage files were orphaned forever.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deletePhotoStorageFiles } from '@/lib/photoStorage'

const PAGE = 1000

async function fetchAllStorageUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  galleryIds: string[],
): Promise<string[]> {
  if (galleryIds.length === 0) return []
  const urls: string[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('photos')
      .select('storage_url')
      .in('gallery_id', galleryIds)
      .range(from, from + PAGE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    urls.push(...data.map(p => p.storage_url).filter((u): u is string => !!u))
    if (data.length < PAGE) break
    from += PAGE
  }
  return urls
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, photographer_id')
    .eq('id', projectId)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (project.photographer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: galleries } = await supabase
      .from('galleries')
      .select('id')
      .eq('project_id', projectId)
    const galleryIds = (galleries ?? []).map(g => g.id)

    const urls = await fetchAllStorageUrls(supabase, galleryIds)
    await deletePhotoStorageFiles(urls, supabase)
  } catch (err) {
    // Log but proceed — an orphaned file is better than a project the
    // photographer can no longer get rid of because storage cleanup failed.
    console.warn('[Project Delete] Storage cleanup failed:', err)
  }

  const { error: dbError } = await supabase.from('projects').delete().eq('id', projectId)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
