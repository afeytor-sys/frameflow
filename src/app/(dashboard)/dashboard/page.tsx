import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowUpRight, Calendar, FolderOpen, FileText, Users, Sparkles } from 'lucide-react'
import AnimatedStats from '@/components/dashboard/AnimatedStats'

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
    <div className="min-h-full bg-[#0D0D0C]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .anim-0 { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .anim-1 { animation: fadeUp 0.5s ease 0.1s forwards; opacity: 0; }
        .anim-2 { animation: fadeUp 0.5s ease 0.2s forwards; opacity: 0; }
        .anim-3 { animation: fadeUp 0.5s ease 0.3s forwards; opacity: 0; }
        .anim-4 { animation: fadeUp 0.5s ease 0.4s forwards; opacity: 0; }
      `}</style>

      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="anim-0 flex items-start justify-between gap-4">
          <div>
            <p className="text-[#3A3A38] text-[12px] font-medium mb-1.5 uppercase tracking-[0.08em]">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="font-display text-white font-semibold leading-tight" style={{ fontSize: '32px', letterSpacing: '-0.02em' }}>
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="text-[#4A4A48] text-[14px] mt-1">
              Hier ist dein Studio-Überblick für heute.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#C4A47C] text-[#0D0D0C] hover:bg-[#D4B48C] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              Neuer Kunde
            </Link>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>
        </div>

        {/* Animated Stats */}
        <div className="anim-1">
          <AnimatedStats
            activeClients={activeClients ?? 0}
            pendingContracts={pendingContracts ?? 0}
            activeGalleries={activeGalleries ?? 0}
          />
        </div>

        {/* Main grid */}
        <div className="anim-2 grid lg:grid-cols-5 gap-5">

          {/* Upcoming shoots */}
          <div
            className="lg:col-span-3 rounded-2xl border overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #141413 0%, #0F0F0E 100%)',
              borderColor: 'rgba(255,255,255,0.06)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#C4A47C]/10 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-[#C4A47C]" />
                </div>
                <h2 className="font-semibold text-white text-[14px]">Bevorstehende Shootings</h2>
              </div>
              <Link href="/dashboard/projects" className="text-[12px] font-semibold text-[#C4A47C] hover:text-[#D4B48C] transition-colors flex items-center gap-1">
                Alle <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingProjects && upcomingProjects.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {upcomingProjects.map((project, i) => {
                  const days = project.shoot_date ? daysUntil(project.shoot_date) : null
                  const isToday = days === 0
                  const isSoon = days !== null && days <= 7 && days > 0
                  const clientName = (project.client as { full_name?: string })?.full_name || project.title

                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {/* Date block */}
                      <div
                        className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{
                          background: isToday ? 'rgba(196,164,124,0.15)' : 'rgba(255,255,255,0.04)',
                          border: isToday ? '1px solid rgba(196,164,124,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: isToday ? '#C4A47C' : '#4A4A48' }}>
                          {project.shoot_date ? new Date(project.shoot_date).toLocaleDateString('de-DE', { month: 'short' }) : '—'}
                        </span>
                        <span className="text-[17px] font-bold leading-tight" style={{ color: isToday ? '#C4A47C' : 'white' }}>
                          {project.shoot_date ? new Date(project.shoot_date).getDate() : '—'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-white truncate group-hover:text-[#C4A47C] transition-colors">
                          {clientName}
                        </p>
                        <p className="text-[12px] text-[#4A4A48] mt-0.5 capitalize">
                          {project.project_type || 'Projekt'}
                          {project.shoot_date && ` · ${formatDate(project.shoot_date, 'de')}`}
                        </p>
                      </div>

                      {days !== null && (
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{
                            background: isToday ? 'rgba(196,164,124,0.15)' : isSoon ? 'rgba(232,160,48,0.12)' : 'rgba(255,255,255,0.05)',
                            color: isToday ? '#C4A47C' : isSoon ? '#E8A030' : '#4A4A48',
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
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3 border border-white/[0.06]">
                  <Calendar className="w-5 h-5 text-[#3A3A38]" />
                </div>
                <p className="text-[#4A4A48] text-[13px]">Keine Shootings in den nächsten 30 Tagen</p>
                <Link href="/dashboard/projects/new" className="mt-3 text-[12px] font-semibold text-[#C4A47C] hover:text-[#D4B48C] transition-colors">
                  Projekt erstellen →
                </Link>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick actions */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #141413 0%, #0F0F0E 100%)',
                borderColor: 'rgba(255,255,255,0.06)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h2 className="font-semibold text-white text-[14px]">Schnellaktionen</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { label: 'Neuen Kunden', sub: 'Kunden hinzufügen', href: '/dashboard/clients/new', icon: Users, color: '#C4A47C' },
                  { label: 'Neues Projekt', sub: 'Vertrag & Galerie', href: '/dashboard/projects/new', icon: FolderOpen, color: '#7EB8A0' },
                  { label: 'Alle Verträge', sub: 'Signaturen prüfen', href: '/dashboard/contracts', icon: FileText, color: '#E8A030' },
                ].map(({ label, sub, href, icon: Icon, color }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `${color}12`, border: `1px solid ${color}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">{label}</p>
                      <p className="text-[11px] text-[#3A3A38]">{sub}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#2A2A28] group-hover:text-[#C4A47C] transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Plan upgrade card */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1A1508 0%, #0D0D0C 60%)',
                border: '1px solid rgba(196,164,124,0.15)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(196,164,124,0.05) inset',
              }}
            >
              {/* Glow */}
              <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{
                background: 'radial-gradient(ellipse at top left, rgba(196,164,124,0.3) 0%, transparent 60%)',
              }} />
              {/* Top line */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{
                background: 'linear-gradient(90deg, transparent, rgba(196,164,124,0.5), transparent)',
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C4A47C] text-[#0D0D0C] text-[12.5px] font-bold rounded-xl hover:bg-[#D4B48C] transition-all hover:scale-[1.02] active:scale-[0.98]"
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
