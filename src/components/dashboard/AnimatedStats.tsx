'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, FileText, Images, ArrowUpRight } from 'lucide-react'

interface Stat {
  label: string
  value: number
  icon: React.ElementType
  color: string
  glow: string
  href: string
  suffix?: string
  description: string
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
        // Ease out cubic
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
  const { count, ref } = useCountUp(stat.value, 1400, index * 120)
  const Icon = stat.icon

  return (
    <div
      ref={ref}
      className="relative group"
      style={{
        animation: `slideUpFade 0.5s ease forwards`,
        animationDelay: `${index * 80}ms`,
        opacity: 0,
      }}
    >
      <Link href={stat.href} className="block">
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{ background: `radial-gradient(ellipse at center, ${stat.glow} 0%, transparent 70%)` }}
        />

        {/* Card */}
        <div
          className="relative rounded-2xl p-5 border overflow-hidden cursor-pointer transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #141413 0%, #0D0D0C 100%)',
            borderColor: `${stat.color}20`,
            boxShadow: `0 1px 0 0 ${stat.color}10 inset, 0 4px 24px rgba(0,0,0,0.3)`,
          }}
        >
          {/* Top shimmer line */}
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)` }}
          />

          {/* Background pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${stat.color} 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }} />

          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}
          >
            <Icon className="w-4 h-4" style={{ color: stat.color }} />
          </div>

          {/* Number */}
          <div className="flex items-end gap-1 mb-1">
            <span
              className="font-display font-bold leading-none tabular-nums"
              style={{ fontSize: '42px', letterSpacing: '-0.04em', color: stat.value > 0 ? stat.color : '#3A3A38' }}
            >
              {count}
            </span>
            {stat.suffix && (
              <span className="text-[#6E6A63] text-[14px] mb-1.5">{stat.suffix}</span>
            )}
          </div>

          {/* Label */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A4A48] mb-1">
            {stat.label}
          </p>
          <p className="text-[12px] text-[#3A3A38]">{stat.description}</p>

          {/* Arrow */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
            <ArrowUpRight className="w-4 h-4" style={{ color: stat.color }} />
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

export default function AnimatedStats({ activeClients, pendingContracts, activeGalleries }: Props) {
  const stats: Stat[] = [
    {
      label: 'Aktive Kunden',
      value: activeClients,
      icon: Users,
      color: '#C4A47C',
      glow: 'rgba(196,164,124,0.15)',
      href: '/dashboard/clients',
      description: activeClients === 0 ? 'Noch keine Kunden' : `${activeClients} aktiv`,
    },
    {
      label: 'Open contracts',
      value: pendingContracts,
      icon: FileText,
      color: pendingContracts > 0 ? '#E8A030' : '#4A4A48',
      glow: pendingContracts > 0 ? 'rgba(232,160,48,0.12)' : 'transparent',
      href: '/dashboard/contracts',
      description: pendingContracts === 0 ? 'Alles unterschrieben' : 'Warten auf Signatur',
    },
    {
      label: 'Aktive Galerien',
      value: activeGalleries,
      icon: Images,
      color: '#7EB8A0',
      glow: 'rgba(126,184,160,0.12)',
      href: '/dashboard/galleries',
      description: activeGalleries === 0 ? 'Noch keine Galerien' : 'Galerien online',
    },
  ]

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
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
