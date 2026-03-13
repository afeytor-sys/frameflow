import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Images } from 'lucide-react'

export default async function GalleriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all projects for this photographer
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, clients(full_name)')
    .eq('photographer_id', user!.id)

  const projectIds = projects?.map((p) => p.id) ?? []

  const { data: galleries } = projectIds.length > 0
    ? await supabase
        .from('galleries')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Lookup map
  const projectMap = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p])
  )

  const statusColors: Record<string, string> = {
    draft: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
    active: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
    expired: 'bg-[#E84C1A]/10 text-[#E84C1A]',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Entwurf', active: 'Aktiv', expired: 'Abgelaufen',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Galerien</h1>
        <p className="text-[#6B6B6B] text-sm mt-0.5">{galleries?.length ?? 0} Galerien insgesamt</p>
      </div>

      {galleries && galleries.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((gallery) => {
            const project = projectMap[gallery.project_id]
            const clientName = (project?.clients as { full_name?: string } | null)?.full_name
            return (
              <Link
                key={gallery.id}
                href={`/dashboard/projects/${gallery.project_id}`}
                className="bg-white rounded-xl border border-[#E8E8E4] p-5 hover:border-[#C8A882]/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C8A882]/10 flex items-center justify-center">
                    <Images className="w-4 h-4 text-[#C8A882]" />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[gallery.status]}`}>
                    {statusLabels[gallery.status]}
                  </span>
                </div>
                <h3 className="font-medium text-[#1A1A1A] text-sm mb-1">{gallery.title}</h3>
                <p className="text-xs text-[#6B6B6B]">{clientName || project?.title || '—'}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">{gallery.view_count} Aufrufe</p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E8E4] flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F0F0EC] flex items-center justify-center mb-4">
            <Images className="w-6 h-6 text-[#6B6B6B]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-1">Noch keine Galerien</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">
            {projectIds.length > 0
              ? 'Öffne ein Projekt und lade Fotos in der Galerie-Tab hoch.'
              : 'Erstelle zuerst ein Projekt, dann kannst du Fotos hochladen.'}
          </p>
          {projectIds.length > 0 ? (
            <Link href="/dashboard/projects" className="text-sm text-[#C8A882] hover:text-[#B8987A] font-medium">
              Zu meinen Projekten
            </Link>
          ) : (
            <Link href="/dashboard/projects/new" className="text-sm text-[#C8A882] hover:text-[#B8987A] font-medium">
              Neues Projekt erstellen
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
