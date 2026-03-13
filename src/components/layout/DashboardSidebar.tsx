'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  { key: 'settings', href: '/dashboard/settings', icon: Settings,    label: 'Einstellungen' },
  { key: 'billing',  href: '/dashboard/billing',  icon: CreditCard,  label: 'Abonnement' },
]

const planColors: Record<string, string> = {
  free:    '#A8A49E',
  starter: '#C4A47C',
  pro:     '#2A9B68',
  studio:  '#7C6FCD',
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
        'flex flex-col bg-[#0D0D0C] transition-all duration-300 ease-in-out relative flex-shrink-0 select-none',
        collapsed ? 'w-[56px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-[52px] border-b border-white/[0.05] flex-shrink-0',
        collapsed ? 'justify-center' : 'px-4 gap-2.5'
      )}>
        {/* Logo mark */}
        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="#C4A47C" fillOpacity="0.15"/>
            <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="font-display text-[#F7F6F3] font-semibold text-[17px] tracking-tight leading-none">
            FrameFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/20">
            Menü
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
                'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative group',
                collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
                active
                  ? 'bg-white/[0.08] text-[#F7F6F3]'
                  : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#C4A47C] rounded-r-full" />
              )}
              <Icon className={cn(
                'flex-shrink-0 transition-colors',
                collapsed ? 'w-[17px] h-[17px]' : 'w-[15px] h-[15px]',
                active ? 'text-[#C4A47C]' : ''
              )} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 border-t border-white/[0.05] pt-2 space-y-0.5">
        {bottomItems.map(({ key, href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative',
                collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
                active
                  ? 'bg-white/[0.08] text-[#F7F6F3]'
                  : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#C4A47C] rounded-r-full" />
              )}
              <Icon className={cn(
                'flex-shrink-0',
                collapsed ? 'w-[17px] h-[17px]' : 'w-[15px] h-[15px]',
                active ? 'text-[#C4A47C]' : ''
              )} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Erweitern' : 'Einklappen'}
          className={cn(
            'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full text-white/25 hover:text-white/50 hover:bg-white/[0.04]',
            collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2'
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="w-[15px] h-[15px] flex-shrink-0" />
            : <PanelLeftClose className="w-[15px] h-[15px] flex-shrink-0" />
          }
          {!collapsed && <span>Einklappen</span>}
        </button>

        {/* User row */}
        <div className={cn(
          'flex items-center gap-2 mt-1 pt-2 border-t border-white/[0.05]',
          collapsed ? 'justify-center px-1' : 'px-1'
        )}>
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
            style={{ background: `${planColors[plan]}22`, color: planColors[plan], border: `1px solid ${planColors[plan]}33` }}
          >
            {initials}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[#F7F6F3] text-[12px] font-medium truncate leading-tight">
                  {photographer.full_name?.split(' ')[0] || photographer.email?.split('@')[0]}
                </p>
                <p className="text-[11px] truncate leading-tight capitalize" style={{ color: planColors[plan] }}>
                  {plan}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0 p-1 rounded"
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
