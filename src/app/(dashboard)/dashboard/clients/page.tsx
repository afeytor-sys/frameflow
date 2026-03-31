import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatRelative } from '@/lib/utils'
import { Users, Plus, ArrowUpRight } from 'lucide-react'
import { getServerLocale, dashboardT } from '@/lib/dashboardTranslations'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, projects(shoot_date, project_type, shooting_type, custom_type_label, status, created_at)')
    .eq('photographer_id', user!.id)
    .order('created_at', { ascending: false })

  const locale = await getServerLocale()
  const de = locale === 'de'

  const statusColors: Record<string, { bg: string; color: string; dot: string }> = {
    lead:      { bg: 'rgba(59,130,246,0.10)',  color: '#3B82F6', dot: '#3B82F6' },
    active:    { bg: 'rgba(16,185,129,0.10)',  color: '#10B981', dot: '#10B981' },
    delivered: { bg: 'rgba(196,164,124,0.10)', color: '#C4A47C', dot: '#C4A47C' },
    archived:  { bg: 'rgba(100,116,139,0.08)', color: '#94A3B8', dot: '#94A3B8' },
  }

  const statusLabels: Record<string, string> = de ? {
    lead: 'Interessent',
    active: 'Aktiv',
    delivered: 'Geliefert',
    archived: 'Archiviert',
  } : {
    lead: 'Lead',
    active: 'Active',
    delivered: 'Delivered',
    archived: 'Archived',
  }

  const avatarColors = [
    { bg: 'rgba(59,130,246,0.15)',  color: '#3B82F6' },
    { bg: 'rgba(16,185,129,0.15)',  color: '#10B981' },
    { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B' },
    { bg: 'rgba(139,92,246,0.15)',  color: '#8B5CF6' },
    { bg: 'rgba(236,72,153,0.15)',  color: '#EC4899' },
    { bg: 'rgba(196,164,124,0.15)', color: '#C4A47C' },
  ]

  return (
    <div className="space-y-8 animate-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            {de ? 'Kunden' : 'Clients'}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {clients?.length ?? 0} {de
              ? ((clients?.length ?? 0) === 1 ? 'Kunde' : 'Kunden')
              : ((clients?.length ?? 0) === 1 ? 'Client' : 'Clients')
            } · {de ? 'Deine Kundenkontakte' : 'Manage your client contacts'}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{
            background: '#3B82F6',
            boxShadow: '0 1px 8px rgba(59,130,246,0.30)',
          }}
        >
          <Plus className="w-4 h-4" />
          {de ? 'Neuer Kunde' : 'New client'}
        </Link>
      </div>

      {/* ── Table ── */}
      {clients && clients.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{de ? 'Kunde' : 'Client'}</th>
                <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>{de ? 'Shooting-Datum' : 'Shoot Date'}</th>
                <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>{de ? 'Typ' : 'Type'}</th>
                <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>{de ? 'Erstellt' : 'Created'}</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, idx) => {
                const sc = statusColors[client.status] || statusColors.lead
                const av = avatarColors[idx % avatarColors.length]
                // Get the most recent project (sorted by shoot_date desc, fallback to created_at)
                const projects = (client.projects as { shoot_date: string | null; project_type: string | null; shooting_type: string | null; custom_type_label: string | null; status: string; created_at: string }[] | null) ?? []
                const latestProject = projects.sort((a, b) => {
                  const da = a.shoot_date ?? a.created_at
                  const db = b.shoot_date ?? b.created_at
                  return da > db ? -1 : 1
                })[0] ?? null
                const shootDate = latestProject?.shoot_date ?? null
                const shootingType = latestProject?.custom_type_label ?? latestProject?.project_type ?? latestProject?.shooting_type ?? null
                return (
                  <tr
                    key={client.id}
                    className="group transition-all duration-150 hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <td className="px-6 py-5">
                      <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3.5 group/name">
                        {/* Larger avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[14px] font-black transition-transform duration-150 group-hover:scale-105"
                          style={{ background: av.bg, color: av.color }}
                        >
                          {client.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13.5px] font-semibold group-hover/name:underline" style={{ color: 'var(--text-primary)' }}>{client.full_name}</p>
                          {client.email && (
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{client.email}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {shootDate ? formatDate(shootDate, 'de') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <span className="text-[13px] capitalize" style={{ color: 'var(--text-muted)' }}>
                        {shootingType || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
                        {statusLabels[client.status] || client.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {formatRelative(client.created_at, 'de')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="inline-flex items-center gap-1 text-[12.5px] font-semibold transition-all opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg"
                        style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.08)' }}
                      >
                        {de ? 'Ansehen' : 'View'}
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(59,130,246,0.08)' }}
          >
            <Users className="w-7 h-7" style={{ color: '#3B82F6' }} />
          </div>
          <h3
            className="font-black mb-2"
            style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            {de ? 'Noch keine Kunden' : 'No clients yet'}
          </h3>
          <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            {de ? 'Füge deinen ersten Kunden hinzu und verwalte dein Studio' : 'Add your first client and start managing your studio'}
          </p>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
            style={{ background: '#3B82F6', boxShadow: '0 1px 8px rgba(59,130,246,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            {de ? 'Ersten Kunden erstellen' : 'Create first client'}
          </Link>
        </div>
      )}
    </div>
  )
}
