'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Users, FileText, Euro, CheckCircle2 } from 'lucide-react'

interface Invoice  { amount: number; status: string; created_at: string }
interface Client   { created_at: string; status: string }
interface Project  { created_at: string; status: string; project_type: string | null }
interface Contract { status: string; created_at: string }
interface Gallery  { status: string; created_at: string }

interface Props {
  invoices:  Invoice[]
  clients:   Client[]
  projects:  Project[]
  contracts: Contract[]
  galleries: Gallery[]
}

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

// Build last-N-months labels
function lastNMonths(n: number) {
  const months: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }
  return months
}

const CHART_COLORS = ['#C4A47C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

const PIE_COLORS: Record<string, string> = {
  wedding:    '#EC4899',
  portrait:   '#3B82F6',
  commercial: '#F59E0B',
  event:      '#10B981',
  family:     '#8B5CF6',
  other:      '#94A3B8',
}

const CONTRACT_COLORS: Record<string, string> = {
  draft:  '#6B7280',
  sent:   '#F59E0B',
  viewed: '#C4A47C',
  signed: '#10B981',
}

const CONTRACT_LABELS: Record<string, string> = {
  draft: 'Entwurf', sent: 'Gesendet', viewed: 'Angesehen', signed: 'Unterschrieben',
}

export default function AnalyticsClient({ invoices, clients, projects, contracts, galleries }: Props) {
  const months = lastNMonths(6)

  // ── Revenue per month ──
  const revenueByMonth = months.map(({ key, label }) => {
    const total = invoices
      .filter(i => i.status === 'paid' && i.created_at.startsWith(key))
      .reduce((s, i) => s + i.amount, 0)
    return { label, value: Math.round(total / 100) }
  })

  // ── New clients per month ──
  const clientsByMonth = months.map(({ key, label }) => ({
    label,
    value: clients.filter(c => c.created_at.startsWith(key)).length,
  }))

  // ── Projects by type ──
  const typeCount: Record<string, number> = {}
  projects.forEach(p => {
    const t = p.project_type || 'other'
    typeCount[t] = (typeCount[t] || 0) + 1
  })
  const projectTypeData = Object.entries(typeCount).map(([name, value]) => ({ name, value }))

  // ── Contract status ──
  const contractStatusCount: Record<string, number> = {}
  contracts.forEach(c => {
    contractStatusCount[c.status] = (contractStatusCount[c.status] || 0) + 1
  })
  const contractStatusData = Object.entries(contractStatusCount).map(([name, value]) => ({ name, value }))

  // ── KPIs ──
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pendingRevenue = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0)
  const signedContracts = contracts.filter(c => c.status === 'signed').length
  const conversionRate = contracts.length > 0 ? Math.round((signedContracts / contracts.length) * 100) : 0
  const activeGalleries = galleries.filter(g => g.status === 'active').length
  const avgRevenue = projects.length > 0 ? Math.round(totalRevenue / projects.length / 100) : 0

  const kpis = [
    { label: 'Gesamtumsatz', value: formatEur(totalRevenue), icon: Euro,         color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Ausstehend',   value: formatEur(pendingRevenue), icon: TrendingUp,  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Kunden',       value: clients.length,            icon: Users,       color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Projekte',     value: projects.length,           icon: FileText,    color: '#C4A47C', bg: 'rgba(196,164,124,0.08)' },
    { label: 'Konversion',   value: `${conversionRate}%`,      icon: CheckCircle2,color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    { label: 'Ø pro Projekt',value: formatEur(avgRevenue * 100), icon: Euro,      color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  ]

  const tooltipStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="font-black"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
        >
          Analytics
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Überblick über dein Studio-Wachstum
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-black text-[18px] leading-none" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Revenue bar chart */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>Umsatz (€)</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>Bezahlte Rechnungen — letzte 6 Monate</p>
          {revenueByMonth.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Noch keine bezahlten Rechnungen
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByMonth} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`€${v}`, 'Umsatz']}
                  cursor={{ fill: 'rgba(196,164,124,0.06)', radius: 8 }}
                />
                <Bar dataKey="value" fill="#C4A47C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Clients bar chart */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>Neue Kunden</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>Letzte 6 Monate</p>
          {clientsByMonth.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Noch keine Kunden
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientsByMonth} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [v, 'Kunden']}
                  cursor={{ fill: 'rgba(59,130,246,0.06)', radius: 8 }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Project types pie */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>Projekte nach Typ</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>Verteilung der Shooting-Arten</p>
          {projectTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Noch keine Projekte
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={projectTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {projectTypeData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [v, name]}
                />
                <Legend
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'capitalize' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Contract status pie */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>Vertrags-Status</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>Übersicht aller Verträge</p>
          {contractStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Noch keine Verträge
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={contractStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {contractStatusData.map((entry) => (
                    <Cell key={entry.name} fill={CONTRACT_COLORS[entry.name] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [v, CONTRACT_LABELS[String(name)] || String(name)]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {CONTRACT_LABELS[value] || value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div
        className="rounded-2xl p-6 grid sm:grid-cols-3 gap-6"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>Verträge</p>
          <div className="space-y-1.5">
            {Object.entries(CONTRACT_LABELS).map(([key, label]) => {
              const count = contracts.filter(c => c.status === key).length
              const pct = contracts.length > 0 ? Math.round((count / contracts.length) * 100) : 0
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CONTRACT_COLORS[key] }} />
                  <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>Rechnungen</p>
          <div className="space-y-1.5">
            {[
              { key: 'paid',    label: 'Bezahlt',    color: '#10B981' },
              { key: 'sent',    label: 'Gesendet',   color: '#F59E0B' },
              { key: 'overdue', label: 'Überfällig', color: '#EF4444' },
              { key: 'draft',   label: 'Entwurf',    color: '#6B7280' },
            ].map(({ key, label, color }) => {
              const count = invoices.filter(i => i.status === key).length
              const amount = invoices.filter(i => i.status === key).reduce((s, i) => s + i.amount, 0)
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatEur(amount)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>Galerien & Projekte</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>Aktive Galerien</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{activeGalleries}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C4A47C' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>Projekte gesamt</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{projects.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#8B5CF6' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>Konversionsrate</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{conversionRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EC4899' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>Ø Umsatz/Projekt</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{formatEur(avgRevenue * 100)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
