import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/googleCalendar'

export async function POST(request: NextRequest) {
  try {
    const { projectId, action } = await request.json()
    // action: 'upsert' | 'delete'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch photographer with calendar tokens
    const { data: photographer } = await supabase
      .from('photographers')
      .select('id, full_name, studio_name, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry')
      .eq('id', user.id)
      .single()

    if (!photographer?.google_calendar_access_token) {
      return NextResponse.json({ skipped: true, reason: 'no_calendar_connected' })
    }

    // Fetch project
    const { data: project } = await supabase
      .from('projects')
      .select('id, title, shoot_date, meeting_point, google_calendar_event_id, client:clients(full_name)')
      .eq('id', projectId)
      .eq('photographer_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const studioName = photographer.studio_name || photographer.full_name || 'Fotonizer'
    const clientName = Array.isArray(project.client) ? project.client[0]?.full_name : (project.client as any)?.full_name

    // DELETE action
    if (action === 'delete') {
      if (project.google_calendar_event_id) {
        await deleteCalendarEvent(photographer, project.google_calendar_event_id, supabase)
        await supabase
          .from('projects')
          .update({ google_calendar_event_id: null })
          .eq('id', projectId)
      }
      return NextResponse.json({ success: true, action: 'deleted' })
    }

    // UPSERT action — only if shoot_date exists
    if (!project.shoot_date) {
      return NextResponse.json({ skipped: true, reason: 'no_shoot_date' })
    }

    const eventData = {
      title: `📸 ${project.title}${clientName ? ` — ${clientName}` : ''}`,
      description: `Shooting via Fotonizer\nProjekt: ${project.title}${clientName ? `\nKunde: ${clientName}` : ''}\n\nVerwaltet in Fotonizer`,
      startDate: project.shoot_date, // YYYY-MM-DD
      location: project.meeting_point || '',
      projectId,
    }

    let googleEventId: string | null = null

    if (project.google_calendar_event_id) {
      // Update existing event
      const updated = await updateCalendarEvent(photographer, project.google_calendar_event_id, eventData, supabase)
      if (updated) {
        googleEventId = project.google_calendar_event_id
      } else {
        // If update failed (event deleted from Google), create new
        googleEventId = await createCalendarEvent(photographer, eventData, supabase)
      }
    } else {
      // Create new event
      googleEventId = await createCalendarEvent(photographer, eventData, supabase)
    }

    if (googleEventId) {
      await supabase
        .from('projects')
        .update({ google_calendar_event_id: googleEventId })
        .eq('id', projectId)
    }

    return NextResponse.json({ success: true, action: 'upserted', googleEventId })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
