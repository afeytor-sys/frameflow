import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowUpRight, Calendar, FolderOpen, FileText, Users, Sparkles, Images, Receipt } from 'lucide-react'
import AnimatedStatsLight from '@/components/dashboard/AnimatedStatsLight'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', user!.id)
    .single()

  const [
    { count: activeClients },
    { count: pendingContracts },
    { count: activeGalleries },
    { count: upcomingBookings },
    { data: upcomingProjects },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('photographer_id', user!.id)
      .eq('status', 'active'),
    supabase
      .from('contracts')
      .select('*, projects!inner(photographer_id)', { count: 'exact', head: true })
      .eq('projects.photographer_id', user!.id)
      .in('status', ['sent', 'viewed']),
    supabase
      .from('galleries')
      .select('*, projects!inner(photographer_id)', { count: 'exact', head: true })
      .eq('projects.photographer_id', user!.id)
      .eq('status', 'active'),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('photographer_id', user!.id)
      .gte('shoot_date', new Date().toISOString().split('T')[0]),
    supabase
      .from('projects')
      .select('*, client:clients(*)')
      .eq('photographer_id', user!.id)
      .gte('shoot_date', new Date().toISOString().split('T')[0])
      .lte('shoot_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('shoot_date', { ascending: true })
      .limit(5),
  ])

  const greeting = getGreeting(photographer?.language || 'de')
  const firstName = photographer?.full_name?.split(' ')[0] || ''
  const plan = photographer?.plan || 'free'

  const quickActions = [
    { label: 'Neuer Kunde',    sub: 'Kunden hinzufügen',    href: '/dashboard/clients/new',   icon: Users,     color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Neues Projekt',  sub: 'Vertrag & Galerie',    href: '/dashboard/projects/new',  icon: FolderOpen, color: '#C4A47C', bg: 'rgba(196,164,124,0.08)' },
    { label: 'Alle Verträge',  sub: 'Signaturen prüfen',    href: '/dashboard/contracts',     icon: FileText,  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Galerien',       sub: 'Fotos verwalten',      href: '/dashboard/galleries',     icon: Images,    color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Rechnungen',     sub: 'Zahlungen verfolgen',  href: '/dashboard/invoices',      icon: Receipt,   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  ]

  return (
    <div className="relative z-10">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-0 { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .anim-1 { animation: fadeUp 0.5s ease 0.1s forwards; opacity: 0; }
        .anim-2 { animation: fadeUp 0.5s ease 0.2s forwards; opacity: 0; }
        .anim-3 { animation: fadeUp 0.5s ease 0.3s forwards; opacity: 0; }
      `}</style>

      <div className="space-y-8">

        {/* ── Header ── */}
        <div className="anim-0 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1
              className="font-black leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
            >
              {greeting}{firstName ? (
                <>, <span style={{ color: 'var(--accent)' }}>{firstName}</span></>
              ) : ''}.
            </h1>
            <p className="text-[14.5px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Hier ist dein Studio-Überblick für heute.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-88 active:scale-[0.98]"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-page)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Neuer Kunde
            </Link>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="anim-1">
          <AnimatedStatsLight
            activeClients={activeClients ?? 0}
            pendingContracts={pendingContracts ?? 0}
            activeGalleries={activeGalleries ?? 0}
            upcomingBookings={upcomingBookings ?? 0}
          />
        </div>

        {/* ── Main grid ── */}
        <div className="anim-2 grid lg:grid-cols-5 gap-5">

          {/* Upcoming shoots */}
          <div
            className="lg:col-span-3 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.08)' }}
                >
                  <Calendar className="w-4 h-4" style={{ color: '#EC4899' }} />
                </div>
                <div>
                  <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>
                    Bevorstehende Shootings
                  </h2>
                  <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    Nächste 30 Tage
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/projects"
                className="text-[12px] font-semibold flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
              >
                Alle <ArrowUpRight className="w-3 h-3" />
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
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center gap-4 px-6 py-4 group transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      {/* Date block */}
                      <div
                        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{
                          background: isToday ? '#EC4899' : isSoon ? 'rgba(245,158,11,0.10)' : 'var(--bg-hover)',
                          border: isToday ? 'none' : `1px solid ${isSoon ? 'rgba(245,158,11,0.20)' : 'var(--border-color)'}`,
                        }}
                      >
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider leading-none"
                          style={{ color: isToday ? 'rgba(255,255,255,0.75)' : isSoon ? '#F59E0B' : 'var(--text-muted)' }}
                        >
                          {project.shoot_date ? new Date(project.shoot_date).toLocaleDateString('de-DE', { month: 'short' }) : '—'}
                        </span>
                        <span
                          className="text-[18px] font-black leading-tight"
                          style={{ color: isToday ? 'white' : isSoon ? '#F59E0B' : 'var(--text-primary)' }}
                        >
                          {project.shoot_date ? new Date(project.shoot_date).getDate() : '—'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {clientName}
                        </p>
                        <p className="text-[12px] mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                          {project.project_type || 'Projekt'}
                          {project.shoot_date && ` · ${formatDate(project.shoot_date, 'de')}`}
                        </p>
                      </div>

                      {days !== null && (
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{
                            background: isToday ? '#EC4899' : isSoon ? 'rgba(245,158,11,0.12)' : 'var(--bg-hover)',
                            color: isToday ? 'white' : isSoon ? '#F59E0B' : 'var(--text-muted)',
                            border: `1px solid ${isToday ? 'transparent' : isSoon ? 'rgba(245,158,11,0.25)' : 'var(--border-color)'}`,
                          }}
                        >
                          {isToday ? 'Heute' : `${days}d`}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(236,72,153,0.08)' }}
                >
                  <Calendar className="w-5 h-5" style={{ color: '#EC4899' }} />
                </div>
                <p className="text-[13.5px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Keine Shootings geplant
                </p>
                <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
                  Keine Shootings in den nächsten 30 Tagen
                </p>
                <Link
                  href="/dashboard/projects/new"
                  className="text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-all"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Projekt erstellen →
                </Link>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick actions */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>
                  Schnellaktionen
                </h2>
                <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Häufige Aufgaben
                </p>
              </div>
              <div className="p-2 space-y-0.5">
                {quickActions.map(({ label, sub, href, icon: Icon, color, bg }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-xl group transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: bg }}
                    >
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

            {/* Plan card — only show for free/starter */}
            {plan !== 'pro' && plan !== 'studio' && (
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(196,164,124,0.15) 0%, rgba(196,164,124,0.05) 100%)',
                  border: '1px solid rgba(196,164,124,0.25)',
                  boxShadow: '0 8px 32px rgba(196,164,124,0.08)',
                }}
              >
                {/* Shimmer top */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(196,164,124,0.5), transparent)' }}
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: '#C4A47C' }} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#C4A47C' }}>
                      {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Upgrade für unbegrenzte Kunden, Galerien ohne Limit und mehr.
                  </p>
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-xl transition-all hover:opacity-88 active:scale-[0.98]"
                    style={{
                      background: 'var(--text-primary)',
                      color: 'var(--bg-page)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }}
                  >
                    Upgrade ansehen
                    <ArrowUpRight className="w-3.5 h-3.5" />
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
