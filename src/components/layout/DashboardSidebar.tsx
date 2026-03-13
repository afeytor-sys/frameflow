'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import {
  Camera,
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  Images,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  photographer: Photographer
}

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'clients',   href: '/dashboard/clients',   icon: Users },
  { key: 'projects',  href: '/dashboard/projects',  icon: FolderOpen },
  { key: 'contracts', href: '/dashboard/contracts', icon: FileText },
  { key: 'galleries', href: '/dashboard/galleries', icon: Images },
]

const bottomItems = [
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
  { key: 'billing',  href: '/dashboard/billing',  icon: CreditCard },
]

const planLabels: Record<string, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio',
}

export default function DashboardSidebar({ photographer }: Props) {
  const t = useTranslations('nav')
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

  return (
    <aside
      className={cn(
        'flex flex-col bg-[#111110] transition-all duration-300 ease-in-out relative flex-shrink-0',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-white/[0.06]',
        collapsed ? 'justify-center px-0' : 'px-5 gap-2.5'
      )}>
        <div className="w-7 h-7 bg-[#1E1E1C] rounded-md flex items-center justify-center flex-shrink-0 border border-white/10">
          <Camera className="w-3.5 h-3.5 text-[#C8A882]" />
        </div>
        {!collapsed && (
          <span
            className="text-[#F8F7F4] font-semibold tracking-tight"
            style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '16px', letterSpacing: '-0.02em' }}
          >
            FrameFlow
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[3.25rem] w-6 h-6 bg-[#1E1E1C] border border-white/10 rounded-full flex items-center justify-center text-[#7A7670] hover:text-[#F8F7F4] transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {/* Section label */}
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7A7670]/60">
            Navigation
          </p>
        )}
        {navItems.map(({ key, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? t(key as keyof typeof t) : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150 relative',
                collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5',
                active
                  ? 'bg-[#1E1E1C] text-[#F8F7F4]'
                  : 'text-[#7A7670] hover:text-[#F8F7F4] hover:bg-white/[0.04]'
              )}
            >
              {/* Active left border */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C8A882] rounded-full" />
              )}
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4')} />
              {!collapsed && <span>{t(key as keyof typeof t)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t border-white/[0.06] pt-3 space-y-0.5">
        {bottomItems.map(({ key, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? t(key as keyof typeof t) : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150 relative',
                collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5',
                active
                  ? 'bg-[#1E1E1C] text-[#F8F7F4]'
                  : 'text-[#7A7670] hover:text-[#F8F7F4] hover:bg-white/[0.04]'
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C8A882] rounded-full" />
              )}
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4')} />
              {!collapsed && <span>{t(key as keyof typeof t)}</span>}
            </Link>
          )
        })}

        {/* User row */}
        <div className={cn(
          'flex items-center gap-2.5 mt-2 pt-2 border-t border-white/[0.06]',
          collapsed ? 'justify-center px-1' : 'px-2'
        )}>
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#C8A882]/20 flex items-center justify-center flex-shrink-0 border border-[#C8A882]/20">
            <span className="text-[#C8A882] text-[11px] font-semibold">
              {(photographer.full_name || photographer.email || 'U')[0].toUpperCase()}
            </span>
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[#F8F7F4] text-[12px] font-medium truncate leading-tight">
                  {photographer.full_name || photographer.email}
                </p>
                <p className="text-[#7A7670] text-[11px] truncate leading-tight mt-0.5">
                  {planLabels[photographer.plan] || 'Free'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-[#7A7670] hover:text-[#F8F7F4] transition-colors flex-shrink-0"
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
