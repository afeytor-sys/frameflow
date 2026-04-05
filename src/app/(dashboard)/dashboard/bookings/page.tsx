'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, List, MapPin, User, ChevronLeft, ChevronRight, Plus, X, Check, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'
import { generateToken } from '@/lib/utils'

interface Booking {
  id: string
  title: string
  shoot_date: string
  location: string | null
  status: string
  client: { full_name: string } | null
}

interface Client {
  id: string
  full_name: string
}

interface Project {
  id: string
  title: string
}

const STATUS_COLORS_EN: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.10)', color: '#64748B', label: 'Draft' },
  booked:    { bg: 'rgba(61,186,111,0.12)',  color: '#3DBA6F', label: 'Booked' },
  active:    { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', label: 'Active' },
  shooting:  { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C', label: 'Shooting' },
  editing:   { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', label: 'Editing' },
  delivered: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'Delivered' },
  completed: { bg: 'rgba(100,116,139,0.10)', color: '#64748B', label: 'Completed' },
  cancelled: { bg: 'rgba(196,59,44,0.10)',   color: '#C43B2C', label: 'Cancelled' },
}

const STATUS_COLORS_DE: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.10)', color: '#64748B', label: 'Draft' },
  booked:    { bg: 'rgba(61,186,111,0.12)',  color: '#3DBA6F', label: 'Gebucht' },
  active:    { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', label: 'Aktiv' },
  shooting:  { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C', label: 'Shooting' },
  editing:   { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', label: 'Bearbeitung' },
  delivered: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'Geliefert' },
  completed: { bg: 'rgba(100,116,139,0.10)', color: '#64748B', label: 'Abgeschlossen' },
  cancelled: { bg: 'rgba(196,59,44,0.10)',   color: '#C43B2C', label: 'Storniert' },
}

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAYS_EN = ['Mo','Tu','We','Th','Fr','Sa','Su']
const DAYS_DE = ['Mo','Di','Mi','Do','Fr','Sa','So']

const UI = {
  en: {
    title: 'Bookings',
    upcoming: 'Upcoming',
    past: 'Past',
    upcomingCount: (u: number, p: number) => `${u} upcoming · ${p} past`,
    newBooking: 'Booking',
    listView: 'List',
    calView: 'Calendar',
    noBookings: 'No Bookings',
    noBookingsDesc: 'Create your first booking right here',
    createBooking: 'Create booking',
    today: 'Today!',
    inDays: (d: number) => `in ${d} ${d === 1 ? 'day' : 'days'}`,
    more: (n: number) => `+${n} more`,
    // Modal
    modalTitle: 'New Booking',
    modalDesc: 'Create a shoot appointment',
    titleLabel: 'Title *',
    titlePlaceholder: 'e.g. Wedding Anna & Max',
    dateLabel: 'Date *',
    statusLabel: 'Status',
    locationLabel: 'Location (optional)',
    locationPlaceholder: 'e.g. Central Park, New York',
    clientLabel: 'Client (optional)',
    noClient: 'No client',
    newClient: 'New client',
    clientPlaceholder: 'Client name...',
    projectLabel: 'Project (optional)',
    noProject: 'No project (create new)',
    newProject: 'New project',
    projectPlaceholder: 'Project name...',
    noProjectsYet: 'No projects yet',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'Special requests, notes...',
    cancel: 'Cancel',
    createBtn: 'Create booking',
    // Status options
    statusDraft: 'Draft',
    statusBooked: 'Booked',
    statusActive: 'Active',
    statusShooting: 'Shooting',
    statusEditing: 'Editing',
    statusDelivered: 'Delivered',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    // Toasts
    toastClientCreated: (name: string) => `Client "${name}" created`,
    toastProjectCreated: (name: string) => `Project "${name}" created`,
    toastBookingSaved: 'Booking saved!',
    toastBookingCreated: 'Booking created!',
    toastTitleRequired: 'Please enter a title',
    toastDateRequired: 'Please select a date',
  },
  de: {
    title: 'Bookings',
    upcoming: 'Bevorstehend',
    past: 'Vergangen',
    upcomingCount: (u: number, p: number) => `${u} bevorstehend · ${p} vergangen`,
    newBooking: 'Booking',
    listView: 'Liste',
    calView: 'Kalender',
    noBookings: 'Keine Bookings',
    noBookingsDesc: 'Erstelle dein erstes Booking direkt hier',
    createBooking: 'Booking erstellen',
    today: 'Heute!',
    inDays: (d: number) => `in ${d} ${d === 1 ? 'Tag' : 'Tagen'}`,
    more: (n: number) => `+${n} mehr`,
    // Modal
    modalTitle: 'Neues Booking',
    modalDesc: 'Shooting-Termin anlegen',
    titleLabel: 'Titel *',
    titlePlaceholder: 'z.B. Hochzeit Anna & Max',
    dateLabel: 'Datum *',
    statusLabel: 'Status',
    locationLabel: 'Location (optional)',
    locationPlaceholder: 'z.B. Schlosspark München',
    clientLabel: 'Kunde (optional)',
    noClient: 'Kein Kunde',
    newClient: 'Neuer Kunde',
    clientPlaceholder: 'Name des Kunden...',
    projectLabel: 'Projekt (optional)',
    noProject: 'Kein Projekt (neu erstellen)',
    newProject: 'Neues Projekt',
    projectPlaceholder: 'Projektname...',
    noProjectsYet: 'Noch keine Projekte',
    notesLabel: 'Notizen (optional)',
    notesPlaceholder: 'Besondere Wünsche, Notizen...',
    cancel: 'Abbrechen',
    createBtn: 'Booking erstellen',
    // Status options
    statusDraft: 'Draft',
    statusBooked: 'Gebucht',
    statusActive: 'Aktiv',
    statusShooting: 'Shooting',
    statusEditing: 'Bearbeitung',
    statusDelivered: 'Geliefert',
    statusCompleted: 'Abgeschlossen',
    statusCancelled: 'Storniert',
    // Toasts
    toastClientCreated: (name: string) => `Kunde "${name}" erstellt`,
    toastProjectCreated: (name: string) => `Projekt "${name}" erstellt`,
    toastBookingSaved: 'Booking gespeichert!',
    toastBookingCreated: 'Booking erstellt!',
    toastTitleRequired: 'Bitte einen Titel eingeben',
    toastDateRequired: 'Bitte ein Datum auswählen',
  },
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export default function BookingsPage() {
  const locale = useLocale()
  const t = UI[locale]
  const STATUS_COLORS = locale === 'en' ? STATUS_COLORS_EN : STATUS_COLORS_DE
  const MONTHS = locale === 'en' ? MONTHS_EN : MONTHS_DE
  const DAYS = locale === 'en' ? DAYS_EN : DAYS_DE

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [photographerId, setPhotographerId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    shoot_date: '',
    location: '',
    client_id: '',
    project_id: '',
    status: 'booked',
    notes: '',
  })

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setPhotographerId(user.id)

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

  const openModal = async () => {
    setForm({ title: '', shoot_date: '', location: '', client_id: '', project_id: '', status: 'booked', notes: '' })
    setShowNewClient(false)
    setNewClientName('')
    setShowNewProject(false)
    setNewProjectTitle('')
    setShowModal(true)

    if (!photographerId) return

    if (clients.length === 0) {
      const { data } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('photographer_id', photographerId)
        .order('full_name')
      setClients((data || []) as Client[])
    }

    if (projects.length === 0) {
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .eq('photographer_id', photographerId)
        .order('created_at', { ascending: false })
        .limit(30)
      setProjects((data || []) as Project[])
    }
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !photographerId) return
    setCreatingClient(true)
    const { data, error } = await supabase
      .from('clients')
      .insert({ photographer_id: photographerId, full_name: newClientName.trim(), status: 'lead' })
      .select('id, full_name')
      .single()
    if (error) { toast.error('Error creating'); setCreatingClient(false); return }
    const newClient = data as Client
    setClients(prev => [...prev, newClient].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setForm(f => ({ ...f, client_id: newClient.id }))
    setShowNewClient(false)
    setNewClientName('')
    setCreatingClient(false)
    toast.success(t.toastClientCreated(newClient.full_name))
  }

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim() || !photographerId) return
    setCreatingProject(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        photographer_id: photographerId,
        title: newProjectTitle.trim(),
        status: 'draft',
        client_token: generateToken(32),
        ...(form.shoot_date ? { shoot_date: form.shoot_date } : {}),
        ...(form.client_id ? { client_id: form.client_id } : {}),
      })
      .select('id, title')
      .single()
    if (error) { toast.error('Error creating'); setCreatingProject(false); return }
    const newProject = data as Project
    setProjects(prev => [newProject, ...prev])
    setForm(f => ({ ...f, project_id: newProject.id, title: f.title || newProject.title }))
    setShowNewProject(false)
    setNewProjectTitle('')
    setCreatingProject(false)
    toast.success(t.toastProjectCreated(newProject.title))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error(t.toastTitleRequired); return }
    if (!form.shoot_date) { toast.error(t.toastDateRequired); return }
    if (!photographerId) return
    setSaving(true)

    let projectId = form.project_id

    if (projectId) {
      await supabase
        .from('projects')
        .update({
          shoot_date: form.shoot_date,
          location: form.location.trim() || null,
          status: form.status,
          notes: form.notes.trim() || null,
          ...(form.client_id ? { client_id: form.client_id } : {}),
        })
        .eq('id', projectId)

      const newBooking: Booking = {
        id: projectId,
        title: projects.find(p => p.id === projectId)?.title || form.title,
        shoot_date: form.shoot_date,
        location: form.location.trim() || null,
        status: form.status,
        client: clients.find(c => c.id === form.client_id) ? { full_name: clients.find(c => c.id === form.client_id)!.full_name } : null,
      }
      setBookings(prev => {
        const filtered = prev.filter(b => b.id !== projectId)
        return [...filtered, newBooking].sort((a, b) => a.shoot_date.localeCompare(b.shoot_date))
      })
      setShowModal(false)
      setSaving(false)
      toast.success(t.toastBookingSaved)
      router.push(`/dashboard/projects/${projectId}`)
      return
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        photographer_id: photographerId,
        title: form.title.trim(),
        shoot_date: form.shoot_date,
        location: form.location.trim() || null,
        client_id: form.client_id || null,
        status: form.status,
        notes: form.notes.trim() || null,
        client_token: generateToken(32),
      })
      .select('id, title, shoot_date, location, status, client:clients(full_name)')
      .single()

    if (error) { console.error('[booking create]', error); toast.error(error.message || 'Error creating'); setSaving(false); return }

    const newBooking: Booking = {
      id: data.id,
      title: data.title,
      shoot_date: data.shoot_date,
      location: data.location,
      status: data.status,
      client: Array.isArray(data.client) ? data.client[0] || null : data.client,
    }
    setBookings(prev => [...prev, newBooking].sort((a, b) => a.shoot_date.localeCompare(b.shoot_date)))
    setShowModal(false)
    setSaving(false)
    toast.success(t.toastBookingCreated)
    router.push(`/dashboard/projects/${data.id}`)
  }

  const today = new Date(); today.setHours(0,0,0,0)
  const upcoming = bookings.filter(b => new Date(b.shoot_date + 'T00:00:00') >= today)
  const past = bookings.filter(b => new Date(b.shoot_date + 'T00:00:00') < today)

  const { year, month } = calMonth
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
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
      <div className="space-y-6 animate-in">
        <div className="h-8 w-36 rounded-lg shimmer" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-black" style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            {t.title}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.upcomingCount(upcoming.length, past.length)}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98]"
            style={{ background: '#3B82F6', boxShadow: '0 1px 8px rgba(59,130,246,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            {t.newBooking}
          </button>

          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: view === 'list' ? 'var(--bg-active)' : 'transparent', color: view === 'list' ? 'var(--text-on-active)' : 'var(--text-muted)' }}
            >
              <List className="w-3.5 h-3.5" />{t.listView}
            </button>
            <button
              onClick={() => setView('calendar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: view === 'calendar' ? 'var(--bg-active)' : 'transparent', color: view === 'calendar' ? 'var(--text-on-active)' : 'var(--text-muted)' }}
            >
              <CalendarDays className="w-3.5 h-3.5" />{t.calView}
            </button>
          </div>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-hover)' }}>
                <CalendarDays className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{t.noBookings}</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t.noBookingsDesc}</p>
              <button onClick={openModal} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#3B82F6' }}>
                <Plus className="w-3.5 h-3.5" />{t.createBooking}
              </button>
            </div>
          ) : (
            <>
              <style>{`
                @keyframes bookingFadeUp {
                  from { opacity: 0; transform: translateY(16px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {upcoming.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-muted)' }}>{t.upcoming}</p>
                  <div className="space-y-2">
                    {upcoming.map((b, i) => {
                      const days = daysUntil(b.shoot_date)
                      const st = STATUS_COLORS[b.status] || STATUS_COLORS.booked
                      const isToday = days === 0
                      return (
                        <Link key={b.id} href={`/dashboard/projects/${b.id}`}
                          className="flex items-center gap-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                          style={{
                            background: `linear-gradient(135deg, ${st.color}14 0%, ${st.color}05 100%)`,
                            border: isToday ? `1px solid ${st.color}50` : `1px solid ${st.color}28`,
                            boxShadow: isToday ? `0 4px 20px ${st.color}20` : `0 2px 12px ${st.color}10`,
                            animation: 'bookingFadeUp 0.4s ease forwards',
                            animationDelay: `${i * 70}ms`,
                            opacity: 0,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 10px 30px ${st.color}25`; e.currentTarget.style.borderColor = st.color + '45' }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = isToday ? `0 4px 20px ${st.color}20` : `0 2px 12px ${st.color}10`; e.currentTarget.style.borderColor = isToday ? st.color + '50' : st.color + '28' }}
                        >
                          <div className="w-1 self-stretch flex-shrink-0" style={{ background: st.color, opacity: 0.7 }} />
                          <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                              style={{ background: st.color + '18', border: `1px solid ${st.color}25` }}>
                              <span className="text-[11px] font-bold uppercase" style={{ color: st.color }}>
                                {new Date(b.shoot_date + 'T00:00:00').toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { month: 'short' })}
                              </span>
                              <span className="text-[22px] font-black leading-none" style={{ color: st.color }}>
                                {new Date(b.shoot_date + 'T00:00:00').getDate()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-bold text-[14.5px] truncate" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: st.color + '18', color: st.color }}>{st.label}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                {b.client && <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}><User className="w-3 h-3" />{b.client.full_name}</span>}
                                {b.location && <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}><MapPin className="w-3 h-3" />{b.location}</span>}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {isToday
                                ? <span className="text-[12px] font-black px-2.5 py-1 rounded-full" style={{ background: st.color + '20', color: st.color }}>{t.today}</span>
                                : <span className="text-[12px] font-medium" style={{ color: st.color + 'CC' }}>{t.inDays(days)}</span>
                              }
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-muted)' }}>{t.past}</p>
                  <div className="space-y-2">
                    {[...past].reverse().map((b, i) => {
                      const st = STATUS_COLORS[b.status] || STATUS_COLORS.booked
                      return (
                        <Link key={b.id} href={`/dashboard/projects/${b.id}`}
                          className="flex items-center gap-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                          style={{ opacity: 0, animation: 'bookingFadeUp 0.4s ease forwards', animationDelay: `${(upcoming.length + i) * 70}ms` }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.55' }}
                        >
                          <div className="w-1 self-stretch flex-shrink-0" style={{ background: st.color, opacity: 0.3 }} />
                          <div className="flex items-center gap-4 p-4 flex-1 min-w-0"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderLeft: 'none', borderRadius: '0 16px 16px 0' }}>
                            <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-hover)' }}>
                              <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                                {new Date(b.shoot_date + 'T00:00:00').toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { month: 'short' })}
                              </span>
                              <span className="text-[22px] font-black leading-none" style={{ color: 'var(--text-secondary)' }}>
                                {new Date(b.shoot_date + 'T00:00:00').getDate()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                {b.client && <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}><User className="w-3 h-3" />{b.client.full_name}</span>}
                                {b.location && <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}><MapPin className="w-3 h-3" />{b.location}</span>}
                              </div>
                            </div>
                            <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                              {new Date(b.shoot_date + 'T00:00:00').toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
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
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]">
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{MONTHS[month]} {year}</h2>
            <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS.map(d => <div key={d} className="text-center text-[11px] font-bold py-2" style={{ color: 'var(--text-muted)' }}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px px-2 pb-3" style={{ background: 'var(--border-color)' }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startDow + 1
              const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate()
              const dateKey = isCurrentMonth ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : ''
              const dayBookings = dateKey ? (bookingsByDate[dateKey] || []) : []
              const todayKey = new Date().toISOString().slice(0, 10)
              const isToday = dateKey === todayKey
              return (
                <div key={i} className="min-h-[80px] p-1.5 flex flex-col" style={{ background: isCurrentMonth ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
                  {isCurrentMonth && (
                    <>
                      <span className="text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1"
                        style={{ background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? '#fff' : 'var(--text-secondary)' }}>
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
                        {dayBookings.length > 2 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.more(dayBookings.length - 2)}</span>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
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

      {/* ── ADD BOOKING MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-glass w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[18px]" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{t.modalTitle}</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.modalDesc}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.titleLabel}</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t.titlePlaceholder} className="input-base w-full" autoFocus required />
              </div>

              {/* Date + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.dateLabel}</label>
                  <input type="date" value={form.shoot_date} onChange={e => setForm(f => ({ ...f, shoot_date: e.target.value }))}
                    className="input-base w-full" required />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.statusLabel}</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-base w-full">
                    <option value="draft">{t.statusDraft}</option>
                    <option value="booked">{t.statusBooked}</option>
                    <option value="active">{t.statusActive}</option>
                    <option value="shooting">{t.statusShooting}</option>
                    <option value="editing">{t.statusEditing}</option>
                    <option value="delivered">{t.statusDelivered}</option>
                    <option value="completed">{t.statusCompleted}</option>
                    <option value="cancelled">{t.statusCancelled}</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.locationLabel}</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={t.locationPlaceholder} className="input-base w-full" />
              </div>

              {/* ── CLIENT ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                    <User className="w-3 h-3 inline mr-1" />{t.clientLabel}
                  </label>
                  {!showNewClient && (
                    <button type="button" onClick={() => { setShowNewClient(true); setNewClientName('') }}
                      className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors"
                      style={{ color: 'var(--accent)', background: 'var(--accent-muted)' }}>
                      <Plus className="w-3 h-3" />{t.newClient}
                    </button>
                  )}
                </div>

                {showNewClient ? (
                  <div className="flex gap-2 items-center p-2.5 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateClient() } if (e.key === 'Escape') { setShowNewClient(false) } }}
                      placeholder={t.clientPlaceholder}
                      className="input-base flex-1 py-1.5 text-[13px]"
                      autoFocus
                    />
                    <button type="button" onClick={handleCreateClient} disabled={!newClientName.trim() || creatingClient}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                      style={{ background: 'var(--cta-bg)', color: '#fff' }}>
                      {creatingClient ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => setShowNewClient(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="input-base w-full">
                    <option value="">{t.noClient}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                )}
              </div>

              {/* ── PROJECT ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                    <FolderOpen className="w-3 h-3 inline mr-1" />{t.projectLabel}
                  </label>
                  {!showNewProject && (
                    <button type="button" onClick={() => { setShowNewProject(true); setNewProjectTitle('') }}
                      className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors"
                      style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.10)' }}>
                      <Plus className="w-3 h-3" />{t.newProject}
                    </button>
                  )}
                </div>

                {showNewProject ? (
                  <div className="flex gap-2 items-center p-2.5 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={e => setNewProjectTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateProject() } if (e.key === 'Escape') { setShowNewProject(false) } }}
                      placeholder={t.projectPlaceholder}
                      className="input-base flex-1 py-1.5 text-[13px]"
                      autoFocus
                    />
                    <button type="button" onClick={handleCreateProject} disabled={!newProjectTitle.trim() || creatingProject}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                      style={{ background: '#3B82F6', color: '#fff' }}>
                      {creatingProject ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => setShowNewProject(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-3 rounded-xl text-[12px] flex items-center justify-between"
                    style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                    <span>{t.noProjectsYet}</span>
                    <button type="button" onClick={() => { setShowNewProject(true); setNewProjectTitle(form.title) }}
                      className="text-[11px] font-bold flex items-center gap-1"
                      style={{ color: '#3B82F6' }}>
                      <Plus className="w-3 h-3" />Create
                    </button>
                  </div>
                ) : (
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="input-base w-full">
                    <option value="">{t.noProject}</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.notesLabel}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t.notesPlaceholder} rows={2} className="input-base w-full resize-none" />
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t.cancel}</button>
                <button type="submit" disabled={saving || !form.title.trim() || !form.shoot_date}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ background: '#3B82F6', boxShadow: '0 1px 8px rgba(59,130,246,0.25)' }}>
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><CalendarDays className="w-4 h-4" />{t.createBtn}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
