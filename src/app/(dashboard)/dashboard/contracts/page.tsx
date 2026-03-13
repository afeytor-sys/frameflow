import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRelative } from '@/lib/utils'
import { FileText } from 'lucide-react'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // First get all project IDs belonging to this photographer
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, client_id, clients(full_name)')
    .eq('photographer_id', user!.id)

  const projectIds = projects?.map((p) => p.id) ?? []

  const { data: contracts } = projectIds.length > 0
    ? await supabase
        .from('contracts')
        .select('*, project_id')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Build a lookup map for project info
  const projectMap = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p])
  )

  const statusColors: Record<string, string> = {
    draft: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
    sent: 'bg-[#E8A21A]/10 text-[#E8A21A]',
    viewed: 'bg-[#C8A882]/10 text-[#C8A882]',
    signed: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Entwurf', sent: 'Gesendet', viewed: 'Angesehen', signed: 'Unterschrieben',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Verträge</h1>
        <p className="text-[#6B6B6B] text-sm mt-0.5">{contracts?.length ?? 0} Verträge insgesamt</p>
      </div>

      {contracts && contracts.length > 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E4]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">Vertrag</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide hidden md:table-cell">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide hidden lg:table-cell">Erstellt</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EC]">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E8A21A]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#E8A21A]" />
                      </div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{contract.title}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-[#6B6B6B]">
                      {(projectMap[contract.project_id]?.clients as { full_name?: string } | null)?.full_name || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[contract.status]}`}>
                      {statusLabels[contract.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-[#6B6B6B]">{formatRelative(contract.created_at, 'de')}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/dashboard/projects/${contract.project_id}`} className="text-xs text-[#C8A882] hover:text-[#B8987A] font-medium transition-colors">
                      Ansehen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E8E4] flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F0F0EC] flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-[#6B6B6B]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-1">Noch keine Verträge</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">
            {projectIds.length > 0
              ? 'Öffne ein Projekt und erstelle dort einen Vertrag.'
              : 'Erstelle zuerst ein Projekt, dann kannst du Verträge hinzufügen.'}
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
