'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, FileText, Images, ArrowUpRight, CalendarDays } from 'lucide-react'

interface Stat {
  label: string
  value: number
  icon: React.ElementType
  href: string
  description: string
  accentColor: string
  accentBg: string
  gradient: string
}

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || target === 0) return
    const timer = setTimeout(() => {
      const startTime = performance.now()
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timer)
  }, [started, target, duration, delay])

  return { count, ref }
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const { count, ref } = useCountUp(stat.value, 1200, index * 100)
  const Icon = stat.icon

  return (
    <div
      ref={ref}
      className="relative group"
      style={{
        animation: `statFadeUp 0.5s ease forwards`,
        animationDelay: `${index * 90}ms`,
        opacity: 0,
      }}
    >
      <Link href={stat.href} className="block">
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
          style={{
            background: 'var(--card-bg)',
            border: `1px solid ${stat.accentColor}20`,
            boxShadow: `0 2px 12px ${stat.accentColor}12`,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.transform = 'translateY(-4px)'
            el.style.boxShadow = `0 12px 32px ${stat.accentColor}22`
            el.style.borderColor = stat.accentColor + '40'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.transform = 'translateY(0)'
            el.style.boxShadow = `0 2px 12px ${stat.accentColor}12`
            el.style.borderColor = stat.accentColor + '20'
          }}
        >
          {/* Subtle top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{ background: stat.accentColor, opacity: 0.7 }}
          />

          {/* Very subtle background tint */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: stat.gradient, opacity: 0.5 }}
          />

          <div className="relative z-10 p-6">
            {/* Icon + Arrow row */}
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ background: stat.accentColor + '15', border: `1px solid ${stat.accentColor}25` }}
              >
                <Icon className="w-5 h-5" style={{ color: stat.accentColor }} />
              </div>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                style={{ background: stat.accentColor + '12' }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: stat.accentColor }} />
              </div>
            </div>

            {/* Big number */}
            <div className="mb-1">
              <span
                className="font-black tabular-nums leading-none"
                style={{
                  fontSize: '42px',
                  letterSpacing: '-0.05em',
                  color: stat.accentColor,
                }}
              >
                {count}
              </span>
            </div>

            {/* Label */}
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: stat.accentColor + '99' }}>
              {stat.label}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {stat.description}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}

interface Props {
  activeClients: number
  pendingContracts: number
  activeGalleries: number
  upcomingBookings: number
}

export default function AnimatedStatsLight({ activeClients, pendingContracts, activeGalleries, upcomingBookings }: Props) {
  const stats: Stat[] = [
    {
      label: 'Aktive Kunden',
      value: activeClients,
      icon: Users,
      href: '/dashboard/clients',
      description: activeClients === 0 ? 'Noch keine Kunden' : `${activeClients} aktiv`,
      accentColor: '#3B82F6',
      accentBg: 'rgba(59,130,246,0.08)',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.03) 100%)',
    },
    {
      label: 'Open contracts',
      value: pendingContracts,
      icon: FileText,
      href: '/dashboard/contracts',
      description: pendingContracts === 0 ? 'Alles unterschrieben ✓' : 'Warten auf Signatur',
      accentColor: pendingContracts > 0 ? '#F59E0B' : '#10B981',
      accentBg: pendingContracts > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
      gradient: pendingContracts > 0
        ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)'
        : 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)',
    },
    {
      label: 'Aktive Galerien',
      value: activeGalleries,
      icon: Images,
      href: '/dashboard/galleries',
      description: activeGalleries === 0 ? 'Noch keine Galerien' : 'Galerien online',
      accentColor: '#10B981',
      accentBg: 'rgba(16,185,129,0.08)',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)',
    },
    {
      label: 'Upcoming Shootings',
      value: upcomingBookings,
      icon: CalendarDays,
      href: '/dashboard/bookings',
      description: upcomingBookings === 0 ? 'Keine geplant' : `${upcomingBookings} bevorstehend`,
      accentColor: '#EC4899',
      accentBg: 'rgba(236,72,153,0.08)',
      gradient: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(236,72,153,0.03) 100%)',
    },
  ]

  return (
    <>
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>
    </>
  )
}
