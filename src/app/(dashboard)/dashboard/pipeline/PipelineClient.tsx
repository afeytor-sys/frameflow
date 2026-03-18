'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, User, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
  status: string
  shoot_date: string | null
  shooting_type: string | null
  client: { full_name: string } | { full_name: string }[] | null
}

interface Props {
  projects: Project[]
}

const COLUMNS_DE = [
  { id: 'inquiry', label: 'Anfrage', color: '#6B6B6B', bg: 'rgba(107,107,107,0.08)' },
  { id: 'booked', label: 'Gebucht', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { id: 'shooting', label: 'Shooting', color: '#C8A882', bg: 'rgba(200,168,130,0.08)' },
  { id: 'editing', label: 'Bearbeitung', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { id: 'delivered', label: 'Geliefert', color: '#3DBA6F', bg: 'rgba(61,186,111,0.08)' },
  { id: 'archived', label: 'Archiviert', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
]

const COLUMNS_EN = [
  { id: 'inquiry', label: 'Inquiry', color: '#6B6B6B', bg: 'rgba(107,107,107,0.08)' },
  { id: 'booked', label: 'Booked', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { id: 'shooting', label: 'Shooting', color: '#C8A882', bg: 'rgba(200,168,130,0.08)' },
  { id: 'editing', label: 'Editing', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { id: 'delivered', label: 'Delivered', color: '#3DBA6F', bg: 'rgba(61,186,111,0.08)' },
  { id: 'archived', label: 'Archived', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
]

export default function PipelineClient({ projects: initialProjects }: Props) {
  const locale = useLocale()
  const isDE = locale === 'de'
  const COLUMNS = isDE ? COLUMNS_DE : COLUMNS_EN
  const [projects, setProjects] = useState(initialProjects)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const supabase = createClient()

  const getClientName = (client: Project['client']) => {
    if (!client) return '—'
    const c = Array.isArray(client) ? client[0] : client
    return c?.full_name || '—'
  }

  const getProjectsByStatus = (status: string) =>
    projects.filter(p => (p.status || 'inquiry') === status)

  const handleDragStart = (projectId: string) => setDragging(projectId)
  const handleDragEnd = () => { setDragging(null); setDragOver(null) }
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOver(colId)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (!dragging) return
    const project = projects.find(p => p.id === dragging)
    if (!project || project.status === newStatus) { setDragging(null); setDragOver(null); return }

    setProjects(prev => prev.map(p => p.id === dragging ? { ...p, status: newStatus } : p))
    setDragging(null)
    setDragOver(null)

    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', dragging)

    if (error) {
      toast.error(isDE ? 'Fehler beim Speichern' : 'Failed to save')
      setProjects(prev => prev.map(p => p.id === dragging ? { ...p, status: project.status } : p))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isDE ? 'Pipeline' : 'Pipeline'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {isDE ? 'Projekte nach Status verwalten — ziehen zum Verschieben' : 'Manage projects by status — drag to move'}
        </p>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1" style={{ minHeight: 0 }}>
        {COLUMNS.map(col => {
          const colProjects = getProjectsByStatus(col.id)
          const isOver = dragOver === col.id

          return (
            <div
              key={col.id}
              className="flex-shrink-0 flex flex-col rounded-2xl transition-all"
              style={{
                width: '280px',
                background: isOver ? col.bg : 'var(--bg-surface)',
                border: `1px solid ${isOver ? col.color + '40' : 'var(--border-color)'}`,
                transition: 'all 0.15s ease',
              }}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</span>
                </div>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: col.bg, color: col.color }}>
                  {colProjects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
                {colProjects.map(project => (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={() => handleDragStart(project.id)}
                    onDragEnd={handleDragEnd}
                    className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all group"
                    style={{
                      background: dragging === project.id ? 'var(--bg-hover)' : 'var(--bg-base)',
                      border: '1px solid var(--border-color)',
                      opacity: dragging === project.id ? 0.5 : 1,
                      boxShadow: dragging === project.id ? 'var(--card-shadow-hover)' : 'none',
                    }}
                  >
                    <p className="text-[12px] font-semibold leading-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      {project.title}
                    </p>

                    {project.client && (
                      <div className="flex items-center gap-1 mb-1">
                        <User className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {getClientName(project.client)}
                        </span>
                      </div>
                    )}

                    {project.shoot_date && (
                      <div className="flex items-center gap-1 mb-2">
                        <Calendar className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(project.shoot_date).toLocaleDateString(isDE ? 'de-DE' : 'en-US', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}

                    {project.shooting_type && (
                      <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        {project.shooting_type}
                      </span>
                    )}

                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center gap-0.5 mt-2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--accent)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <ArrowRight className="w-2.5 h-2.5" />
                      {isDE ? 'Öffnen' : 'Open'}
                    </Link>
                  </div>
                ))}

                {colProjects.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                      {isDE ? 'Keine Projekte' : 'No projects'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
