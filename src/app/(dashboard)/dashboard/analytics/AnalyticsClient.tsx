'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Users, FileText, Euro, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'

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

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'Analytics',
    subtitle: 'Overview of your studio growth',
    totalRevenue: 'Total Revenue',
    outstanding: 'Outstanding',
    clients: 'Clients',
    projects: 'Projects',
    conversion: 'Conversion',
    avgPerProject: 'Avg per Project',
    paidInvoices: 'Paid invoices',
    openInvoices: 'Open invoices',
    allPaid: 'All paid ✓',
    noRevenueYet: 'No revenue yet',
    noClientsYet: 'No clients yet',
    noProjectsYet: 'No projects yet',
    noContracts: 'No contracts',
    noDataYet: 'No data yet',
    total: 'total',
    contracts: 'contracts',
    averageRevenue: 'Average revenue',
    revenueChart: 'Revenue (€)',
    revenueChartSub: 'Paid invoices — last 6 months',
    noPaidInvoices: 'No paid invoices yet',
    newClients: 'New Clients',
    last6Months: 'Last 6 months',
    projectsByType: 'Projects by Type',
    distributionShooting: 'Distribution of shooting types',
    contractStatus: 'Contract Status',
    overviewContracts: 'Overview of all contracts',
    noContractsYet: 'No contracts yet',
    sectionContracts: 'Contracts',
    sectionInvoices: 'Invoices',
    sectionGalleries: 'Galleries & Projects',
    activeGalleries: 'Active Galleries',
    totalProjects: 'Total Projects',
    conversionRate: 'Conversion Rate',
    avgRevenueProject: 'Avg Revenue/Project',
    paid: 'Paid',
    sent: 'Sent',
    overdue: 'Overdue',
    draft: 'Draft',
    viewed: 'Viewed',
    signed: 'Signed',
    revenue: 'Revenue',
  },
  de: {
    title: 'Analytik',
    subtitle: 'Übersicht deines Studio-Wachstums',
    totalRevenue: 'Gesamtumsatz',
    outstanding: 'Ausstehend',
    clients: 'Kunden',
    projects: 'Projekte',
    conversion: 'Conversion',
    avgPerProject: 'Ø pro Projekt',
    paidInvoices: 'Bezahlte Rechnungen',
    openInvoices: 'Offene Rechnungen',
    allPaid: 'Alles bezahlt ✓',
    noRevenueYet: 'Noch kein Umsatz',
    noClientsYet: 'Noch keine Kunden',
    noProjectsYet: 'Noch keine Projekte',
    noContracts: 'Keine Verträge',
    noDataYet: 'Noch keine Daten',
    total: 'gesamt',
    contracts: 'Verträge',
    averageRevenue: 'Durchschnittlicher Umsatz',
    revenueChart: 'Umsatz (€)',
    revenueChartSub: 'Bezahlte Rechnungen — letzte 6 Monate',
    noPaidInvoices: 'Noch keine bezahlten Rechnungen',
    newClients: 'Neue Kunden',
    last6Months: 'Letzte 6 Monate',
    projectsByType: 'Projekte nach Typ',
    distributionShooting: 'Verteilung der Shooting-Typen',
    contractStatus: 'Vertragsstatus',
    overviewContracts: 'Übersicht aller Verträge',
    noContractsYet: 'Noch keine Verträge',
    sectionContracts: 'Verträge',
    sectionInvoices: 'Rechnungen',
    sectionGalleries: 'Galerien & Projekte',
    activeGalleries: 'Aktive Galerien',
    totalProjects: 'Projekte gesamt',
    conversionRate: 'Conversion-Rate',
    avgRevenueProject: 'Ø Umsatz/Projekt',
    paid: 'Bezahlt',
    sent: 'Gesendet',
    overdue: 'Überfällig',
    draft: 'Entwurf',
    viewed: 'Angesehen',
    signed: 'Unterzeichnet',
    revenue: 'Umsatz',
  },
}

function formatEur(cents: number, locale: 'en' | 'de') {
  if (locale === 'de') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', currencyDisplay: 'symbol' }).format(cents / 100)
}

// Build last-N-months labels — respects locale
function lastNMonths(n: number, locale: 'en' | 'de') {
  const months: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'short', year: '2-digit' })
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

export default function AnalyticsClient({ invoices, clients, projects, contracts, galleries }: Props) {
  const locale = useLocale()
  const t = T[locale]
  const months = lastNMonths(6, locale)

  const CONTRACT_LABELS: Record<string, string> = {
    draft:  t.draft,
    sent:   t.sent,
    viewed: t.viewed,
    signed: t.signed,
  }

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
    const tp = p.project_type || 'other'
    typeCount[tp] = (typeCount[tp] || 0) + 1
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
    {
      label: t.totalRevenue,
      display: formatEur(totalRevenue, locale),
      description: totalRevenue > 0 ? t.paidInvoices : t.noRevenueYet,
      icon: Euro, color: '#10B981',
    },
    {
      label: t.outstanding,
      display: formatEur(pendingRevenue, locale),
      description: pendingRevenue > 0 ? t.openInvoices : t.allPaid,
      icon: TrendingUp, color: '#F59E0B',
    },
    {
      label: t.clients,
      display: String(clients.length),
      description: clients.length === 0 ? t.noClientsYet : `${clients.length} ${t.total}`,
      icon: Users, color: '#3B82F6',
    },
    {
      label: t.projects,
      display: String(projects.length),
      description: projects.length === 0 ? t.noProjectsYet : `${projects.length} ${t.total}`,
      icon: FileText, color: '#C4A47C',
    },
    {
      label: t.conversion,
      display: `${conversionRate}%`,
      description: contracts.length > 0 ? `${signedContracts} ${locale === 'de' ? 'von' : 'of'} ${contracts.length} ${t.contracts}` : t.noContracts,
      icon: CheckCircle2, color: '#8B5CF6',
    },
    {
      label: t.avgPerProject,
      display: formatEur(avgRevenue * 100, locale),
      description: projects.length > 0 ? t.averageRevenue : t.noDataYet,
      icon: Euro, color: '#EC4899',
    },
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
          {t.title}
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.subtitle}
        </p>
      </div>

      {/* KPI Cards */}
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map(({ label, display, description, icon: Icon, color }, i) => (
          <div
            key={label}
            className="relative group rounded-2xl overflow-hidden cursor-default transition-all duration-300"
            style={{
              background: 'var(--card-bg)',
              border: `1px solid ${color}20`,
              boxShadow: `0 2px 12px ${color}12`,
              animation: 'statFadeUp 0.5s ease forwards',
              animationDelay: `${i * 90}ms`,
              opacity: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 12px 32px ${color}22`
              e.currentTarget.style.borderColor = color + '40'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 2px 12px ${color}12`
              e.currentTarget.style.borderColor = color + '20'
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color, opacity: 0.7 }} />
            <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}12 0%, ${color}03 100%)`, opacity: 0.5 }} />
            <div className="relative z-10 p-4">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: color + '15', border: `1px solid ${color}25` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  style={{ background: color + '12' }}
                >
                  <ArrowUpRight className="w-3 h-3" style={{ color }} />
                </div>
              </div>
              <p
                className="font-black tabular-nums leading-none mb-1 truncate"
                style={{ fontSize: '20px', letterSpacing: '-0.03em', color }}
              >
                {display}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: color + '99' }}>
                {label}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            </div>
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
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>{t.revenueChart}</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>{t.revenueChartSub}</p>
          {revenueByMonth.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t.noPaidInvoices}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByMonth} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`€${v}`, t.revenue]}
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
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>{t.newClients}</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>{t.last6Months}</p>
          {clientsByMonth.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t.noClientsYet}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientsByMonth} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [v, t.clients]}
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
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>{t.projectsByType}</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>{t.distributionShooting}</p>
          {projectTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t.noProjectsYet}
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
          <h2 className="font-bold text-[14.5px] mb-1" style={{ color: 'var(--text-primary)' }}>{t.contractStatus}</h2>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>{t.overviewContracts}</p>
          {contractStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t.noContractsYet}
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
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>{t.sectionContracts}</p>
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
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>{t.sectionInvoices}</p>
          <div className="space-y-1.5">
            {[
              { key: 'paid',    label: t.paid,    color: '#10B981' },
              { key: 'sent',    label: t.sent,    color: '#F59E0B' },
              { key: 'overdue', label: t.overdue, color: '#EF4444' },
              { key: 'draft',   label: t.draft,   color: '#6B7280' },
            ].map(({ key, label, color }) => {
              const count = invoices.filter(i => i.status === key).length
              const amount = invoices.filter(i => i.status === key).reduce((s, i) => s + i.amount, 0)
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatEur(amount, locale)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>{t.sectionGalleries}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{t.activeGalleries}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{activeGalleries}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C4A47C' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{t.totalProjects}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{projects.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#8B5CF6' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{t.conversionRate}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{conversionRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EC4899' }} />
              <span className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>{t.avgRevenueProject}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{formatEur(avgRevenue * 100, locale)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
