import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Users, FileText, Images, Plus, ArrowUpRight, Calendar, FolderOpen, TrendingUp } from 'lucide-react'

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

  return (
    <div className="max-w-[1100px] mx-auto space-y-7 animate-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div>
          <p className="text-[#A8A49E] text-[12px] font-medium mb-1">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display text-[#0D0D0C] font-semibold leading-tight" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold bg-[#0D0D0C] text-[#F7F6F3] hover:bg-[#1A1A18] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Kunde
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border border-[#E2DED8] text-[#0D0D0C] hover:bg-[#F0EEE9] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neues Projekt
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Aktive Kunden',
            value: activeClients ?? 0,
            icon: Users,
            color: '#2A9B68',
            bg: '#2A9B6810',
            href: '/dashboard/clients',
            trend: null,
          },
          {
            label: 'Offene Verträge',
            value: pendingContracts ?? 0,
            icon: FileText,
            color: '#CC8415',
            bg: '#CC841510',
            href: '/dashboard/contracts',
            trend: null,
          },
          {
            label: 'Aktive Galerien',
            value: activeGalleries ?? 0,
            icon: Images,
            color: '#C4A47C',
            bg: '#C4A47C10',
            href: '/dashboard/galleries',
            trend: null,
          },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl p-5 border border-[#E2DED8] hover:border-[#C4C0BA] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#E2DED8] group-hover:text-[#C4A47C] transition-colors" />
            </div>
            <div className="font-display font-semibold text-[#0D0D0C] leading-none mb-1.5" style={{ fontSize: '36px', letterSpacing: '-0.04em', color: value > 0 ? color : '#0D0D0C' }}>
              {value}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A8A49E]">
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Two column */}
      <div className="grid lg:grid-cols-5 gap-5">

        {/* Upcoming shoots — wider */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2DED8] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EEE9]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#A8A49E]" />
              <h2 className="font-semibold text-[#0D0D0C] text-[14px]">Bevorstehende Shootings</h2>
            </div>
            <Link href="/dashboard/projects" className="text-[12px] font-semibold text-[#C4A47C] hover:text-[#B3916A] transition-colors">
              Alle →
            </Link>
          </div>

          {upcomingProjects && upcomingProjects.length > 0 ? (
            <div className="divide-y divide-[#F7F6F3]">
              {upcomingProjects.map((project) => {
                const days = project.shoot_date ? daysUntil(project.shoot_date) : null
                const isToday = days === 0
                const isSoon = days !== null && days <= 7 && days > 0
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#F7F6F3] transition-colors group"
                  >
                    {/* Date block */}
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-[#C43B2C]/8' : 'bg-[#F0EEE9]'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wide leading-none ${isToday ? 'text-[#C43B2C]' : 'text-[#A8A49E]'}`}>
                        {project.shoot_date ? new Date(project.shoot_date).toLocaleDateString('de-DE', { month: 'short' }) : '—'}
                      </span>
                      <span className={`text-[16px] font-bold leading-tight ${isToday ? 'text-[#C43B2C]' : 'text-[#0D0D0C]'}`}>
                        {project.shoot_date ? new Date(project.shoot_date).getDate() : '—'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#0D0D0C] truncate">
                        {(project.client as { full_name?: string })?.full_name || project.title}
                      </p>
                      <p className="text-[12px] text-[#A8A49E] mt-0.5 capitalize">
                        {project.project_type || 'Projekt'}
                      </p>
                    </div>

                    {days !== null && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{
                        background: isToday ? '#C43B2C12' : isSoon ? '#CC841512' : '#2A9B6812',
                        color: isToday ? '#C43B2C' : isSoon ? '#CC8415' : '#2A9B68',
                      }}>
                        {isToday ? 'Heute' : `${days}d`}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F0EEE9] flex items-center justify-center mb-3">
                <Calendar className="w-4.5 h-4.5 text-[#C4C0BA]" />
              </div>
              <p className="text-[13px] text-[#A8A49E]">Keine Shootings in den nächsten 30 Tagen</p>
              <Link href="/dashboard/projects/new" className="mt-2 text-[12px] font-semibold text-[#C4A47C] hover:text-[#B3916A]">
                Projekt erstellen →
              </Link>
            </div>
          )}
        </div>

        {/* Quick actions — narrower */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick actions card */}
          <div className="bg-white rounded-xl border border-[#E2DED8] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0EEE9]">
              <h2 className="font-semibold text-[#0D0D0C] text-[14px]">Schnellaktionen</h2>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: 'Neuen Kunden', sub: 'Kunden hinzufügen', href: '/dashboard/clients/new', icon: Users },
                { label: 'Neues Projekt', sub: 'Vertrag & Galerie', href: '/dashboard/projects/new', icon: FolderOpen },
                { label: 'Alle Verträge', sub: 'Signaturen prüfen', href: '/dashboard/contracts', icon: FileText },
              ].map(({ label, sub, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F7F6F3] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F0EEE9] flex items-center justify-center flex-shrink-0 group-hover:bg-[#C4A47C]/10 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-[#A8A49E] group-hover:text-[#C4A47C] transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0D0D0C]">{label}</p>
                    <p className="text-[11px] text-[#A8A49E]">{sub}</p>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-[#E2DED8] group-hover:text-[#C4A47C] transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Plan card */}
          <div className="bg-[#0D0D0C] rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#C4A47C]/5 -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-[#C4A47C]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C4A47C]">
                  {photographer?.plan || 'Free'} Plan
                </span>
              </div>
              <p className="text-white/70 text-[12.5px] leading-relaxed mb-4">
                Upgrade für unbegrenzte Kunden, Galerien ohne Limit und mehr.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C4A47C] text-[#0D0D0C] text-[12px] font-bold rounded-lg hover:bg-[#D4B48C] transition-colors"
              >
                Upgrade ansehen
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
