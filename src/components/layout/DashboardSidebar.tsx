'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  Images,
  Settings,
  CreditCard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Globe,
  CalendarDays,
  BarChart2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  photographer: Photographer
}

const navItems = [
  { key: 'dashboard', href: '/dashboard',           icon: LayoutDashboard, label: 'Übersicht',  plans: null },
  { key: 'clients',   href: '/dashboard/clients',   icon: Users,           label: 'Kunden',     plans: null },
  { key: 'projects',  href: '/dashboard/projects',  icon: FolderOpen,      label: 'Projekte',   plans: null },
  { key: 'bookings',  href: '/dashboard/bookings',  icon: CalendarDays,    label: 'Bookings',   plans: null },
  { key: 'contracts', href: '/dashboard/contracts', icon: FileText,        label: 'Verträge',   plans: null },
  { key: 'galleries', href: '/dashboard/galleries', icon: Images,          label: 'Galerien',   plans: null },
  { key: 'invoices',  href: '/dashboard/invoices',  icon: Receipt,         label: 'Rechnungen', plans: null },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart2,       label: 'Analytics',  plans: ['pro', 'studio'] },
]

const bottomItems = [
  { key: 'settings', href: '/dashboard/settings', icon: Settings,   label: 'Einstellungen' },
  { key: 'billing',  href: '/dashboard/billing',  icon: CreditCard, label: 'Abonnement' },
]

const externalItems = [
  { key: 'website', href: '/', icon: Globe, label: 'Website ansehen' },
]

const planLabel: Record<string, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio',
}

const planColors: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(100,116,139,0.10)', color: '#64748B' },
  starter: { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C' },
  pro:     { bg: 'rgba(59,130,246,0.10)',  color: '#3B82F6' },
  studio:  { bg: 'rgba(139,92,246,0.10)',  color: '#8B5CF6' },
}

export default function DashboardSidebar({ photographer }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const plan = photographer.plan || 'free'
  const pc = planColors[plan] || planColors.free
  const initials = (photographer.full_name || photographer.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside
      className={cn(
        'flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0 select-none glass-sidebar',
        collapsed ? 'w-[64px]' : 'w-[232px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[60px] flex-shrink-0',
          collapsed ? 'justify-center' : 'px-5 gap-3',
        )}
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg"
          style={{ background: 'var(--bg-active)', color: 'var(--text-on-active)' }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 14V7.5L10 4L16 7.5V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 14V10.5H12.5V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {!collapsed && (
          <span
            className="font-black text-[17px] tracking-tight leading-none"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}
          >
            Fotonizer
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Navigation
          </p>
        )}
        {navItems.map(({ key, href, icon: Icon, label, plans }) => {
          if (plans && !plans.includes(plan)) return null
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'sidebar-nav-item flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150 relative group',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                active ? 'sidebar-nav-active' : 'sidebar-nav-inactive',
              )}
            >
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-[18px] h-[18px]' : 'w-[16px] h-[16px]')} />
              {!collapsed && <span className="truncate">{label}</span>}
              {/* Active indicator dot for collapsed */}
              {active && collapsed && (
                <span
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
                  style={{ background: 'var(--sidebar-active-text)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="px-3 pb-4 pt-3 space-y-1"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        {bottomItems.map(({ key, href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'sidebar-nav-item flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                active ? 'sidebar-nav-active' : 'sidebar-nav-inactive',
              )}
            >
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-[18px] h-[18px]' : 'w-[16px] h-[16px]')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {externalItems.map(({ key, href, icon: Icon, label }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? label : undefined}
            className={cn(
              'sidebar-nav-item sidebar-nav-inactive flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150',
              collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
            )}
          >
            <Icon className={cn('flex-shrink-0', collapsed ? 'w-[18px] h-[18px]' : 'w-[16px] h-[16px]')} />
            {!collapsed && <span className="truncate">{label}</span>}
          </a>
        ))}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Erweitern' : 'Einklappen'}
          className={cn(
            'sidebar-nav-item sidebar-nav-inactive flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150 w-full',
            collapsed ? 'justify-center p-3' : 'px-3 py-2.5'
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="w-[16px] h-[16px] flex-shrink-0" />
            : <PanelLeftClose className="w-[16px] h-[16px] flex-shrink-0" />
          }
          {!collapsed && <span>Einklappen</span>}
        </button>

        {/* User row */}
        <div
          className={cn(
            'flex items-center gap-2.5 mt-2 pt-3',
            collapsed ? 'justify-center px-1' : 'px-1'
          )}
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
            style={{
              background: 'var(--bg-active)',
              color: 'var(--text-on-active)',
            }}
          >
            {initials}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {photographer.full_name?.split(' ')[0] || photographer.email?.split('@')[0]}
                </p>
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold mt-0.5"
                  style={{ background: pc.bg, color: pc.color }}
                >
                  {planLabel[plan] || plan}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-nav-item sidebar-nav-inactive transition-colors flex-shrink-0 p-1.5 rounded-lg"
                title="Abmelden"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
