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
  const { data: galleries, error } = await service
    .from('galleries')
    .select('*, photos(*)')
    .eq('project_id', projectId)
    .eq('photographer_id', user.id)
    .order('created_at')

  if (error) {
    console.error('[galleries/by-project]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ galleries: galleries || [] })
}
