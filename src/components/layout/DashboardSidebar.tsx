'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { Logo } from '@/components/ui/Logo'
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
  BarChart2,
  ClipboardList,
  Mail,
  Shield,
  Zap,
  Inbox,
  FormInput,
  Calculator,
  CalendarDays,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/useLocale'
import { dashboardT } from '@/lib/dashboardTranslations'

interface Props {
  photographer: Photographer
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const planLabel: Record<string, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio',
}

const planColors: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(100,116,139,0.10)', color: '#64748B' },
  starter: { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C' },
  pro:     { bg: 'rgba(59,130,246,0.10)',  color: '#3B82F6' },
  studio:  { bg: 'rgba(139,92,246,0.10)',  color: '#8B5CF6' },
}

export default function DashboardSidebar({ photographer, mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const locale = useLocale()
  const t = dashboardT(locale)
  const s = t.sidebar

  // ESC key closes mobile drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onMobileClose])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const navItems = [
    { key: 'dashboard',      href: '/dashboard',              icon: LayoutDashboard, label: s.dashboard,      plans: null,             activeColor: '#C4A47C', activeBg: 'rgba(196,164,124,0.15)' },
    { key: 'clients',        href: '/dashboard/clients',      icon: Users,           label: s.clients,        plans: null,             activeColor: '#3B82F6', activeBg: 'rgba(59,130,246,0.12)' },
    { key: 'projects',       href: '/dashboard/projects',     icon: FolderOpen,      label: locale === 'de' ? 'Projekte' : 'Projects', plans: null, activeColor: '#F59E0B', activeBg: 'rgba(245,158,11,0.12)' },
    { key: 'inbox',          href: '/dashboard/inbox',        icon: Inbox,           label: 'Inbox',          plans: null,             activeColor: '#10B981', activeBg: 'rgba(16,185,129,0.12)' },
    { key: 'booking-types',  href: '/dashboard/booking-types', icon: CalendarDays,  label: locale === 'de' ? 'Buchungstypen' : 'Booking Types', plans: null, activeColor: '#6366F1', activeBg: 'rgba(99,102,241,0.12)' },
    { key: 'forms',          href: '/dashboard/forms',        icon: FormInput,       label: locale === 'de' ? 'Formulare' : 'Forms',   plans: null, activeColor: '#06B6D4', activeBg: 'rgba(6,182,212,0.12)' },
    { key: 'contracts',      href: '/dashboard/contracts',    icon: FileText,        label: s.contracts,      plans: null,             activeColor: '#8B5CF6', activeBg: 'rgba(139,92,246,0.12)' },
    { key: 'galleries',      href: '/dashboard/galleries',    icon: Images,          label: s.galleries,      plans: null,             activeColor: '#10B981', activeBg: 'rgba(16,185,129,0.12)' },
    { key: 'invoices',       href: '/dashboard/invoices',     icon: Receipt,         label: s.invoices,       plans: null,             activeColor: '#F97316', activeBg: 'rgba(249,115,22,0.12)' },
    { key: 'quotes',         href: '/dashboard/quotes',       icon: Calculator,      label: locale === 'de' ? 'Angebote' : 'Quotes',   plans: null, activeColor: '#C4A47C', activeBg: 'rgba(196,164,124,0.15)' },
    { key: 'questionnaires', href: '/dashboard/questionnaires', icon: ClipboardList, label: s.questionnaires, plans: null,             activeColor: '#6366F1', activeBg: 'rgba(99,102,241,0.12)' },
    { key: 'email-vorlagen', href: '/dashboard/email-vorlagen', icon: Mail,          label: s.emailTemplates, plans: null,             activeColor: '#F97316', activeBg: 'rgba(249,115,22,0.12)' },
    { key: 'automations',    href: '/dashboard/automations',  icon: Zap,             label: locale === 'de' ? 'Automationen' : 'Automations', plans: null, activeColor: '#C4A47C', activeBg: 'rgba(196,164,124,0.15)' },
    { key: 'analytics',      href: '/dashboard/analytics',    icon: BarChart2,       label: s.analytics,      plans: ['pro', 'studio'], activeColor: '#06B6D4', activeBg: 'rgba(6,182,212,0.12)' },
    ...(photographer.id === '3f3a14b9-3bb2-40fa-b0eb-5fea92f67429' ? [
      { key: 'admin', href: '/dashboard/admin', icon: Shield, label: 'Admin', plans: null as null, activeColor: '#6366F1', activeBg: 'rgba(99,102,241,0.12)' },
    ] : []),
  ]

  const bottomItems = [
    { key: 'settings', href: '/dashboard/settings', icon: Settings,   label: s.settings },
    { key: 'billing',  href: '/dashboard/billing',  icon: CreditCard, label: s.billing },
  ]

  const collapseLabel = locale === 'de' ? 'Einklappen' : 'Collapse'
  const signOutLabel  = locale === 'de' ? 'Abmelden'   : 'Sign out'
  const expandLabel   = locale === 'de' ? 'Ausklappen'  : 'Expand'

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

  // On mobile, always show labels; on desktop, respect collapsed state
  const showLabel = !collapsed || mobileOpen

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[60px] flex-shrink-0',
          !isMobile && collapsed ? 'justify-center' : 'px-5 gap-3',
        )}
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <Logo className="w-7 h-7 flex-shrink-0 rounded-lg object-cover" />
        {(isMobile || !collapsed) && (
          <span
            className="font-black text-[17px] tracking-tight leading-none flex-1"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}
          >
            Fotonizer
          </span>
        )}
        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {(!isMobile ? !collapsed : true) && (
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Navigation
          </p>
        )}
        {navItems.map(({ key, href, icon: Icon, label, plans, activeColor, activeBg }) => {
          if (plans && !plans.includes(plan)) return null
          const active = isActive(href)
          const isCollapsedDesktop = !isMobile && collapsed
          return (
            <Link
              key={key}
              href={href}
              title={isCollapsedDesktop ? label : undefined}
              onClick={isMobile ? onMobileClose : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150 relative group',
                isCollapsedDesktop ? 'justify-center p-3' : 'px-3 py-2.5',
              )}
              style={active ? {
                background: activeBg,
                color: activeColor,
                fontWeight: 700,
              } : {
                color: 'var(--sidebar-text)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = activeBg
                  e.currentTarget.style.color = activeColor
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--sidebar-text)'
                }
              }}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-150',
                  active ? 'w-7 h-7' : 'w-5 h-5',
                )}
                style={active ? { background: activeColor + '20' } : {}}
              >
                <Icon
                  className={cn('flex-shrink-0', active ? 'w-[15px] h-[15px]' : 'w-[16px] h-[16px]')}
                  style={{ color: active ? activeColor : 'inherit' }}
                />
              </div>
              {(isMobile || !collapsed) && <span className="truncate">{label}</span>}

              {active && (isMobile || !collapsed) && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: activeColor }}
                />
              )}
              {active && !isMobile && collapsed && (
                <span
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
                  style={{ background: activeColor }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="px-3 pb-4 pt-3 space-y-0.5"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        {bottomItems.map(({ key, href, icon: Icon, label }) => {
          const active = isActive(href)
          const isCollapsedDesktop = !isMobile && collapsed
          return (
            <Link
              key={key}
              href={href}
              title={isCollapsedDesktop ? label : undefined}
              onClick={isMobile ? onMobileClose : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                isCollapsedDesktop ? 'justify-center p-3' : 'px-3 py-2.5',
                active ? 'sidebar-nav-active' : 'sidebar-nav-inactive',
              )}
            >
              <Icon className={cn('flex-shrink-0', isCollapsedDesktop ? 'w-[18px] h-[18px]' : 'w-[16px] h-[16px]')} />
              {(isMobile || !collapsed) && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? expandLabel : collapseLabel}
            className={cn(
              'sidebar-nav-item sidebar-nav-inactive flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-150 w-full',
              collapsed ? 'justify-center p-3' : 'px-3 py-2.5'
            )}
          >
            {collapsed
              ? <PanelLeftOpen className="w-[16px] h-[16px] flex-shrink-0" />
              : <PanelLeftClose className="w-[16px] h-[16px] flex-shrink-0" />
            }
            {!collapsed && <span>{collapseLabel}</span>}
          </button>
        )}

        {/* User row */}
        <div
          className={cn(
            'flex items-center gap-2.5 mt-2 pt-3',
            !isMobile && collapsed ? 'justify-center px-1' : 'px-1'
          )}
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
            style={{ background: 'var(--bg-active)', color: 'var(--text-on-active)' }}
          >
            {initials}
          </div>

          {(isMobile || !collapsed) && (
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
                title={signOutLabel}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0 select-none glass-sidebar',
          collapsed ? 'w-[64px]' : 'w-[232px]'
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile backdrop ────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onMobileClose}
      />

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden flex flex-col select-none glass-sidebar',
          'w-[80vw] max-w-[300px]',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent(true)}
      </aside>
    </>
  )
}
