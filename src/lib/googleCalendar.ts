// ── Google Calendar helper ────────────────────────────────────────────────────
// Handles token refresh and event CRUD for photographer's Google Calendar.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface PhotographerCalendarData {
  id: string
  google_calendar_access_token: string | null
  google_calendar_refresh_token: string | null
  google_calendar_token_expiry: string | null
}

// Refresh access token if expired
async function getValidAccessToken(
  photographer: PhotographerCalendarData,
  supabase: any
): Promise<string | null> {
  if (!photographer.google_calendar_access_token) return null

  const expiry = photographer.google_calendar_token_expiry
    ? new Date(photographer.google_calendar_token_expiry)
    : null

  // If token is still valid (with 5 min buffer), return it
  if (expiry && expiry.getTime() - Date.now() > 5 * 60 * 1000) {
    return photographer.google_calendar_access_token
  }

  // Need to refresh
  if (!photographer.google_calendar_refresh_token) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: photographer.google_calendar_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const data = await res.json()
    if (!data.access_token) return null

    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()

    // Save new token to DB
    await supabase
      .from('photographers')
      .update({
        google_calendar_access_token: data.access_token,
        google_calendar_token_expiry: newExpiry,
      })
      .eq('id', photographer.id)

    return data.access_token
  } catch {
    return null
  }
}

export interface CalendarEventData {
  title: string
  description?: string
  startDate: string // ISO date string YYYY-MM-DD
  location?: string
  projectId: string
}

// Create a Google Calendar event
export async function createCalendarEvent(
  photographer: PhotographerCalendarData,
  eventData: CalendarEventData,
  supabase: any
): Promise<string | null> {
  const accessToken = await getValidAccessToken(photographer, supabase)
  if (!accessToken) return null

  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: {
      date: eventData.startDate, // all-day event
      timeZone: 'Europe/Berlin',
    },
    end: {
      date: eventData.startDate,
      timeZone: 'Europe/Berlin',
    },
    colorId: '11', // Tomato red — stands out in calendar
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const data = await res.json()
    return data.id || null
  } catch {
    return null
  }
}

// Update an existing Google Calendar event
export async function updateCalendarEvent(
  photographer: PhotographerCalendarData,
  googleEventId: string,
  eventData: CalendarEventData,
  supabase: any
): Promise<boolean> {
  const accessToken = await getValidAccessToken(photographer, supabase)
  if (!accessToken) return false

  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: {
      date: eventData.startDate,
      timeZone: 'Europe/Berlin',
    },
    end: {
      date: eventData.startDate,
      timeZone: 'Europe/Berlin',
    },
    colorId: '11',
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

// Delete a Google Calendar event
export async function deleteCalendarEvent(
  photographer: PhotographerCalendarData,
  googleEventId: string,
  supabase: any
): Promise<boolean> {
  const accessToken = await getValidAccessToken(photographer, supabase)
  if (!accessToken) return false

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    return res.ok || res.status === 404
  } catch {
    return false
  }
}
