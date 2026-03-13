import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Users, FileText, Images, HardDrive, Plus, ArrowRight, Calendar, FolderOpen } from 'lucide-react'

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
  const name = photographer?.full_name?.split(' ')[0] || ''

  const stats = [
    {
      label: 'Aktive Kunden',
      value: activeClients ?? 0,
      icon: Users,
      accent: '#2D9E6B',
      href: '/dashboard/clients',
    },
    {
      label: 'Offene Verträge',
      value: pendingContracts ?? 0,
      icon: FileText,
      accent: '#D4881A',
      href: '/dashboard/contracts',
    },
    {
      label: 'Aktive Galerien',
      value: activeGalleries ?? 0,
      icon: Images,
      accent: '#C8A882',
      href: '/dashboard/galleries',
    },
    {
      label: 'Speicher',
      value: '—',
      icon: HardDrive,
      accent: '#B0ACA6',
      href: '/dashboard/settings',
    },
  ]

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in">

      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[#111110] font-semibold leading-tight"
            style={{
              fontFamily: 'Clash Display, system-ui, sans-serif',
              fontSize: '32px',
              letterSpacing: '-0.03em',
            }}
          >
            {greeting}{name ? `, ${name}` : ''}.
          </h1>
          <p className="text-[#7A7670] text-[14px] mt-1.5" style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold bg-[#111110] text-[#F8F7F4] hover:bg-[#1E1E1C] transition-colors"
            style={{ letterSpacing: '0.01em' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Kunde
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold border border-[#E4E1DC] text-[#111110] hover:bg-[#F2F0EC] transition-colors"
            style={{ letterSpacing: '0.01em' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Neues Projekt
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, accent, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-[10px] p-6 border border-[#E4E1DC] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-all duration-150 group"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${accent}18` }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#E4E1DC] group-hover:text-[#C8A882] transition-colors" />
            </div>
            <div
              className="font-semibold text-[#111110] leading-none mb-1.5"
              style={{
                fontFamily: 'Clash Display, system-ui, sans-serif',
                fontSize: '40px',
                letterSpacing: '-0.04em',
                color: typeof value === 'number' && value > 0 ? accent : '#111110',
              }}
            >
              {value}
            </div>
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B0ACA6]"
              style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}
            >
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Two column */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Upcoming shoots */}
        <div className="bg-white rounded-[10px] border border-[#E4E1DC] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E1DC]">
            <h2
              className="font-semibold text-[#111110]"
              style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '16px', letterSpacing: '-0.02em' }}
            >
              Bevorstehende Shootings
            </h2>
            <Link
              href="/dashboard/projects"
              className="text-[12px] font-semibold text-[#C8A882] hover:text-[#B8966E] transition-colors"
            >
              Alle ansehen
            </Link>
          </div>

          {upcomingProjects && upcomingProjects.length > 0 ? (
            <div className="divide-y divide-[#F2F0EC]">
              {upcomingProjects.map((project) => {
                const days = project.shoot_date ? daysUntil(project.shoot_date) : null
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#F8F7F4] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#C8A882]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[#C8A882]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#111110] truncate">
                        {(project.client as { full_name?: string })?.full_name || project.title}
                      </p>
                      <p className="text-[12px] text-[#7A7670] mt-0.5">
                        {project.shoot_date ? formatDate(project.shoot_date, 'de') : '—'}
                        {project.project_type && ` · ${project.project_type}`}
                      </p>
                    </div>
                    {days !== null && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: days === 0 ? '#C9403018' : days <= 7 ? '#D4881A18' : '#2D9E6B18',
                          color: days === 0 ? '#C94030' : days <= 7 ? '#D4881A' : '#2D9E6B',
                        }}
                      >
                        {days === 0 ? 'Heute' : `${days}d`}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F2F0EC] flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-[#B0ACA6]" />
              </div>
              <p className="text-[14px] text-[#7A7670]">Keine bevorstehenden Shootings</p>
              <Link
                href="/dashboard/projects/new"
                className="mt-3 text-[12px] font-semibold text-[#C8A882] hover:text-[#B8966E]"
              >
                Projekt erstellen
              </Link>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-[10px] border border-[#E4E1DC] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 border-b border-[#E4E1DC]">
            <h2
              className="font-semibold text-[#111110]"
              style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '16px', letterSpacing: '-0.02em' }}
            >
              Schnellaktionen
            </h2>
          </div>
          <div className="p-4 space-y-1">
            {[
              {
                label: 'Neuen Kunden erstellen',
                desc: 'Kunden hinzufügen und Projekt starten',
                href: '/dashboard/clients/new',
                icon: Users,
              },
              {
                label: 'Neues Projekt',
                desc: 'Vertrag, Galerie und Zeitplan',
                href: '/dashboard/projects/new',
                icon: FolderOpen,
              },
              {
                label: 'Alle Verträge',
                desc: 'Ausstehende Signaturen prüfen',
                href: '/dashboard/contracts',
                icon: FileText,
              },
            ].map(({ label, desc, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8F7F4] border border-transparent hover:border-[#E4E1DC] transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F2F0EC] flex items-center justify-center flex-shrink-0 group-hover:bg-[#C8A882]/10 transition-colors">
                  <Icon className="w-4 h-4 text-[#B0ACA6] group-hover:text-[#C8A882] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#111110]">{label}</p>
                  <p className="text-[12px] text-[#7A7670]">{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#E4E1DC] group-hover:text-[#C8A882] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
