import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import ProjectTabs from '@/components/dashboard/ProjectTabs'
import QRCodeModal from '@/components/dashboard/QRCodeModal'
import DeliveryChecklist from '@/components/dashboard/DeliveryChecklist'

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
    .select('plan')
    .eq('id', user!.id)
    .single()

  const [
    { data: contracts },
    { data: gallery },
    { data: timeline },
  ] = await Promise.all([
    supabase.from('contracts').select('*').eq('project_id', id).order('created_at'),
    supabase.from('galleries').select('*, photos(*)').eq('project_id', id).single(),
    supabase.from('timelines').select('*').eq('project_id', id).single(),
  ])

  const statusColors: Record<string, string> = {
    draft: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
    active: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
    delivered: 'bg-[#C8A882]/10 text-[#C8A882]',
    completed: 'bg-[#E8E8E4] text-[#6B6B6B]',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Entwurf', active: 'Aktiv', delivered: 'Geliefert', completed: 'Abgeschlossen',
  }

  const client = project.client as { full_name: string; email?: string }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/projects" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E8E4] text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">{project.title}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
              {statusLabels[project.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Link href={`/dashboard/clients/${(project.client as { id: string }).id}`} className="text-sm text-[#6B6B6B] hover:text-[#C8A882] transition-colors">
              {client.full_name}
            </Link>
            {project.shoot_date && (
              <span className="text-sm text-[#6B6B6B]">· {formatDate(project.shoot_date, 'de')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Client portal link + QR */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#6B6B6B] mb-1">Kunden-Portal Link</p>
            <p className="text-sm font-mono text-[#1A1A1A] truncate">{project.client_url}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <QRCodeModal clientUrl={project.client_url} projectTitle={project.title} />
            <a
              href={project.client_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E8E4] text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F0F0EC] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Delivery Checklist */}
      <DeliveryChecklist
        hasContract={(contracts?.length ?? 0) > 0}
        contractSent={(contracts ?? []).some(c => c.status !== 'draft')}
        hasPhotos={(gallery as { photos?: unknown[] } | null)?.photos ? ((gallery as { photos: unknown[] }).photos.length > 0) : false}
        hasTimeline={(timeline?.events as unknown[])?.length > 0}
        hasShootDate={!!project.shoot_date}
        hasClientEmail={!!(client as { email?: string }).email}
      />

      {/* Tabs */}
      <ProjectTabs
        project={project}
        contracts={contracts || []}
        gallery={gallery}
        timeline={timeline}
        plan={photographer?.plan || 'free'}
      />
    </div>
  )
}
