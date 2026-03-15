'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, Plus, Mail, Phone, MapPin, Calendar,
  Pencil, Check, X, User, FileText, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ClientData {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  location: string | null
  notes: string | null
  status: string
  project_type: string | null
  shoot_date: string | null
  photographer_id?: string
}

interface Project {
  id: string
  title: string
  shoot_date: string | null
  status: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  lead:      { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
  active:    { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
  delivered: { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
  archived:  { bg: 'rgba(107,114,128,0.08)', color: '#6B7280' },
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Interessent', active: 'Aktiv', delivered: 'Geliefert', archived: 'Archiviert',
}

const PROJECT_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  inquiry:   { bg: 'rgba(59,130,246,0.10)',  color: '#3B82F6' },
  active:    { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
  shooting:  { bg: 'rgba(196,164,124,0.10)', color: '#C4A47C' },
  editing:   { bg: 'rgba(139,92,246,0.10)',  color: '#8B5CF6' },
  delivered: { bg: 'rgba(16,185,129,0.10)',  color: '#10B981' },
  completed: { bg: 'rgba(232,232,228,0.50)', color: '#6B7280' },
  cancelled: { bg: 'rgba(196,59,44,0.10)',   color: '#C43B2C' },
  booked:    { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState<ClientData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    location: '',
    notes: '',
  })

  useEffect(() => { load() }, [id])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: c } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('photographer_id', user.id)
      .single()

    if (!c) { router.push('/dashboard/clients'); return }
    setClient(c as ClientData)

    const { data: p } = await supabase
      .from('projects')
      .select('id, title, shoot_date, status')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
    setProjects((p || []) as Project[])
    setLoading(false)
  }

  const openEdit = () => {
    if (!client) return
    setForm({
      full_name: client.full_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: (client as ClientData & { address?: string }).address || '',
      location: client.location || '',
      notes: client.notes || '',
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!form.full_name.trim()) { toast.error('Name ist erforderlich'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Nicht angemeldet'); setSaving(false); return }
    const { error } = await supabase
      .from('clients')
      .update({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', id)
      .eq('photographer_id', user.id)

    if (error) {
      toast.error('Fehler beim Speichern')
      setSaving(false)
      return
    }

    setClient(prev => prev ? {
      ...prev,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      photographer_id: prev.photographer_id,
    } : prev)

    setSaving(false)
    setEditing(false)
    toast.success('Kundendaten gespeichert!')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in max-w-5xl">
        <div className="h-8 w-48 rounded-lg shimmer" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl shimmer" />
          <div className="lg:col-span-2 h-64 rounded-2xl shimmer" />
        </div>
      </div>
    )
  }

  if (!client) return null

  const sc = STATUS_COLORS[client.status] || STATUS_COLORS.lead

  return (
    <div className="space-y-6 animate-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clients"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="font-black"
              style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
            >
              {client.full_name}
            </h1>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: sc.bg, color: sc.color }}
            >
              {STATUS_LABELS[client.status]}
            </span>
          </div>
          {client.project_type && (
            <p className="text-[12px] capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>{client.project_type}</p>
          )}
        </div>
        <button
          onClick={openEdit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-80 flex-shrink-0"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Bearbeiten
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Contact card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div className="h-[3px] w-full" style={{ background: 'var(--accent)' }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <h2 className="font-black text-[14px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Kontakt
                </h2>
              </div>
              <button
                onClick={openEdit}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            {editing ? (
              /* ── Edit form ── */
              <div className="space-y-3">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>Name *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="input-base w-full text-[13px]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>E-Mail</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="input-base w-full text-[13px]"
                      style={{ paddingLeft: '2rem' }}
                      placeholder="email@beispiel.de"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="input-base w-full text-[13px]"
                      style={{ paddingLeft: '2rem' }}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-3 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <textarea
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="input-base w-full text-[13px] resize-none"
                      style={{ paddingLeft: '2rem' }}
                      rows={2}
                      placeholder="Straße, PLZ Stadt"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>Ort / Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      className="input-base w-full text-[13px]"
                      style={{ paddingLeft: '2rem' }}
                      placeholder="z.B. Berlin"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>Notizen</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="input-base w-full text-[13px] resize-none"
                    rows={3}
                    placeholder="Interne Notizen..."
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold transition-all"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Abbrechen
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving || !form.full_name.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-40 transition-all"
                    style={{ background: 'var(--accent)' }}
                  >
                    {saving
                      ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Check className="w-3.5 h-3.5" />Speichern</>
                    }
                  </button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div className="space-y-2.5">
                {/* Email */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
                    <Mail className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>E-Mail</p>
                    {client.email
                      ? <a href={`mailto:${client.email}`} className="text-[12.5px] font-medium truncate block hover:underline" style={{ color: 'var(--text-primary)' }}>{client.email}</a>
                      : <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>—</p>
                    }
                  </div>
                </div>

                {/* Phone */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
                    <Phone className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>Telefon</p>
                    {client.phone
                      ? <a href={`tel:${client.phone}`} className="text-[12.5px] font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>{client.phone}</a>
                      : <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>—</p>
                    }
                  </div>
                </div>

                {/* Address */}
                <div
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--accent-muted)' }}>
                    <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>Adresse</p>
                    {(client as ClientData & { address?: string }).address
                      ? <p className="text-[12.5px] font-medium whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{(client as ClientData & { address?: string }).address}</p>
                      : <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>—</p>
                    }
                  </div>
                </div>

                {/* Location */}
                {client.location && (
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
                      <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>Ort</p>
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{client.location}</p>
                    </div>
                  </div>
                )}

                {/* Shoot date */}
                {client.shoot_date && (
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
                      <Calendar className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>Datum</p>
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(client.shoot_date, 'de')}</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {client.notes && (
                  <div
                    className="px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>Notizen</p>
                    </div>
                    <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{client.notes}</p>
                  </div>
                )}

                {/* Empty state hint */}
                {!client.email && !client.phone && !(client as ClientData & { address?: string }).address && !client.notes && (
                  <button
                    onClick={openEdit}
                    className="w-full text-center py-4 rounded-xl text-[12px] transition-all hover:opacity-70"
                    style={{ border: '2px dashed var(--border-color)', color: 'var(--text-muted)' }}
                  >
                    + Kontaktdaten hinzufügen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Projects ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Projekte
            </h2>
            <Link
              href={`/dashboard/projects/new?client=${id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--text-primary)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-2.5">
              {projects.map((project) => {
                const psc = PROJECT_STATUS_COLORS[project.status] || PROJECT_STATUS_COLORS.active
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:opacity-90"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{project.title}</p>
                      {project.shoot_date && (
                        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(project.shoot_date, 'de')}
                        </p>
                      )}
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10.5px] font-bold flex-shrink-0"
                      style={{ background: psc.bg, color: psc.color }}
                    >
                      {project.status}
                    </span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-14 text-center"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-hover)' }}>
                <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Projekte</p>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>Erstelle das erste Projekt für diesen Kunden</p>
              <Link
                href={`/dashboard/projects/new?client=${id}`}
                className="text-[12px] font-bold transition-colors hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                + Erstes Projekt erstellen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
