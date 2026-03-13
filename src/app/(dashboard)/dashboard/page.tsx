import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowUpRight, Calendar, FolderOpen, FileText, Users, Sparkles } from 'lucide-react'
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

  return (
    <div className="min-h-full relative z-10">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-0 { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .anim-1 { animation: fadeUp 0.5s ease 0.1s forwards; opacity: 0; }
        .anim-2 { animation: fadeUp 0.5s ease 0.2s forwards; opacity: 0; }
      `}</style>

      <div className="max-w-[1080px] mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="anim-0 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1
              className="font-bold leading-tight"
              style={{ fontSize: '28px', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}
            >
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="text-[14px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Hier ist dein Studio-Überblick für heute.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-page)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Neuer Kunde
            </Link>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="anim-1">
          <AnimatedStatsLight
            activeClients={activeClients ?? 0}
            pendingContracts={pendingContracts ?? 0}
            activeGalleries={activeGalleries ?? 0}
          />
        </div>

        {/* Main grid */}
        <div className="anim-2 grid lg:grid-cols-5 gap-5">

          {/* Upcoming shoots */}
          <div
            className="lg:col-span-3 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                >
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <h2 className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                  Bevorstehende Shootings
                </h2>
              </div>
              <Link
                href="/dashboard/projects"
                className="text-[12px] font-semibold flex items-center gap-1 transition-colors"
                style={{ color: 'var(--text-muted)' }}
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
                      className="sidebar-nav-item sidebar-nav-inactive flex items-center gap-4 px-5 py-3.5 group"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      {/* Date block */}
                      <div
                        className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{
                          background: isToday ? 'var(--text-primary)' : 'var(--bg-hover)',
                          border: isToday ? 'none' : '1px solid var(--border-color)',
                        }}
                      >
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider leading-none"
                          style={{ color: isToday ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}
                        >
                          {project.shoot_date ? new Date(project.shoot_date).toLocaleDateString('de-DE', { month: 'short' }) : '—'}
                        </span>
                        <span
                          className="text-[17px] font-bold leading-tight"
                          style={{ color: isToday ? 'white' : 'var(--text-primary)' }}
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
                            background: isToday ? 'var(--text-primary)' : isSoon ? 'rgba(232,160,48,0.15)' : 'var(--bg-hover)',
                            color: isToday ? 'white' : isSoon ? '#E8A030' : 'var(--text-muted)',
                            border: `1px solid ${isToday ? 'transparent' : isSoon ? 'rgba(232,160,48,0.3)' : 'var(--border-color)'}`,
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
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                >
                  <Calendar className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Keine Shootings in den nächsten 30 Tagen
                </p>
                <Link
                  href="/dashboard/projects/new"
                  className="mt-3 text-[12px] font-semibold transition-colors"
                  style={{ color: 'var(--text-primary)' }}
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
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                  Schnellaktionen
                </h2>
              </div>
              <div className="p-2 space-y-0.5">
                {[
                  { label: 'Neuen Kunden', sub: 'Kunden hinzufügen', href: '/dashboard/clients/new', icon: Users },
                  { label: 'Neues Projekt', sub: 'Vertrag & Galerie', href: '/dashboard/projects/new', icon: FolderOpen },
                  { label: 'Alle Verträge', sub: 'Signaturen prüfen', href: '/dashboard/contracts', icon: FileText },
                ].map(({ label, sub, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className="sidebar-nav-item sidebar-nav-inactive flex items-center gap-3 p-3 rounded-xl group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
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

            {/* Plan card — glassmorphism dark */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(196,164,124,0.15) 0%, rgba(196,164,124,0.05) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'var(--text-primary)',
                    color: 'var(--bg-page)',
                  }}
                >
                  Upgrade ansehen
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
