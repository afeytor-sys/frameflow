import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Mail, User, CalendarDays, MapPin, Heart } from 'lucide-react'
import ProjectTabs from '@/components/dashboard/ProjectTabs'
import QRCodeModal from '@/components/dashboard/QRCodeModal'
import SlugEditor from '@/components/dashboard/SlugEditor'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('id', id)
    .eq('photographer_id', user!.id)
    .single()

  if (!project) notFound()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('plan, full_name, studio_name, portal_message_templates, custom_shooting_types')
    .eq('id', user!.id)
    .single()

  const [
    { data: contracts },
    { data: galleries },
    { data: timeline },
    { data: userTemplates },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('contracts').select('*').eq('project_id', id).order('created_at'),
    supabase.from('galleries').select('*, photos(*)').eq('project_id', id).order('created_at'),
    supabase.from('timelines').select('*').eq('project_id', id).single(),
    supabase.from('contract_templates').select('id, name, description, content').eq('photographer_id', user!.id).order('created_at'),
    supabase.from('invoices').select('id, invoice_number, amount, currency, status, description, due_date, created_at').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  const statusColors: Record<string, { bg: string; text: string }> = {
    inquiry:   { bg: 'rgba(59,130,246,0.15)',  text: '#3B82F6' },
    active:    { bg: 'rgba(61,186,111,0.15)',  text: '#3DBA6F' },
    shooting:  { bg: 'rgba(196,164,124,0.18)', text: '#C4A47C' },
    editing:   { bg: 'rgba(139,92,246,0.15)',  text: '#8B5CF6' },
    delivered: { bg: 'rgba(16,185,129,0.15)',  text: '#10B981' },
    completed: { bg: 'rgba(107,114,128,0.15)', text: '#6B7280' },
    cancelled: { bg: 'rgba(196,59,44,0.15)',   text: '#C43B2C' },
  }

  const statusLabels: Record<string, string> = {
    inquiry: 'Anfrage', active: 'Aktiv', shooting: 'Shooting',
    editing: 'Bearbeitung', delivered: 'Geliefert',
    completed: 'Abgeschlossen', cancelled: 'Storniert',
  }

  const client = project.client as { id: string; full_name: string; email?: string }

  // Build client URL dynamically using current host
  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = forwardedHost || headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const clientUrl = project.client_token
    ? `${protocol}://${host}/client/${project.client_token}`
    : null

  const statusStyle = statusColors[project.status ?? 'inquiry'] ?? statusColors.inquiry
  const statusLabel = statusLabels[project.status ?? 'inquiry'] ?? project.status

  // Shooting type label
  const shootingTypeLabel = (project.custom_type_label as string | null)
    ?? (project.project_type as string | null)
    ?? (project.shooting_type as string | null)
    ?? null

  return (
    <div className="space-y-0 animate-in">

      {/* ── New Header ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl mb-5 overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), rgba(196,164,124,0.4))' }} />

        <div className="px-5 pt-4 pb-5">
          {/* Back + title row */}
          <div className="flex items-start gap-3 mb-4">
            <Link
              href="/dashboard/projects"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-80 flex-shrink-0 mt-0.5"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="font-display text-[22px] font-black leading-tight"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
                >
                  {project.title}
                </h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
                  style={{ background: statusStyle.bg, color: statusStyle.text }}
                >
                  {statusLabel}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{client.full_name}</span>
                </div>
                {project.shoot_date && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(project.shoot_date as string).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {project.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{project.location as string}</span>
                  </div>
                )}
                {shootingTypeLabel && (
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{shootingTypeLabel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {clientUrl && (
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-80"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Client Portal
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)', boxShadow: '0 1px 8px rgba(196,164,124,0.25)' }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Send Email
                </a>
              )}
            </div>
          </div>

          {/* Portal link + QR */}
          {project.client_token ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SlugEditor
                  projectId={project.id}
                  currentSlug={(project as { custom_slug?: string | null }).custom_slug ?? null}
                  clientToken={project.client_token as string}
                  baseUrl={`${protocol}://${host}`}
                />
              </div>
              <div className="flex-shrink-0">
                <QRCodeModal clientUrl={clientUrl!} projectTitle={project.title} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <ProjectTabs
        project={{
          ...project,
          savedShootingTypes: (photographer?.custom_shooting_types as { label: string; color: string }[] | null) ?? [],
        }}
        contracts={contracts || []}
        galleries={galleries || []}
        invoicesInitial={invoices || []}
        plan={photographer?.plan || 'free'}
        userTemplates={userTemplates || []}
        photographerName={photographer?.full_name || photographer?.studio_name || null}
        photographerMessageTemplates={(photographer?.portal_message_templates as { label: string; text: string }[] | null) ?? null}
        clientUrl={clientUrl}
        hasTimeline={(timeline?.events as unknown[])?.length > 0}
      />
    </div>
  )
}
