'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { FolderOpen, Plus, Trash2, Calendar, User, ArrowUpRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
  status: string
  shoot_date: string | null
  client: { full_name: string } | { full_name: string }[] | null
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.12)', color: '#64748B', dot: '#94A3B8', label: 'Entwurf' },
  inquiry:   { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', dot: '#3B82F6', label: 'Anfrage' },
  active:    { bg: 'rgba(61,186,111,0.12)',  color: '#3DBA6F', dot: '#3DBA6F', label: 'Aktiv' },
  shooting:  { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C', dot: '#C4A47C', label: 'Shooting' },
  editing:   { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', dot: '#8B5CF6', label: 'Bearbeitung' },
  delivered: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', dot: '#10B981', label: 'Geliefert' },
  completed: { bg: 'rgba(100,116,139,0.10)', color: '#64748B', dot: '#94A3B8', label: 'Abgeschlossen' },
  cancelled: { bg: 'rgba(196,59,44,0.10)',   color: '#C43B2C', dot: '#C43B2C', label: 'Storniert' },
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('projects')
        .select('id, title, status, shoot_date, client:clients(full_name)')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false })
      setProjects((data as Project[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const deleteProject = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Projekt "${title}" wirklich löschen? Alle zugehörigen Daten werden gelöscht.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) { toast.error('Fehler beim Löschen'); return }
    setProjects(prev => prev.filter(p => p.id !== id))
    toast.success('Projekt gelöscht')
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 rounded-lg shimmer mb-2" />
            <div className="h-4 w-48 rounded shimmer" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            Projekte
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} · Verwalte deine Shootings und Aufträge
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{ background: '#F59E0B', boxShadow: '0 1px 8px rgba(245,158,11,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          Neues Projekt
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, index) => {
            const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft
            const client = project.client
            const clientName = Array.isArray(client) ? client[0]?.full_name : client?.full_name

            return (
              <div
                key={project.id}
                className="relative group"
                style={{
                  animation: 'statFadeUp 0.45s ease forwards',
                  animationDelay: `${index * 60}ms`,
                  opacity: 0,
                }}
              >
                <style>{`
                  @keyframes statFadeUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>

                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="block rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${sc.color}20 0%, ${sc.color}08 100%)`,
                    border: `1px solid ${sc.color}35`,
                    boxShadow: `0 2px 16px ${sc.color}18`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.transform = 'translateY(-4px)'
                    el.style.boxShadow = `0 12px 32px ${sc.color}22`
                    el.style.borderColor = sc.color + '40'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.transform = 'translateY(0)'
                    el.style.boxShadow = `0 2px 12px ${sc.color}10`
                    el.style.borderColor = sc.color + '20'
                  }}
                >
                  {/* Color accent top bar */}
                  <div
                    className="h-[3px] w-full"
                    style={{ background: sc.color, opacity: 0.7 }}
                  />

                  <div className="p-5">
                    {/* Icon + Status row */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: sc.color + '15', border: `1px solid ${sc.color}25` }}
                      >
                        <FolderOpen className="w-5 h-5" style={{ color: sc.color }} />
                      </div>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                        style={{ background: sc.color + '12' }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" style={{ color: sc.color }} />
                      </div>
                    </div>

                    {/* Title — big like stat number */}
                    <h3
                      className="font-black leading-tight mb-2"
                      style={{
                        fontSize: '22px',
                        letterSpacing: '-0.03em',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {project.title}
                    </h3>

                    {/* Status badge */}
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                      {sc.label}
                    </span>

                    {/* Meta */}
                    <div className="space-y-1.5 mt-1">
                      {clientName && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-[12.5px] truncate" style={{ color: 'var(--text-muted)' }}>{clientName}</span>
                        </div>
                      )}
                      {project.shoot_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{formatDate(project.shoot_date, 'de')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Delete button — bottom right, inside card, on hover */}
                <button
                  onClick={(e) => deleteProject(e, project.id, project.title)}
                  className="absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                  style={{ background: 'rgba(196,59,44,0.12)', color: '#C43B2C' }}
                  title="Projekt löschen"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,59,44,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(196,59,44,0.12)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <FolderOpen className="w-7 h-7" style={{ color: '#F59E0B' }} />
          </div>
          <h3
            className="font-black mb-2"
            style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Noch keine Projekte
          </h3>
          <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Erstelle dein erstes Projekt und verwalte Vertrag, Galerie und Rechnung an einem Ort
          </p>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
            style={{ background: '#F59E0B', boxShadow: '0 1px 8px rgba(245,158,11,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            Erstes Projekt erstellen
          </Link>
        </div>
      )}
    </div>
  )
}
