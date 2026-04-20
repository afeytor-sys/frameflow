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
  // If access token exists and is still valid (with 5 min buffer), return it
  if (photographer.google_calendar_access_token) {
    const expiry = photographer.google_calendar_token_expiry
      ? new Date(photographer.google_calendar_token_expiry)
      : null

    if (expiry && expiry.getTime() - Date.now() > 5 * 60 * 1000) {
      return photographer.google_calendar_access_token
    }
  }

  // Need to refresh — requires refresh token
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
    if (!data.access_token) {
      console.error('[googleCalendar] Token refresh failed:', data.error, data.error_description)
      return null
    }

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
  } catch (err) {
    console.error('[googleCalendar] getValidAccessToken error:', err)
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

// ── Booking event (datetime, not all-day, optional Google Meet) ───────────────

export interface BookingEventData {
  bookingId: string
  title: string
  description?: string
  date: string       // "YYYY-MM-DD"
  startTime: string  // "HH:MM"
  durationMinutes: number
  location?: string
  isOnline?: boolean
}

export async function createBookingEvent(
  photographer: PhotographerCalendarData,
  eventData: BookingEventData,
  supabase: any
): Promise<{ eventId: string | null; meetLink: string | null }> {
  const accessToken = await getValidAccessToken(photographer, supabase)
  if (!accessToken) return { eventId: null, meetLink: null }

  const startISO = `${eventData.date}T${eventData.startTime}:00`
  const endDate = new Date(`${startISO}`)
  endDate.setMinutes(endDate.getMinutes() + eventData.durationMinutes)
  const endISO = endDate.toISOString().slice(0, 19) // "YYYY-MM-DDTHH:MM:SS"

  const event: Record<string, unknown> = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: { dateTime: startISO, timeZone: 'Europe/Berlin' },
    end:   { dateTime: endISO,   timeZone: 'Europe/Berlin' },
    colorId: '11',
  }

  // Add conferenceData for Google Meet (online bookings)
  if (eventData.isOnline) {
    event.conferenceData = {
      createRequest: {
        requestId: eventData.bookingId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }

  const url = eventData.isOnline
    ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1'
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[googleCalendar] createBookingEvent API error:', data.error)
      return { eventId: null, meetLink: null }
    }
    const eventId = data.id || null
    const meetLink = data.conferenceData?.entryPoints?.[0]?.uri || null

    return { eventId, meetLink }
  } catch (err) {
    console.error('[googleCalendar] createBookingEvent error:', err)
    return { eventId: null, meetLink: null }
  }
}

// ── FreeBusy query — returns occupied periods ─────────────────────────────────

export async function getFreeBusy(
  photographer: PhotographerCalendarData,
  timeMin: string,  // ISO datetime
  timeMax: string,  // ISO datetime
  supabase: any
): Promise<Array<{ start: string; end: string }>> {
  const accessToken = await getValidAccessToken(photographer, supabase)
  if (!accessToken) return []

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: 'Europe/Berlin',
        items: [{ id: 'primary' }],
      }),
    })

    const data = await res.json()
    const busy: Array<{ start: string; end: string }> =
      data.calendars?.primary?.busy ?? []

    return busy
  } catch {
    return []
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
