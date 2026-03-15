import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Mail, Phone, MapPin, Calendar } from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('photographer_id', user!.id)
    .single()

  if (!client) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, { bg: string; color: string }> = {
    lead:      { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
    active:    { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
    delivered: { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
    archived:  { bg: 'rgba(107,114,128,0.08)', color: '#6B7280' },
  }

  const statusLabels: Record<string, string> = {
    lead: 'Interessent', active: 'Aktiv', delivered: 'Geliefert', archived: 'Archiviert',
  }

  const sc = statusColors[client.status] || statusColors.lead

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{client.full_name}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: sc.bg, color: sc.color }}>
              {statusLabels[client.status]}
            </span>
          </div>
          {client.project_type && <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>{client.project_type}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client info */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Kontakt</h2>
          <div className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <a href={`mailto:${client.email}`} className="text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}>{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <a href={`tel:${client.phone}`} className="text-sm" style={{ color: 'var(--text-primary)' }}>{client.phone}</a>
              </div>
            )}
            {client.shoot_date && (
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(client.shoot_date, 'de')}</span>
              </div>
            )}
            {client.location && (
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{client.location}</span>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Notizen</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{client.notes}</p>
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Projekte</h2>
            <Link href={`/dashboard/projects/new?client=${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'var(--text-primary)' }}>
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>

          {projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`}
                  className="block rounded-xl p-4 transition-all"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                  onMouseEnter={undefined}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{project.title}</p>
                      {project.shoot_date && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(project.shoot_date, 'de')}</p>}
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{project.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl flex flex-col items-center justify-center py-12 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Noch keine Projekte</p>
              <Link href={`/dashboard/projects/new?client=${id}`}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--accent)' }}>
                Erstes Projekt erstellen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
