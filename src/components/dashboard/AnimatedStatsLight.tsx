'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, FileText, Images, ArrowUpRight } from 'lucide-react'

interface Stat {
  label: string
  value: number
  icon: React.ElementType
  href: string
  description: string
  accentColor: string
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
          className="relative rounded-2xl p-5 overflow-hidden cursor-pointer transition-all duration-300 group-hover:-translate-y-1"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Top accent line on hover */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl"
            style={{ background: stat.accentColor }}
          />

          {/* Subtle inner glow */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${stat.accentColor}15 0%, transparent 60%)`,
            }}
          />

          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 relative z-10"
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </div>

          {/* Number */}
          <div className="flex items-end gap-1 mb-1 relative z-10">
            <span
              className="font-bold leading-none tabular-nums"
              style={{
                fontSize: '40px',
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
              }}
            >
              {count}
            </span>
          </div>

          {/* Label */}
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-0.5 relative z-10" style={{ color: 'var(--text-muted)' }}>
            {stat.label}
          </p>
          <p className="text-[12px] relative z-10" style={{ color: 'var(--text-muted)' }}>
            {stat.description}
          </p>

          {/* Arrow */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
            <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
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
}

export default function AnimatedStatsLight({ activeClients, pendingContracts, activeGalleries }: Props) {
  const stats: Stat[] = [
    {
      label: 'Aktive Kunden',
      value: activeClients,
      icon: Users,
      href: '/dashboard/clients',
      description: activeClients === 0 ? 'Noch keine Kunden' : `${activeClients} aktiv`,
      accentColor: '#C4A47C',
    },
    {
      label: 'Offene Verträge',
      value: pendingContracts,
      icon: FileText,
      href: '/dashboard/contracts',
      description: pendingContracts === 0 ? 'Alles unterschrieben ✓' : 'Warten auf Signatur',
      accentColor: pendingContracts > 0 ? '#E8A030' : '#C4A47C',
    },
    {
      label: 'Aktive Galerien',
      value: activeGalleries,
      icon: Images,
      href: '/dashboard/galleries',
      description: activeGalleries === 0 ? 'Noch keine Galerien' : 'Galerien online',
      accentColor: '#C4A47C',
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>
    </>
  )
}
