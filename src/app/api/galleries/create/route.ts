/**
 * POST /api/galleries/create
 *
 * Creates a gallery for a project using the service role (bypasses RLS).
 * The browser INSERT via createClient() is blocked by RLS policies.
 *
 * Security:
 *   1. Verifies the user is authenticated
 *   2. Verifies the project belongs to this photographer
 *   3. Only then inserts the gallery
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      project_id,
      title,
      status = 'active',
      watermark = false,
      download_enabled = true,
      comments_enabled = true,
      view_count = 0,
      download_count = 0,
      design_theme = 'classic-white',
      tags_enabled = ['green', 'yellow', 'red'],
      password,
      sets = [],
    } = body

    if (!project_id || !title) {
      return NextResponse.json({ error: 'Missing project_id or title' }, { status: 400 })
    }

    // 2. Verify the project belongs to this photographer
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, photographer_id')
      .eq('id', project_id)
      .eq('photographer_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    // 3. Insert gallery using service role (bypasses RLS)
    const service = createServiceClient()
    const { data: gallery, error: galleryError } = await service
      .from('galleries')
      .insert({
        project_id,
        photographer_id: user.id,
        title: title.trim(),
        status,
        watermark,
        download_enabled,
        comments_enabled,
        view_count,
        download_count,
        design_theme,
        tags_enabled,
        ...(password ? { password } : {}),
      })
      .select()
      .single()

    if (galleryError) {
      console.error('[galleries/create] Insert error:', galleryError)
      return NextResponse.json({ error: galleryError.message }, { status: 500 })
    }

    // 4. Create sets if provided
    if (sets.length > 0) {
      await service
        .from('gallery_sections')
        .insert(sets.map((title: string, i: number) => ({
          gallery_id: gallery.id,
          title,
          display_order: i,
        })))
    }

    return NextResponse.json({ gallery })
  } catch (err) {
    console.error('[galleries/create] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
