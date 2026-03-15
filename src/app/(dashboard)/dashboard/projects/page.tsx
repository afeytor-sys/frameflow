'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { FolderOpen, Plus, Trash2, Calendar, User, ArrowUpRight, LayoutGrid, List, GripVertical, Camera, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
  status: string
  shoot_date: string | null
  shooting_type: string | null
  sort_order: number
  client: { full_name: string } | { full_name: string }[] | null
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.10)', color: '#64748B', dot: '#94A3B8', label: 'Entwurf' },
  inquiry:   { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', dot: '#3B82F6', label: 'Anfrage' },
  booked:    { bg: 'rgba(61,186,111,0.12)',  color: '#3DBA6F', dot: '#3DBA6F', label: 'Gebucht' },
  active:    { bg: 'rgba(61,186,111,0.12)',  color: '#3DBA6F', dot: '#3DBA6F', label: 'Aktiv' },
  shooting:  { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C', dot: '#C4A47C', label: 'Shooting' },
  editing:   { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', dot: '#8B5CF6', label: 'Bearbeitung' },
  delivered: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', dot: '#10B981', label: 'Geliefert' },
  completed: { bg: 'rgba(100,116,139,0.10)', color: '#64748B', dot: '#94A3B8', label: 'Abgeschlossen' },
  cancelled: { bg: 'rgba(196,59,44,0.10)',   color: '#C43B2C', dot: '#C43B2C', label: 'Storniert' },
}

const SHOOTING_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Hochzeit:    { label: 'Hochzeit',    color: '#E879A0', bg: 'rgba(232,121,160,0.10)' },
  Portrait:    { label: 'Portrait',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  Event:       { label: 'Event',       color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  Commercial:  { label: 'Commercial',  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  Immobilien:  { label: 'Immobilien',  color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  'Fine Art':  { label: 'Fine Art',    color: '#C4A47C', bg: 'rgba(196,164,124,0.10)' },
  Sport:       { label: 'Sport',       color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  Newborn:     { label: 'Newborn',     color: '#F97316', bg: 'rgba(249,115,22,0.10)' },
  Familie:     { label: 'Familie',     color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
}

function getClientName(client: Project['client']): string | null {
  if (!client) return null
  if (Array.isArray(client)) return client[0]?.full_name || null
  return client.full_name || null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('projects_view') as 'grid' | 'list') || 'grid'
    }
    return 'grid'
  })

  // Status dropdown
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null)

  const updateStatus = async (e: React.MouseEvent, projectId: string, newStatus: string) => {
    e.preventDefault()
    e.stopPropagation()
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
    if (error) { toast.error('Fehler beim Aktualisieren'); return }
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    setOpenStatusMenu(null)
    toast.success(`Status: ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
  }

  // Drag & drop state
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('projects')
        .select('id, title, status, shoot_date, shooting_type, sort_order, client:clients(full_name)')
        .eq('photographer_id', user.id)
        .order('sort_order', { ascending: true })
      setProjects((data as Project[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const setView = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('projects_view', mode)
  }

  const deleteProject = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Projekt "${title}" wirklich löschen? Alle zugehörigen Daten werden gelöscht.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) { toast.error('Fehler beim Löschen'); return }
    setProjects(prev => prev.filter(p => p.id !== id))
    toast.success('Projekt gelöscht')
  }

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number, id: string) => {
    dragIndex.current = index
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIndex.current = index
    setDragOver(id)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const fromIndex = dragIndex.current
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragging(null)
      setDragOver(null)
      return
    }

    const reordered = [...projects]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)

    // Assign new sort_order values
    const updated = reordered.map((p, i) => ({ ...p, sort_order: i + 1 }))
    setProjects(updated)
    setDragging(null)
    setDragOver(null)
    dragIndex.current = null
    dragOverIndex.current = null

    // Persist to DB
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updates = updated.map(p =>
      supabase.from('projects').update({ sort_order: p.sort_order }).eq('id', p.id).eq('photographer_id', user.id)
    )
    await Promise.all(updates)
  }

  const handleDragEnd = () => {
    setDragging(null)
    setDragOver(null)
    dragIndex.current = null
    dragOverIndex.current = null
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in">
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .drag-over-top { border-top: 2px solid var(--accent) !important; }
        .drag-over-left { outline: 2px solid var(--accent) !important; outline-offset: 2px; }
      `}</style>

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

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
            <button
              onClick={() => setView('grid')}
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{
                background: viewMode === 'grid' ? 'var(--text-primary)' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
              }}
              title="Karten-Ansicht"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{
                background: viewMode === 'list' ? 'var(--text-primary)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
              }}
              title="Listen-Ansicht"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98]"
            style={{ background: '#F59E0B', boxShadow: '0 1px 8px rgba(245,158,11,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            Neues Projekt
          </Link>
        </div>
      </div>

      {projects.length > 0 ? (
        <>
          {/* ── GRID VIEW ── */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {projects.map((project, index) => {
                const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft
                const stc = project.shooting_type ? SHOOTING_TYPE_CONFIG[project.shooting_type] : null
                const clientName = getClientName(project.client)
                const isDragging = dragging === project.id
                const isOver = dragOver === project.id

                return (
                  <div
                    key={project.id}
                    className="relative group"
                    draggable
                    onDragStart={e => handleDragStart(e, index, project.id)}
                    onDragOver={e => handleDragOver(e, index, project.id)}
                    onDrop={e => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      animation: 'statFadeUp 0.5s ease forwards',
                      animationDelay: `${index * 60}ms`,
                      opacity: isDragging ? 0.4 : 0,
                      transition: 'opacity 0.2s',
                      outline: isOver ? `2px solid var(--accent)` : 'none',
                      outlineOffset: '2px',
                      borderRadius: '16px',
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="block rounded-2xl overflow-hidden transition-all duration-300"
                      style={{
                        background: 'var(--card-bg)',
                        border: `1px solid ${sc.color}20`,
                        boxShadow: `0 2px 12px ${sc.color}12`,
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
                        el.style.boxShadow = `0 2px 12px ${sc.color}12`
                        el.style.borderColor = sc.color + '20'
                      }}
                    >
                      {/* Top accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: sc.color, opacity: 0.7 }} />
                      {/* Subtle gradient tint */}
                      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `linear-gradient(135deg, ${sc.color}12 0%, ${sc.color}03 100%)`, opacity: 0.5 }} />

                      <div className="relative z-10" style={{ padding: '24px' }}>
                        {/* Icon + Arrow row */}
                        <div className="flex items-start justify-between" style={{ marginBottom: '12px' }}>
                          <div
                            style={{
                              width: '40px', height: '40px', borderRadius: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: sc.color + '15', border: `1px solid ${sc.color}25`,
                              flexShrink: 0, transition: 'transform 0.2s',
                            }}
                            className="group-hover:scale-110"
                          >
                            <FolderOpen style={{ width: '20px', height: '20px', color: sc.color }} />
                          </div>
                          <div
                            style={{
                              width: '28px', height: '28px', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: sc.color + '12', opacity: 0, transition: 'opacity 0.2s',
                            }}
                            className="group-hover:opacity-100"
                          >
                            <ArrowUpRight style={{ width: '14px', height: '14px', color: sc.color }} />
                          </div>
                        </div>

                        {/* Shooting type badge */}
                        {stc && (
                          <div className="mb-2">
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 8px', borderRadius: '999px',
                                fontSize: '10px', fontWeight: 700,
                                background: stc.bg, color: stc.color,
                              }}
                            >
                              <Camera style={{ width: '9px', height: '9px' }} />
                              {stc.label}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <h3
                          style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '8px' }}
                        >
                          {project.title}
                        </h3>

                        {/* Status badge — clickable dropdown */}
                        <div className="relative inline-block mb-3" style={{ zIndex: 30 }}>
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setOpenStatusMenu(openStatusMenu === project.id ? null : project.id) }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '4px 8px 4px 10px', borderRadius: '999px',
                              fontSize: '11px', fontWeight: 700,
                              background: sc.bg, color: sc.color,
                              border: 'none', cursor: 'pointer',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                            {sc.label}
                            <ChevronDown style={{ width: '10px', height: '10px', opacity: 0.7 }} />
                          </button>
                          {openStatusMenu === project.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setOpenStatusMenu(null) }} />
                              <div className="absolute left-0 top-full mt-1 rounded-xl overflow-hidden z-50 min-w-[160px]"
                                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                  <button
                                    key={key}
                                    onClick={e => updateStatus(e, project.id, key)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-bold transition-colors text-left"
                                    style={{ color: key === project.status ? cfg.color : 'var(--text-primary)', background: key === project.status ? cfg.bg : 'transparent' }}
                                    onMouseEnter={e => { if (key !== project.status) e.currentTarget.style.background = 'var(--bg-hover)' }}
                                    onMouseLeave={e => { if (key !== project.status) e.currentTarget.style.background = 'transparent' }}
                                  >
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                                    {cfg.label}
                                    {key === project.status && <span className="ml-auto text-[10px]">✓</span>}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Meta */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {clientName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User style={{ width: '13px', height: '13px', flexShrink: 0, color: 'var(--text-muted)' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</span>
                            </div>
                          )}
                          {project.shoot_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar style={{ width: '13px', height: '13px', flexShrink: 0, color: 'var(--text-muted)' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(project.shoot_date, 'de')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteProject(e, project.id, project.title)}
                      className="absolute bottom-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
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
          )}

          {/* ── LIST VIEW ── */}
          {viewMode === 'list' && (
            <div className="space-y-1.5">
              {projects.map((project, index) => {
                const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft
                const stc = project.shooting_type ? SHOOTING_TYPE_CONFIG[project.shooting_type] : null
                const clientName = getClientName(project.client)
                const isDragging = dragging === project.id
                const isOver = dragOver === project.id

                return (
                  <div
                    key={project.id}
                    className="group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    draggable
                    onDragStart={e => handleDragStart(e, index, project.id)}
                    onDragOver={e => handleDragOver(e, index, project.id)}
                    onDrop={e => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: 'var(--card-bg)',
                      border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border-color)'}`,
                      opacity: isDragging ? 0.4 : 1,
                      borderTop: isOver ? `2px solid var(--accent)` : undefined,
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Status dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: sc.dot }}
                    />

                    {/* Title */}
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex-1 min-w-0 font-bold text-[14px] hover:underline truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {project.title}
                    </Link>

                    {/* Shooting type */}
                    {stc && (
                      <span
                        className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: stc.bg, color: stc.color }}
                      >
                        <Camera className="w-2.5 h-2.5" />
                        {stc.label}
                      </span>
                    )}

                    {/* Status — clickable dropdown */}
                    <div className="relative flex-shrink-0" style={{ zIndex: 20 }}>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpenStatusMenu(openStatusMenu === project.id ? null : project.id) }}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                        style={{ background: sc.bg, color: sc.color, border: 'none', cursor: 'pointer' }}
                      >
                        {sc.label}
                        <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                      </button>
                      {openStatusMenu === project.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setOpenStatusMenu(null) }} />
                          <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50 min-w-[160px]"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={e => updateStatus(e, project.id, key)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-bold transition-colors text-left"
                                style={{ color: key === project.status ? cfg.color : 'var(--text-primary)', background: key === project.status ? cfg.bg : 'transparent' }}
                                onMouseEnter={e => { if (key !== project.status) e.currentTarget.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={e => { if (key !== project.status) e.currentTarget.style.background = 'transparent' }}
                              >
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                                {cfg.label}
                                {key === project.status && <span className="ml-auto text-[10px]">✓</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Client */}
                    {clientName && (
                      <div className="flex-shrink-0 hidden md:flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[12px]">{clientName}</span>
                      </div>
                    )}

                    {/* Date */}
                    {project.shoot_date && (
                      <div className="flex-shrink-0 hidden lg:flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[12px]">{formatDate(project.shoot_date, 'de')}</span>
                      </div>
                    )}

                    {/* Open + Delete */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                        title="Öffnen"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={(e) => deleteProject(e, project.id, project.title)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                        title="Löschen"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,59,44,0.20)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(196,59,44,0.10)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
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
