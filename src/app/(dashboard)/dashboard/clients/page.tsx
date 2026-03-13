import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatRelative } from '@/lib/utils'
import { Users, Plus, Search } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('photographer_id', user!.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    lead: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
    active: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
    delivered: 'bg-[#C8A882]/10 text-[#C8A882]',
    archived: 'bg-[#E8E8E4] text-[#6B6B6B]',
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
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Kunden</h1>
          <p className="text-[#6B6B6B] text-sm mt-0.5">{clients?.length ?? 0} Kunden insgesamt</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Neuer Kunde
        </Link>
      </div>

      {/* Table */}
      {clients && clients.length > 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E4]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide hidden md:table-cell">Shooting-Datum</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide hidden lg:table-cell">Typ</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#6B6B6B] uppercase tracking-wide hidden lg:table-cell">Erstellt</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EC]">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C8A882]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C8A882] text-xs font-semibold">
                          {client.full_name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{client.full_name}</p>
                        {client.email && (
                          <p className="text-xs text-[#6B6B6B]">{client.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-[#6B6B6B]">
                      {client.shoot_date ? formatDate(client.shoot_date, 'de') : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-sm text-[#6B6B6B] capitalize">
                      {client.project_type || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
                      {statusLabels[client.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-[#6B6B6B]">
                      {formatRelative(client.created_at, 'de')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="text-xs text-[#C8A882] hover:text-[#B8987A] font-medium transition-colors"
                    >
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
            <Users className="w-6 h-6 text-[#6B6B6B]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-1">Noch keine Kunden</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">Erstelle deinen ersten Kunden, um loszulegen</p>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ersten Kunden erstellen
          </Link>
        </div>
      )}
    </div>
  )
}
