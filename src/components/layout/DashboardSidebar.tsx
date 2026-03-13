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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  photographer: Photographer
}

const navItems = [
  { key: 'dashboard', href: '/dashboard',           icon: LayoutDashboard, label: 'Übersicht' },
  { key: 'clients',   href: '/dashboard/clients',   icon: Users,           label: 'Kunden' },
  { key: 'projects',  href: '/dashboard/projects',  icon: FolderOpen,      label: 'Projekte' },
  { key: 'contracts', href: '/dashboard/contracts', icon: FileText,        label: 'Verträge' },
  { key: 'galleries', href: '/dashboard/galleries', icon: Images,          label: 'Galerien' },
]

const bottomItems = [
  { key: 'settings', href: '/dashboard/settings', icon: Settings,   label: 'Einstellungen' },
  { key: 'billing',  href: '/dashboard/billing',  icon: CreditCard, label: 'Abonnement' },
]

const planLabel: Record<string, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio',
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
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[56px] flex-shrink-0',
          collapsed ? 'justify-center' : 'px-5 gap-2.5',
        )}
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="currentColor" fillOpacity="0.10"/>
            <path d="M4 14V7.5L10 4L16 7.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 14V10.5H12.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {!collapsed && (
          <span
            className="font-bold text-[17px] tracking-tight leading-none"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            FrameFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Navigation
          </p>
        )}
        {navItems.map(({ key, href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 relative group',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
              )}
              style={{
                background: active ? 'var(--bg-active)' : 'transparent',
                color: active ? 'var(--text-on-active)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }}
            >
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-[17px] h-[17px]' : 'w-[15px] h-[15px]')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="px-2.5 pb-3 pt-2 space-y-0.5"
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
                'flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
              )}
              style={{
                background: active ? 'var(--bg-active)' : 'transparent',
                color: active ? 'var(--text-on-active)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }}
            >
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-[17px] h-[17px]' : 'w-[15px] h-[15px]')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Erweitern' : 'Einklappen'}
          className={cn(
            'flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 w-full',
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
          )}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          }}
        >
          {collapsed
            ? <PanelLeftOpen className="w-[15px] h-[15px] flex-shrink-0" />
            : <PanelLeftClose className="w-[15px] h-[15px] flex-shrink-0" />
          }
          {!collapsed && <span>Einklappen</span>}
        </button>

        {/* User row */}
        <div
          className={cn(
            'flex items-center gap-2.5 mt-1 pt-2',
            collapsed ? 'justify-center px-1' : 'px-1'
          )}
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
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
                <p className="text-[12px] font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {photographer.full_name?.split(' ')[0] || photographer.email?.split('@')[0]}
                </p>
                <p className="text-[11px] truncate leading-tight" style={{ color: 'var(--text-muted)' }}>
                  {planLabel[plan] || plan}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="transition-colors flex-shrink-0 p-1 rounded-lg"
                style={{ color: 'var(--text-muted)' }}
                title="Abmelden"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
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
