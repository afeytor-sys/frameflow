import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Pencil } from 'lucide-react'
import ProjectTabs from '@/components/dashboard/ProjectTabs'
import QRCodeModal from '@/components/dashboard/QRCodeModal'
import DeliveryChecklist from '@/components/dashboard/DeliveryChecklist'
import SlugEditor from '@/components/dashboard/SlugEditor'
import PortalPasswordInline from '@/components/dashboard/PortalPasswordInline'
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
    .select('plan, full_name, studio_name')
    .eq('id', user!.id)
    .single()

  const [
    { data: contracts },
    { data: galleries },
    { data: timeline },
    { data: userTemplates },
  ] = await Promise.all([
    supabase.from('contracts').select('*').eq('project_id', id).order('created_at'),
    supabase.from('galleries').select('*, photos(*)').eq('project_id', id).order('created_at'),
    supabase.from('timelines').select('*').eq('project_id', id).single(),
    supabase.from('contract_templates').select('id, name, description, content').eq('photographer_id', user!.id).order('created_at'),
  ])

  const statusColors: Record<string, string> = {
    inquiry:   'bg-[#3B82F6]/10 text-[#3B82F6]',
    active:    'bg-[#3DBA6F]/10 text-[#3DBA6F]',
    shooting:  'bg-[#C4A47C]/10 text-[#C4A47C]',
    editing:   'bg-[#8B5CF6]/10 text-[#8B5CF6]',
    delivered: 'bg-[#10B981]/10 text-[#10B981]',
    completed: 'bg-[#E8E8E4] text-[#6B6B6B]',
    cancelled: 'bg-[#C43B2C]/10 text-[#C43B2C]',
  }

  const statusLabels: Record<string, string> = {
    inquiry: 'Anfrage', active: 'Aktiv', shooting: 'Shooting',
    editing: 'Bearbeitung', delivered: 'Geliefert',
    completed: 'Abgeschlossen', cancelled: 'Storniert',
  }

  const client = project.client as { full_name: string; email?: string }

  // Build client URL dynamically using current host
  const headersList = await headers()
  // In production (Vercel/proxy), use x-forwarded-host; fallback to host
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = forwardedHost || headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const clientUrl = project.client_token
    ? `${protocol}://${host}/client/${project.client_token}`
    : null

  // First gallery for delivery checklist
  const firstGallery = galleries?.[0] ?? null
  const hasPhotos = (firstGallery as { photos?: unknown[] } | null)?.photos
    ? ((firstGallery as { photos: unknown[] }).photos.length > 0)
    : false

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/projects"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors mt-0.5 flex-shrink-0"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{project.title}</h1>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {project.shoot_date && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatDate(project.shoot_date, 'de')}</span>
            )}
          </div>
        </div>

        {/* Client info card — top right */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
            >
              {client.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-[12.5px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {client.full_name}
              </p>
              {client.email && (
                <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                  {client.email}
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/clients/${(project.client as { id: string }).id}`}
            title="Kunde bearbeiten"
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Client portal link + QR */}
      {project.client_token ? (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <SlugEditor
                projectId={project.id}
                currentSlug={(project as { custom_slug?: string | null }).custom_slug ?? null}
                clientToken={project.client_token as string}
                baseUrl={`${protocol}://${host}`}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
              <QRCodeModal clientUrl={clientUrl!} projectTitle={project.title} />
            </div>
          </div>
          <PortalPasswordInline
            projectId={project.id}
            initialPassword={(project as { portal_password?: string | null }).portal_password ?? null}
          />
        </div>
      ) : (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Kunden-Portal Link</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kein Token vorhanden</p>
        </div>
      )}

      {/* Delivery Checklist */}
      <DeliveryChecklist
        hasContract={(contracts?.length ?? 0) > 0}
        contractSent={(contracts ?? []).some(c => c.status !== 'draft')}
        hasPhotos={hasPhotos}
        hasTimeline={(timeline?.events as unknown[])?.length > 0}
        hasShootDate={!!project.shoot_date}
        hasClientEmail={!!(client as { email?: string }).email}
      />

      {/* Tabs */}
      <ProjectTabs
        project={project}
        contracts={contracts || []}
        galleries={galleries || []}
        plan={photographer?.plan || 'free'}
        userTemplates={userTemplates || []}
        photographerName={photographer?.full_name || photographer?.studio_name || null}
      />
    </div>
  )
}
