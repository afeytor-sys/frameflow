import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowUpRight, Calendar, FolderOpen, FileText, Sparkles, Images, Receipt, AlertCircle, MessageSquare, TrendingUp, Euro, Clock, Inbox } from 'lucide-react'
import AnimatedStatsLight from '@/components/dashboard/AnimatedStatsLight'
import { dashboardT, getServerLocale } from '@/lib/dashboardTranslations'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', user!.id)
    .single()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: activeClients },
    { count: pendingContracts },
    { count: activeGalleries },
    { count: upcomingBookings },
    { data: upcomingProjects },
    { data: invoices },
    { data: conversations },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('photographer_id', user!.id).eq('status', 'active'),
    supabase.from('contracts').select('*, projects!inner(photographer_id)', { count: 'exact', head: true }).eq('projects.photographer_id', user!.id).in('status', ['sent', 'viewed']),
    supabase.from('galleries').select('*, projects!inner(photographer_id)', { count: 'exact', head: true }).eq('projects.photographer_id', user!.id).eq('status', 'active'),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('photographer_id', user!.id).gte('shoot_date', todayStr),
    supabase.from('projects').select('*, client:clients(*)').eq('photographer_id', user!.id).gte('shoot_date', todayStr).lte('shoot_date', next30).order('shoot_date', { ascending: true }).limit(5),
    supabase.from('invoices').select('id, amount, status, created_at, project:projects(title, client:clients(full_name))').eq('photographer_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('conversations').select('id, lead_name, lead_email, created_at, messages(id, sender, content, created_at)').eq('photographer_id', user!.id).order('created_at', { ascending: false }).limit(20),
  ])

  const locale = await getServerLocale()
  const t = dashboardT(locale)
  const h = t.home
  const isDE = locale === 'de'

  const greeting = getGreeting(locale)
  const firstName = photographer?.full_name?.split(' ')[0] || ''
  const plan = photographer?.plan || 'free'
  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'

  // ── Revenue ─────────────────────────────────────────────────────────────────
  const allInvoices = invoices ?? []
  const paidThisMonth = allInvoices.filter(i => i.status === 'paid' && i.created_at >= monthStart).reduce((s, i) => s + (i.amount ?? 0), 0)
  const openTotal = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + (i.amount ?? 0), 0)
  const overdueCount = allInvoices.filter(i => i.status === 'overdue').length
  const unpaidCount = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').length

  const fmt = (n: number) => new Intl.NumberFormat(dateLocale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  // ── Inbox ────────────────────────────────────────────────────────────────────
  const allConvs = conversations ?? []
  const getLastMsg = (msgs: { sender: string; content: string; created_at: string }[]) =>
    msgs?.length ? [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] : null
  const unreadConvs = allConvs.filter(c => {
    const last = getLastMsg((c.messages as { sender: string; content: string; created_at: string }[]) ?? [])
    return last?.sender === 'lead'
  })
  const previewConvs = allConvs.slice(0, 4)

  // ── Action items ─────────────────────────────────────────────────────────────
  const todayShoots = (upcomingProjects ?? []).filter(p => p.shoot_date === todayStr)
  const actionItems = [
    ...(unreadConvs.length > 0 ? [{ label: isDE ? `${unreadConvs.length} unbeantwortete Anfrage${unreadConvs.length > 1 ? 'n' : ''}` : `${unreadConvs.length} unanswered lead${unreadConvs.length > 1 ? 's' : ''}`, href: '/dashboard/inbox', color: '#3B82F6', icon: 'msg' }] : []),
    ...((pendingContracts ?? 0) > 0 ? [{ label: isDE ? `${pendingContracts} Vertrag${(pendingContracts ?? 0) > 1 ? 'e' : ''} warten auf Unterschrift` : `${pendingContracts} contract${(pendingContracts ?? 0) > 1 ? 's' : ''} awaiting signature`, href: '/dashboard/contracts', color: '#F59E0B', icon: 'doc' }] : []),
    ...(overdueCount > 0 ? [{ label: isDE ? `${overdueCount} überfällige Rechnung${overdueCount > 1 ? 'en' : ''}` : `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''}`, href: '/dashboard/invoices', color: '#EF4444', icon: 'invoice' }] : []),
    ...(todayShoots.length > 0 ? [{ label: isDE ? `Heute: ${todayShoots.map(p => (p.client as { full_name?: string })?.full_name || p.title).join(', ')}` : `Today: ${todayShoots.map(p => (p.client as { full_name?: string })?.full_name || p.title).join(', ')}`, href: '/dashboard/projects', color: '#10B981', icon: 'cal' }] : []),
  ]

  const quickActions = [
    { label: isDE ? 'Neue Anfrage' : 'New Inquiry',  sub: isDE ? 'Lead aufnehmen' : 'Add a lead',          href: '/dashboard/inbox',         icon: Inbox,     color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: isDE ? 'Neues Projekt' : 'New Project', sub: isDE ? 'Vertrag & Galerie' : 'Contract & gallery', href: '/dashboard/projects/new',  icon: FolderOpen, color: '#C4A47C', bg: 'rgba(196,164,124,0.08)' },
    { label: isDE ? 'Rechnung' : 'New Invoice',      sub: isDE ? 'Zahlung erfassen' : 'Track payment',       href: '/dashboard/invoices',      icon: Receipt,   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    { label: isDE ? 'Galerie' : 'Gallery',            sub: isDE ? 'Fotos verwalten' : 'Manage photos',        href: '/dashboard/galleries',     icon: Images,    color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    { label: isDE ? 'Vertrag' : 'Contract',           sub: isDE ? 'Unterschrift einholen' : 'Get signature',  href: '/dashboard/contracts',     icon: FileText,  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  ]

  return (
    <div className="relative z-10">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .anim-0 { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .anim-1 { animation: fadeUp 0.5s ease 0.08s forwards; opacity: 0; }
        .anim-2 { animation: fadeUp 0.5s ease 0.16s forwards; opacity: 0; }
        .anim-3 { animation: fadeUp 0.5s ease 0.24s forwards; opacity: 0; }
        .anim-4 { animation: fadeUp 0.5s ease 0.32s forwards; opacity: 0; }
      `}</style>

      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="anim-0 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'var(--text-muted)' }}>
              {today.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="font-black leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
              {greeting}{firstName ? (<>, <span style={{ color: 'var(--accent)' }}>{firstName}</span></>) : ''}.
            </h1>
            <p className="text-[14.5px] mt-2" style={{ color: 'var(--text-muted)' }}>{h.studioOverview}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
            <Link href="/dashboard/clients/new" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-88 active:scale-[0.98]" style={{ background: 'var(--text-primary)', color: 'var(--btn-primary-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
              <Plus className="w-3.5 h-3.5" />{h.newClient}
            </Link>
            <Link href="/dashboard/projects/new" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <Plus className="w-3.5 h-3.5" />{h.newProject}
            </Link>
          </div>
        </div>

        {/* ── Action required ── */}
        {actionItems.length > 0 && (
          <div className="anim-1 rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.10)' }}>
                <AlertCircle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
              </div>
              <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isDE ? 'Handlungsbedarf' : 'Action Required'}
              </span>
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
                {actionItems.length}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {actionItems.map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--bg-hover)] group">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="anim-2">
          <AnimatedStatsLight activeClients={activeClients ?? 0} pendingContracts={pendingContracts ?? 0} activeGalleries={activeGalleries ?? 0} upcomingBookings={upcomingBookings ?? 0} />
        </div>

        {/* ── Revenue strip ── */}
        <div className="anim-2 grid grid-cols-3 gap-3">
          {[
            { label: isDE ? 'Einnahmen (Monat)' : 'Revenue (month)', value: fmt(paidThisMonth), icon: TrendingUp, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
            { label: isDE ? 'Offen / Ausstehend' : 'Open invoices', value: fmt(openTotal), sub: unpaidCount > 0 ? `${unpaidCount} ${isDE ? 'Rechnung' + (unpaidCount > 1 ? 'en' : '') : 'invoice' + (unpaidCount > 1 ? 's' : '')}` : undefined, icon: Euro, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
            { label: isDE ? 'Überfällig' : 'Overdue', value: fmt(allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount ?? 0), 0)), sub: overdueCount > 0 ? `${overdueCount} ${isDE ? 'Rechnung' + (overdueCount > 1 ? 'en' : '') : 'invoice' + (overdueCount > 1 ? 's' : '')}` : (isDE ? 'Alles ok' : 'All clear'), icon: Clock, color: overdueCount > 0 ? '#EF4444' : '#6B7280', bg: overdueCount > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-hover)' },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <Link key={label} href="/dashboard/invoices" className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-all hover:opacity-90 group" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-[18px] font-black leading-tight tabular-nums" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</p>
                {sub && <p className="text-[11px] mt-0.5 font-medium" style={{ color }}>{sub}</p>}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="anim-3 grid lg:grid-cols-5 gap-5">

          {/* Left: Upcoming shoots */}
          <div className="lg:col-span-3 space-y-5">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.08)' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#EC4899' }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>{h.upcomingShoots}</h2>
                    <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{h.next30Days}</p>
                  </div>
                </div>
                <Link href="/dashboard/projects" className="text-[12px] font-semibold flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                  {h.all} <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {upcomingProjects && upcomingProjects.length > 0 ? (
                <div>
                  {upcomingProjects.map((project) => {
                    const days = project.shoot_date ? daysUntil(project.shoot_date) : null
                    const isToday = days === 0
                    const isSoon = days !== null && days <= 7 && days > 0
                    const clientName = (project.client as { full_name?: string })?.full_name || project.title
                    return (
                      <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="flex items-center gap-4 px-6 py-4 group transition-colors hover:bg-[var(--bg-hover)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: isToday ? '#EC4899' : isSoon ? 'rgba(245,158,11,0.10)' : 'var(--bg-hover)', border: isToday ? 'none' : `1px solid ${isSoon ? 'rgba(245,158,11,0.20)' : 'var(--border-color)'}` }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: isToday ? 'rgba(255,255,255,0.75)' : isSoon ? '#F59E0B' : 'var(--text-muted)' }}>
                            {project.shoot_date ? new Date(project.shoot_date).toLocaleDateString(dateLocale, { month: 'short' }) : '—'}
                          </span>
                          <span className="text-[18px] font-black leading-tight" style={{ color: isToday ? 'white' : isSoon ? '#F59E0B' : 'var(--text-primary)' }}>
                            {project.shoot_date ? new Date(project.shoot_date).getDate() : '—'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{clientName}</p>
                          <p className="text-[12px] mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>{project.project_type || 'Project'}{project.shoot_date && ` · ${formatDate(project.shoot_date, locale)}`}</p>
                        </div>
                        {days !== null && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: isToday ? '#EC4899' : isSoon ? 'rgba(245,158,11,0.12)' : 'var(--bg-hover)', color: isToday ? 'white' : isSoon ? '#F59E0B' : 'var(--text-muted)', border: `1px solid ${isToday ? 'transparent' : isSoon ? 'rgba(245,158,11,0.25)' : 'var(--border-color)'}` }}>
                            {isToday ? h.today : `${days}d`}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(236,72,153,0.08)' }}>
                    <Calendar className="w-5 h-5" style={{ color: '#EC4899' }} />
                  </div>
                  <p className="text-[13.5px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{h.noShootsTitle}</p>
                  <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-muted)' }}>{h.noShootsDesc}</p>
                  <Link href="/dashboard/projects/new" className="text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-all" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>{h.createProject}</Link>
                </div>
              )}
            </div>

            {/* Inbox preview */}
            {previewConvs.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <MessageSquare className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>{isDE ? 'Posteingang' : 'Inbox'}</h2>
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                        {unreadConvs.length > 0 ? (isDE ? `${unreadConvs.length} unbeantwortete Anfragen` : `${unreadConvs.length} unanswered`) : (isDE ? 'Alles beantwortet' : 'All answered')}
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/inbox" className="text-[12px] font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                    {isDE ? 'Alle' : 'All'} <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div>
                  {previewConvs.map((conv) => {
                    const msgs = (conv.messages as { sender: string; content: string; created_at: string }[]) ?? []
                    const last = getLastMsg(msgs)
                    const isUnread = last?.sender === 'lead'
                    const timeAgo = last ? (() => {
                      const diff = Date.now() - new Date(last.created_at).getTime()
                      const h = Math.floor(diff / 3600000)
                      const d = Math.floor(diff / 86400000)
                      return d > 0 ? `${d}d` : h > 0 ? `${h}h` : '<1h'
                    })() : ''
                    return (
                      <Link key={conv.id} href="/dashboard/inbox" className="flex items-center gap-3 px-5 py-3.5 group transition-colors hover:bg-[var(--bg-hover)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold" style={{ background: isUnread ? 'rgba(59,130,246,0.12)' : 'var(--bg-hover)', color: isUnread ? '#3B82F6' : 'var(--text-muted)' }}>
                          {(conv.lead_name || 'A')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{conv.lead_name || conv.lead_email}</p>
                            {isUnread && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3B82F6' }} />}
                          </div>
                          <p className="text-[11.5px] truncate" style={{ color: 'var(--text-muted)' }}>{last?.content?.slice(0, 60) || '—'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick actions */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>{h.quickActions}</h2>
                <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{h.commonTasks}</p>
              </div>
              <div className="p-2 space-y-0.5">
                {quickActions.map(({ label, sub, href, icon: Icon, color, bg }) => (
                  <Link key={label} href={href} className="flex items-center gap-3 p-3 rounded-xl group transition-colors hover:bg-[var(--bg-hover)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent invoices */}
            {allInvoices.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <h2 className="font-bold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{isDE ? 'Letzte Rechnungen' : 'Recent Invoices'}</h2>
                  <Link href="/dashboard/invoices" className="text-[11px] font-semibold flex items-center gap-0.5 px-2.5 py-1 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                    {isDE ? 'Alle' : 'All'} <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-2 space-y-0.5">
                  {allInvoices.slice(0, 4).map((inv) => {
                    const statusColor = inv.status === 'paid' ? '#10B981' : inv.status === 'overdue' ? '#EF4444' : inv.status === 'sent' ? '#F59E0B' : 'var(--text-muted)'
                    const clientName = (inv.project as { title?: string; client?: { full_name?: string } } | null)?.client?.full_name || (inv.project as { title?: string } | null)?.title || '—'
                    return (
                      <Link key={inv.id} href="/dashboard/invoices" className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-colors hover:bg-[var(--bg-hover)]">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{clientName}</p>
                          <p className="text-[11px] capitalize" style={{ color: statusColor }}>{inv.status}</p>
                        </div>
                        <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(inv.amount ?? 0)}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Plan card — only free/starter */}
            {plan !== 'pro' && plan !== 'studio' && (
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(196,164,124,0.15) 0%, rgba(196,164,124,0.05) 100%)', border: '1px solid rgba(196,164,124,0.25)', boxShadow: '0 8px 32px rgba(196,164,124,0.08)' }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(196,164,124,0.5), transparent)' }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: '#C4A47C' }} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#C4A47C' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</span>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{h.upgradePlan}</p>
                  <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-xl transition-all hover:opacity-88 active:scale-[0.98]" style={{ background: 'var(--text-primary)', color: 'var(--btn-primary-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                    {h.viewUpgrade}<ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
