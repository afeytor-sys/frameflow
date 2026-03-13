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
    <div className="min-h-full bg-[#FAFAF8]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-0 { animation: fadeUp 0.45s ease forwards; opacity: 0; }
        .anim-1 { animation: fadeUp 0.45s ease 0.08s forwards; opacity: 0; }
        .anim-2 { animation: fadeUp 0.45s ease 0.16s forwards; opacity: 0; }
        .anim-3 { animation: fadeUp 0.45s ease 0.24s forwards; opacity: 0; }
      `}</style>

      <div className="max-w-[1080px] mx-auto px-6 py-8 space-y-7">

        {/* Header */}
        <div className="anim-0 flex items-start justify-between gap-4">
          <div>
            <p className="text-[#B0A99E] text-[11px] font-semibold mb-1.5 uppercase tracking-[0.1em]">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1
              className="text-[#1A1A1A] font-bold leading-tight"
              style={{ fontSize: '30px', letterSpacing: '-0.025em', fontFamily: 'var(--font-display)' }}
            >
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="text-[#8A8480] text-[14px] mt-1">
              Hier ist dein Studio-Überblick für heute.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              Neuer Kunde
            </Link>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold border border-[#E0DDD8] text-[#6B6560] hover:text-[#1A1A1A] hover:border-[#C8C4BE] hover:bg-[#F5F2EE] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>
        </div>

        {/* Animated Stats */}
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
            className="lg:col-span-3 rounded-2xl border overflow-hidden bg-white"
            style={{ borderColor: '#E8E4DE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F0EDE8' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#F5F2EE] flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-[#8A8480]" />
                </div>
                <h2 className="font-semibold text-[#1A1A1A] text-[14px]">Bevorstehende Shootings</h2>
              </div>
              <Link href="/dashboard/projects" className="text-[12px] font-semibold text-[#8A8480] hover:text-[#1A1A1A] transition-colors flex items-center gap-1">
                Alle <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingProjects && upcomingProjects.length > 0 ? (
              <div className="divide-y divide-[#F5F2EE]">
                {upcomingProjects.map((project, i) => {
                  const days = project.shoot_date ? daysUntil(project.shoot_date) : null
                  const isToday = days === 0
                  const isSoon = days !== null && days <= 7 && days > 0
                  const clientName = (project.client as { full_name?: string })?.full_name || project.title

                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors group"
                    >
                      {/* Date block */}
                      <div
                        className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{
                          background: isToday ? '#1A1A1A' : '#F5F2EE',
                          border: isToday ? 'none' : '1px solid #E8E4DE',
                        }}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: isToday ? 'rgba(255,255,255,0.6)' : '#B0A99E' }}>
                          {project.shoot_date ? new Date(project.shoot_date).toLocaleDateString('de-DE', { month: 'short' }) : '—'}
                        </span>
                        <span className="text-[17px] font-bold leading-tight" style={{ color: isToday ? 'white' : '#1A1A1A' }}>
                          {project.shoot_date ? new Date(project.shoot_date).getDate() : '—'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-[#1A1A1A] truncate group-hover:text-[#6B6560] transition-colors">
                          {clientName}
                        </p>
                        <p className="text-[12px] text-[#B0A99E] mt-0.5 capitalize">
                          {project.project_type || 'Projekt'}
                          {project.shoot_date && ` · ${formatDate(project.shoot_date, 'de')}`}
                        </p>
                      </div>

                      {days !== null && (
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{
                            background: isToday ? '#1A1A1A' : isSoon ? '#FEF3C7' : '#F5F2EE',
                            color: isToday ? 'white' : isSoon ? '#92400E' : '#B0A99E',
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
                <div className="w-12 h-12 rounded-2xl bg-[#F5F2EE] flex items-center justify-center mb-3 border border-[#E8E4DE]">
                  <Calendar className="w-5 h-5 text-[#C8C4BE]" />
                </div>
                <p className="text-[#B0A99E] text-[13px]">Keine Shootings in den nächsten 30 Tagen</p>
                <Link href="/dashboard/projects/new" className="mt-3 text-[12px] font-semibold text-[#1A1A1A] hover:text-[#6B6560] transition-colors">
                  Projekt erstellen →
                </Link>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick actions */}
            <div
              className="rounded-2xl border overflow-hidden bg-white"
              style={{ borderColor: '#E8E4DE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0EDE8' }}>
                <h2 className="font-semibold text-[#1A1A1A] text-[14px]">Schnellaktionen</h2>
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
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F2EE] transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F5F2EE] flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 border border-[#E8E4DE]">
                      <Icon className="w-3.5 h-3.5 text-[#8A8480]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">{label}</p>
                      <p className="text-[11px] text-[#B0A99E]">{sub}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#D0CCC8] group-hover:text-[#8A8480] transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Plan card */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden bg-[#1A1A1A]"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}
            >
              {/* Subtle top shimmer */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              }} />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-[#C4A47C]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#C4A47C]">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </span>
                </div>
                <p className="text-white/60 text-[13px] leading-relaxed mb-4">
                  Upgrade für unbegrenzte Kunden, Galerien ohne Limit und mehr.
                </p>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#1A1A1A] text-[12.5px] font-bold rounded-xl hover:bg-[#F5F2EE] transition-all hover:scale-[1.02] active:scale-[0.98]"
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
