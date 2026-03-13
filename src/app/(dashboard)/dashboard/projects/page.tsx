import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { FolderOpen, Plus } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email)')
    .eq('photographer_id', user!.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    draft: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
    active: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
    delivered: 'bg-[#C8A882]/10 text-[#C8A882]',
    completed: 'bg-[#E8E8E4] text-[#6B6B6B]',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Entwurf', active: 'Aktiv', delivered: 'Geliefert', completed: 'Abgeschlossen',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Projekte</h1>
          <p className="text-[#6B6B6B] text-sm mt-0.5">{projects?.length ?? 0} Projekte insgesamt</p>
        </div>
        <Link href="/dashboard/projects/new" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Neues Projekt
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="bg-white rounded-xl border border-[#E8E8E4] p-5 hover:border-[#C8A882]/30 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#C8A882]/10 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-[#C8A882]" />
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>
              <h3 className="font-medium text-[#1A1A1A] text-sm mb-1">{project.title}</h3>
              <p className="text-xs text-[#6B6B6B]">
                {(project.client as { full_name?: string })?.full_name || '—'}
              </p>
              {project.shoot_date && (
                <p className="text-xs text-[#6B6B6B] mt-1">{formatDate(project.shoot_date, 'de')}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E8E4] flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F0F0EC] flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-[#6B6B6B]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-1">Noch keine Projekte</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">Erstelle dein erstes Projekt</p>
          <Link href="/dashboard/projects/new" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Erstes Projekt erstellen
          </Link>
        </div>
      )}
    </div>
  )
}
