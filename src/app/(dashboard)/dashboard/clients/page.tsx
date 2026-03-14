import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatRelative } from '@/lib/utils'
import { Users, Plus } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('photographer_id', user!.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, { bg: string; color: string }> = {
    lead:      { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
    active:    { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
    delivered: { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
    archived:  { bg: 'rgba(107,114,128,0.08)', color: '#6B7280' },
  }

  const statusLabels: Record<string, string> = {
    lead: 'Interessent',
    active: 'Aktiv',
    delivered: 'Geliefert',
    archived: 'Archiviert',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Kunden</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{clients?.length ?? 0} Kunden insgesamt</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--text-primary)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Neuer Kunde
        </Link>
      </div>

      {/* Table */}
      {clients && clients.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Shooting-Datum</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Typ</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Erstellt</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const sc = statusColors[client.status] || statusColors.lead
                return (
                  <tr key={client.id} className="transition-colors hover:bg-[var(--bg-hover)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--accent-muted)' }}>
                          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            {client.full_name[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{client.full_name}</p>
                          {client.email && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {client.shoot_date ? formatDate(client.shoot_date, 'de') : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>
                        {client.project_type || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: sc.bg, color: sc.color }}>
                        {statusLabels[client.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatRelative(client.created_at, 'de')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="text-xs font-medium transition-colors"
                        style={{ color: 'var(--accent)' }}
                      >
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
            <Users className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Kunden</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Erstelle deinen ersten Kunden, um loszulegen</p>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--text-primary)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ersten Kunden erstellen
          </Link>
        </div>
      )}
    </div>
  )
}
