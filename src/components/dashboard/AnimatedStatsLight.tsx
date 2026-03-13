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
  accent: string
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
        animation: `statFadeUp 0.45s ease forwards`,
        animationDelay: `${index * 80}ms`,
        opacity: 0,
      }}
    >
      <Link href={stat.href} className="block">
        <div
          className="relative rounded-2xl p-5 border bg-white overflow-hidden cursor-pointer transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5"
          style={{
            borderColor: '#E8E4DE',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: stat.accent }}
          />

          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
            style={{ background: '#F5F2EE', border: '1px solid #E8E4DE' }}
          >
            <Icon className="w-4 h-4 text-[#8A8480]" />
          </div>

          {/* Number */}
          <div className="flex items-end gap-1 mb-1">
            <span
              className="font-bold leading-none tabular-nums text-[#1A1A1A]"
              style={{ fontSize: '40px', letterSpacing: '-0.04em', fontFamily: 'var(--font-display)' }}
            >
              {count}
            </span>
          </div>

          {/* Label */}
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#B0A99E] mb-0.5">
            {stat.label}
          </p>
          <p className="text-[12px] text-[#C8C4BE]">{stat.description}</p>

          {/* Arrow */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
            <ArrowUpRight className="w-4 h-4 text-[#B0A99E]" />
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
      accent: '#1A1A1A',
    },
    {
      label: 'Offene Verträge',
      value: pendingContracts,
      icon: FileText,
      href: '/dashboard/contracts',
      description: pendingContracts === 0 ? 'Alles unterschrieben ✓' : 'Warten auf Signatur',
      accent: pendingContracts > 0 ? '#E8A030' : '#1A1A1A',
    },
    {
      label: 'Aktive Galerien',
      value: activeGalleries,
      icon: Images,
      href: '/dashboard/galleries',
      description: activeGalleries === 0 ? 'Noch keine Galerien' : 'Galerien online',
      accent: '#1A1A1A',
    },
  ]

  return (
    <>
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(14px); }
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
