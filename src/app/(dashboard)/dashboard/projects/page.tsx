'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { FolderOpen, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
  status: string
  shoot_date: string | null
  client: { full_name: string } | { full_name: string }[] | null
}

const statusColors: Record<string, { bg: string; color: string }> = {
  draft:     { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
  active:    { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
  delivered: { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
  completed: { bg: 'rgba(107,114,128,0.08)', color: '#6B7280' },
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf', active: 'Aktiv', delivered: 'Geliefert', completed: 'Abgeschlossen',
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
            <div className="h-7 w-32 rounded-lg shimmer mb-1" />
            <div className="h-4 w-24 rounded shimmer" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Projekte</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{projects.length} Projekte insgesamt</p>
        </div>
        <Link href="/dashboard/projects/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--text-primary)' }}>
          <Plus className="w-3.5 h-3.5" />
          Neues Projekt
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const sc = statusColors[project.status] || statusColors.draft
            const client = project.client
            const clientName = Array.isArray(client) ? client[0]?.full_name : client?.full_name
            return (
              <div key={project.id} className="relative group">
                <Link href={`/dashboard/projects/${project.id}`}
                  className="rounded-xl p-5 transition-all block"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,164,124,0.3)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: sc.bg, color: sc.color }}>
                      {statusLabels[project.status] || project.status}
                    </span>
                    {/* Spacer for delete button */}
                    <div className="w-7 h-7" />
                  </div>
                  <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {clientName && <span>{clientName}</span>}
                    {project.shoot_date && (
                      <span>{clientName ? ' · ' : ''}{formatDate(project.shoot_date, 'de')}</span>
                    )}
                  </p>
                </Link>

                {/* Delete button — absolute positioned over the card */}
                <button
                  onClick={(e) => deleteProject(e, project.id, project.title)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                  style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.20)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.10)')}
                  title="Projekt löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-hover)' }}>
            <FolderOpen className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Projekte</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Erstelle dein erstes Projekt</p>
          <Link href="/dashboard/projects/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--text-primary)' }}>
            <Plus className="w-3.5 h-3.5" />
            Erstes Projekt erstellen
          </Link>
        </div>
      )}
    </div>
  )
}
