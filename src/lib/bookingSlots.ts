// ── Booking slot generation ────────────────────────────────────────────────────
// Given a BookingType and its availability config, compute which date+time
// slots are available for a client to book.
//
// Sources of unavailability (all excluded from results):
//   1. Outside the recurring availability window for that day of week
//   2. Slot falls within buffer_minutes of another confirmed/pending booking
//   3. A booking_blocked_slots record covers that date/time
//   4. The datetime is within min_notice_hours of now
//   5. The date is more than max_advance_days in the future
//   6. (If caller provides busy periods from Google Calendar freebusy) — overlaps

export interface SpecificSlotEntry {
  date: string   // "YYYY-MM-DD"
  times: string[] // ["HH:MM", ...]
}

export interface BookingTypeConfig {
  id: string
  availability_type: 'recurring' | 'slots' | 'request'
  duration_minutes: number
  buffer_minutes: number
  min_notice_hours: number
  max_advance_days: number
  specific_slots?: SpecificSlotEntry[]
}

export interface RecurringWindow {
  day_of_week: number  // 0=Sun … 6=Sat
  start_time: string   // "HH:MM:SS" or "HH:MM"
  end_time: string
}

export interface ExistingBooking {
  booked_date: string      // "YYYY-MM-DD"
  booked_time: string      // "HH:MM:SS" or "HH:MM"
  status: string
  duration_minutes?: number // actual duration of that booking (may differ from current type)
}

export interface BlockedSlot {
  blocked_date: string
  blocked_time: string | null  // null = entire day
}

export interface BusyPeriod {
  start: string  // ISO datetime
  end: string
}

export interface DaySlots {
  date: string    // "YYYY-MM-DD"
  slots: string[] // ["09:00", "10:00", …]
}

// Parse "HH:MM" or "HH:MM:SS" → total minutes from midnight
function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Format minutes-from-midnight → "HH:MM"
function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// "YYYY-MM-DD" + "HH:MM" → Date
function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00`)
}

export function generateAvailableSlots(
  config: BookingTypeConfig,
  recurringWindows: RecurringWindow[],
  existingBookings: ExistingBooking[],
  blockedSlots: BlockedSlot[],
  busyPeriods: BusyPeriod[] = [],
  referenceNow: Date = new Date(),
): DaySlots[] {
  const results: DaySlots[] = []
  const { duration_minutes, buffer_minutes, min_notice_hours, max_advance_days } = config

  // Earliest bookable moment
  const earliest = new Date(referenceNow.getTime() + min_notice_hours * 60 * 60 * 1000)
  // Latest bookable date
  const latestDate = new Date(referenceNow)
  latestDate.setDate(latestDate.getDate() + max_advance_days)

  // Build a set of blocked dates (entire day)
  const blockedFullDays = new Set(
    blockedSlots.filter(b => !b.blocked_time).map(b => b.blocked_date),
  )

  // Build a map of blocked date+time pairs
  const blockedDateTimes = new Set(
    blockedSlots
      .filter(b => !!b.blocked_time)
      .map(b => `${b.blocked_date}T${b.blocked_time!.slice(0, 5)}`),
  )

  // Active bookings (pending or confirmed) keyed by date
  const activeStatuses = new Set(['pending', 'deposit_received', 'confirmed'])
  const bookingsByDate: Record<string, Array<{ start: number; dur: number }>> = {}
  for (const bk of existingBookings) {
    if (!activeStatuses.has(bk.status)) continue
    if (!bookingsByDate[bk.booked_date]) bookingsByDate[bk.booked_date] = []
    bookingsByDate[bk.booked_date].push({
      start: parseTimeToMinutes(bk.booked_time),
      dur: bk.duration_minutes ?? duration_minutes,
    })
  }

  // ── Specific slots mode ──────────────────────────────────────────────────
  if (config.availability_type === 'slots') {
    for (const entry of (config.specific_slots ?? [])) {
      const dateStr = entry.date
      if (blockedFullDays.has(dateStr)) continue

      const availableTimes: string[] = []
      for (const rawTime of entry.times) {
        const slotHHMM = rawTime.slice(0, 5)
        const slotStart = parseTimeToMinutes(slotHHMM)
        const slotEnd   = slotStart + duration_minutes
        const slotDateTime = toDateTime(dateStr, slotHHMM)

        if (slotDateTime < earliest) continue
        if (blockedDateTimes.has(`${dateStr}T${slotHHMM}`)) continue

        const existingMins = bookingsByDate[dateStr] ?? []
        const overlapsExisting = existingMins.some(({ start: existStart, dur: existDur }) => {
          const existEnd     = existStart + existDur + buffer_minutes
          const candidateEnd = slotEnd + buffer_minutes
          return slotStart < existEnd && candidateEnd > existStart
        })
        if (overlapsExisting) continue

        const slotMs    = slotDateTime.getTime()
        const slotEndMs = slotMs + duration_minutes * 60 * 1000
        const overlapsBusy = busyPeriods.some(bp => {
          const bpStart = new Date(bp.start).getTime()
          const bpEnd   = new Date(bp.end).getTime()
          return slotMs < bpEnd && slotEndMs > bpStart
        })
        if (overlapsBusy) continue

        availableTimes.push(slotHHMM)
      }

      if (availableTimes.length > 0) {
        results.push({ date: dateStr, slots: availableTimes })
      }
    }
    return results
  }

  // ── Recurring mode — iterate day by day ──────────────────────────────────
  const cursor = new Date(referenceNow)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= latestDate) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const dow = cursor.getDay()

    // Skip if entire day is blocked
    if (!blockedFullDays.has(dateStr)) {
      // Find recurring windows for this day of week
      const windows = recurringWindows.filter(w => w.day_of_week === dow)

      if (windows.length > 0) {
        const daySlots: string[] = []

        for (const win of windows) {
          const winStart = parseTimeToMinutes(win.start_time)
          const winEnd   = parseTimeToMinutes(win.end_time)

          // Generate candidate slots from winStart to winEnd - duration
          let slotStart = winStart
          while (slotStart + duration_minutes <= winEnd) {
            const slotEnd = slotStart + duration_minutes
            const slotHHMM = minutesToHHMM(slotStart)
            const slotDateTime = toDateTime(dateStr, slotHHMM)

            // 1. Not in the past / before min_notice_hours
            if (slotDateTime >= earliest) {

              // 2. Not manually blocked
              if (!blockedDateTimes.has(`${dateStr}T${slotHHMM}`)) {

                // 3. No existing booking overlaps (including buffer on both sides)
                const existingMins = bookingsByDate[dateStr] ?? []
                const overlapsExisting = existingMins.some(({ start: existStart, dur: existDur }) => {
                  const existEnd = existStart + existDur + buffer_minutes
                  const candidateEnd = slotEnd + buffer_minutes
                  return slotStart < existEnd && candidateEnd > existStart
                })

                if (!overlapsExisting) {
                  // 4. No Google Calendar busy period overlaps
                  const slotDateTimeMs = slotDateTime.getTime()
                  const slotEndMs = slotDateTimeMs + duration_minutes * 60 * 1000
                  const overlapsBusy = busyPeriods.some(bp => {
                    const bpStart = new Date(bp.start).getTime()
                    const bpEnd   = new Date(bp.end).getTime()
                    return slotDateTimeMs < bpEnd && slotEndMs > bpStart
                  })

                  if (!overlapsBusy) {
                    daySlots.push(slotHHMM)
                  }
                }
              }
            }

            // Advance by duration + buffer
            slotStart += duration_minutes + buffer_minutes
          }
        }

        if (daySlots.length > 0) {
          results.push({ date: dateStr, slots: daySlots })
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return results
}

// Slug generation from a title string
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}
