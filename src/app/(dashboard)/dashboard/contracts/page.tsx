import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRelative } from '@/lib/utils'
import { FileText } from 'lucide-react'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const projectMap = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p])
  )

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft:  { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
    sent:   { bg: 'rgba(232,162,26,0.10)',  color: '#E8A21A' },
    viewed: { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
    signed: { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
  }

  const statusLabels: Record<string, string> = {
    draft: 'Entwurf', sent: 'Gesendet', viewed: 'Angesehen', signed: 'Unterschrieben',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="font-display text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Verträge</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{contracts?.length ?? 0} Verträge insgesamt</p>
      </div>

      {contracts && contracts.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Vertrag</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Erstellt</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const sc = statusColors[contract.status] || statusColors.draft
                return (
                  <tr key={contract.id} className="transition-colors hover:bg-[var(--bg-hover)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(232,162,26,0.10)' }}>
                          <FileText className="w-4 h-4" style={{ color: '#E8A21A' }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{contract.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {(projectMap[contract.project_id]?.clients as { full_name?: string } | null)?.full_name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: sc.bg, color: sc.color }}>
                        {statusLabels[contract.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelative(contract.created_at, 'de')}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/dashboard/projects/${contract.project_id}`}
                        className="text-xs font-medium transition-colors"
                        style={{ color: 'var(--accent)' }}>
                        Ansehen
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-hover)' }}>
            <FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Verträge</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {projectIds.length > 0
              ? 'Öffne ein Projekt und erstelle dort einen Vertrag.'
              : 'Erstelle zuerst ein Projekt, dann kannst du Verträge hinzufügen.'}
          </p>
          {projectIds.length > 0 ? (
            <Link href="/dashboard/projects" className="text-sm font-medium transition-colors" style={{ color: 'var(--accent)' }}>
              Zu meinen Projekten
            </Link>
          ) : (
            <Link href="/dashboard/projects/new" className="text-sm font-medium transition-colors" style={{ color: 'var(--accent)' }}>
              Neues Projekt erstellen
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
