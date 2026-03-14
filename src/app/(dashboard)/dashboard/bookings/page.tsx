'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CalendarDays, List, MapPin, User, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

interface Booking {
  id: string
  title: string
  shoot_date: string
  location: string | null
  status: string
  client: { full_name: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  lead:      { bg: 'rgba(107,114,128,0.10)', color: '#6B7280', label: 'Lead' },
  booked:    { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C', label: 'Gebucht' },
  shooting:  { bg: 'rgba(59,130,246,0.10)',  color: '#3B82F6', label: 'Shooting' },
  editing:   { bg: 'rgba(168,85,247,0.10)',  color: '#A855F7', label: 'Bearbeitung' },
  delivered: { bg: 'rgba(42,155,104,0.10)',  color: '#2A9B68', label: 'Geliefert' },
  completed: { bg: 'rgba(42,155,104,0.10)',  color: '#2A9B68', label: 'Abgeschlossen' },
  cancelled: { bg: 'rgba(196,59,44,0.10)',   color: '#C43B2C', label: 'Storniert' },
}

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAYS_DE = ['Mo','Di','Mi','Do','Fr','Sa','So']

function formatDateDE(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('projects')
        .select('id, title, shoot_date, location, status, client:clients(full_name)')
        .eq('photographer_id', user.id)
        .not('shoot_date', 'is', null)
        .order('shoot_date', { ascending: true })

      setBookings((data || []).map(p => ({
        ...p,
        client: Array.isArray(p.client) ? p.client[0] || null : p.client,
      })) as Booking[])
      setLoading(false)
    }
    load()
  }, [])

  // Split into upcoming and past
  const today = new Date(); today.setHours(0,0,0,0)
  const upcoming = bookings.filter(b => new Date(b.shoot_date + 'T00:00:00') >= today)
  const past = bookings.filter(b => new Date(b.shoot_date + 'T00:00:00') < today)

  // Calendar helpers
  const { year, month } = calMonth
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-first: 0=Mon..6=Sun
  const startDow = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const bookingsByDate: Record<string, Booking[]> = {}
  bookings.forEach(b => {
    const key = b.shoot_date.slice(0, 10)
    if (!bookingsByDate[key]) bookingsByDate[key] = []
    bookingsByDate[key].push(b)
  })

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in">
        <div className="h-8 w-36 rounded-lg shimmer" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            Bookings
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {upcoming.length} bevorstehend · {past.length} vergangen
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: view === 'list' ? 'var(--bg-active)' : 'transparent',
              color: view === 'list' ? 'var(--text-on-active)' : 'var(--text-muted)',
            }}
          >
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
          <button
            onClick={() => setView('calendar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: view === 'calendar' ? 'var(--bg-active)' : 'transparent',
              color: view === 'calendar' ? 'var(--text-on-active)' : 'var(--text-muted)',
            }}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Kalender
          </button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--bg-hover)' }}>
                <CalendarDays className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Keine Bookings</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Füge ein Shooting-Datum zu einem Projekt hinzu</p>
              <Link href="/dashboard/projects"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--text-primary)' }}>
                Zu den Projekten
              </Link>
            </div>
          ) : (
            <>
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-muted)' }}>
                    Bevorstehend
                  </p>
                  <div className="space-y-2">
                    {upcoming.map(b => {
                      const days = daysUntil(b.shoot_date)
                      const st = STATUS_COLORS[b.status] || STATUS_COLORS.booked
                      const isToday = days === 0
                      return (
                        <Link key={b.id} href={`/dashboard/projects/${b.id}`}
                          className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                          style={{ background: 'var(--bg-surface)', border: isToday ? '1px solid rgba(196,164,124,0.4)' : '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                          {/* Date block */}
                          <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                            style={{ background: isToday ? 'var(--accent-muted)' : 'var(--bg-hover)' }}>
                            <span className="text-[11px] font-bold uppercase" style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                              {new Date(b.shoot_date + 'T00:00:00').toLocaleDateString('de-DE', { month: 'short' })}
                            </span>
                            <span className="text-[22px] font-black leading-none" style={{ color: isToday ? 'var(--accent)' : 'var(--text-primary)' }}>
                              {new Date(b.shoot_date + 'T00:00:00').getDate()}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
                                style={{ background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {b.client && (
                                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                  <User className="w-3 h-3" />{b.client.full_name}
                                </span>
                              )}
                              {b.location && (
                                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                  <MapPin className="w-3 h-3" />{b.location}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Days until */}
                          <div className="flex-shrink-0 text-right">
                            {isToday ? (
                              <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>Heute!</span>
                            ) : (
                              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                in {days} {days === 1 ? 'Tag' : 'Tagen'}
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Past */}
              {past.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-muted)' }}>
                    Vergangen
                  </p>
                  <div className="space-y-2">
                    {[...past].reverse().map(b => {
                      const st = STATUS_COLORS[b.status] || STATUS_COLORS.booked
                      return (
                        <Link key={b.id} href={`/dashboard/projects/${b.id}`}
                          className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5 opacity-60 hover:opacity-100"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                          <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--bg-hover)' }}>
                            <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                              {new Date(b.shoot_date + 'T00:00:00').toLocaleDateString('de-DE', { month: 'short' })}
                            </span>
                            <span className="text-[22px] font-black leading-none" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(b.shoot_date + 'T00:00:00').getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
                                style={{ background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {b.client && (
                                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                  <User className="w-3 h-3" />{b.client.full_name}
                                </span>
                              )}
                              {b.location && (
                                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                  <MapPin className="w-3 h-3" />{b.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {formatDateDE(b.shoot_date)}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          {/* Calendar header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => setCalMonth(m => {
              const d = new Date(m.year, m.month - 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]">
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>
              {MONTHS_DE[month]} {year}
            </h2>
            <button onClick={() => setCalMonth(m => {
              const d = new Date(m.year, m.month + 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS_DE.map(d => (
              <div key={d} className="text-center text-[11px] font-bold py-2" style={{ color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px px-2 pb-3" style={{ background: 'var(--border-color)' }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startDow + 1
              const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate()
              const dateKey = isCurrentMonth
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : ''
              const dayBookings = dateKey ? (bookingsByDate[dateKey] || []) : []
              const todayKey = new Date().toISOString().slice(0, 10)
              const isToday = dateKey === todayKey

              return (
                <div key={i} className="min-h-[80px] p-1.5 flex flex-col"
                  style={{ background: isCurrentMonth ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
                  {isCurrentMonth && (
                    <>
                      <span className={`text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'text-white' : ''}`}
                        style={{
                          background: isToday ? 'var(--accent)' : 'transparent',
                          color: isToday ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {dayNum}
                      </span>
                      <div className="space-y-0.5 flex-1">
                        {dayBookings.slice(0, 2).map(b => {
                          const st = STATUS_COLORS[b.status] || STATUS_COLORS.booked
                          return (
                            <Link key={b.id} href={`/dashboard/projects/${b.id}`}
                              className="block px-1.5 py-0.5 rounded text-[10px] font-semibold truncate"
                              style={{ background: st.bg, color: st.color }}>
                              {b.title}
                            </Link>
                          )
                        })}
                        {dayBookings.length > 2 && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            +{dayBookings.length - 2} mehr
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-3 flex flex-wrap gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            {Object.entries(STATUS_COLORS).slice(0, 5).map(([key, val]) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] font-medium">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: val.bg, border: `1px solid ${val.color}` }} />
                <span style={{ color: 'var(--text-muted)' }}>{val.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
