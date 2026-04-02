'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, User, ArrowRight, Plus, Trash2, Trophy } from 'lucide-react'
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

interface Stage {
  id: string
  label: string
  color: string
  bg: string
  type?: 'won' | 'lost' | null
}

// Color palette cycled when adding new stages
const STAGE_PALETTE = [
  { color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
  { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  { color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  { color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  { color: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { color: '#C4A47C', bg: 'rgba(196,164,124,0.08)' },
]

const DEFAULT_STAGES_DE: Stage[] = [
  { id: 'inquiry',   label: 'Anfrage',      color: '#6B6B6B', bg: 'rgba(107,107,107,0.08)' },
  { id: 'booked',    label: 'Gebucht',      color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { id: 'shooting',  label: 'Shooting',     color: '#C8A882', bg: 'rgba(200,168,130,0.08)' },
  { id: 'editing',   label: 'Bearbeitung',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { id: 'delivered', label: 'Geliefert',    color: '#3DBA6F', bg: 'rgba(61,186,111,0.08)', type: 'won' },
  { id: 'archived',  label: 'Archiviert',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
]

const DEFAULT_STAGES_EN: Stage[] = [
  { id: 'inquiry',   label: 'Inquiry',   color: '#6B6B6B', bg: 'rgba(107,107,107,0.08)' },
  { id: 'booked',    label: 'Booked',    color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { id: 'shooting',  label: 'Shooting',  color: '#C8A882', bg: 'rgba(200,168,130,0.08)' },
  { id: 'editing',   label: 'Editing',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { id: 'delivered', label: 'Delivered', color: '#3DBA6F', bg: 'rgba(61,186,111,0.08)', type: 'won' },
  { id: 'archived',  label: 'Archived',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
]

const LS_KEY = 'pipeline_stages_v1'

export default function PipelineClient({ projects: initialProjects }: Props) {
  const locale = useLocale()
  const isDE = locale === 'de'
  const supabase = createClient()

  // ── State ────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState(initialProjects)

  // Card drag
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  // Column drag
  const colDragId = useRef<string | null>(null)
  const [draggingCol, setDraggingCol] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Stages — persisted to localStorage
  const [stages, setStages] = useState<Stage[]>(() => {
    if (typeof window === 'undefined') return isDE ? DEFAULT_STAGES_DE : DEFAULT_STAGES_EN
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) return JSON.parse(saved) as Stage[]
    } catch {}
    return isDE ? DEFAULT_STAGES_DE : DEFAULT_STAGES_EN
  })

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Stage-type dropdown
  const [typeMenuId, setTypeMenuId] = useState<string | null>(null)

  // Focus edit input when it appears
  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        editInputRef.current?.focus()
        editInputRef.current?.select()
      }, 0)
    }
  }, [editingId])

  // ── Stage helpers ────────────────────────────────────────────────────────
  const persist = (s: Stage[]) => {
    setStages(s)
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  }

  const addStage = () => {
    const palette = STAGE_PALETTE[stages.length % STAGE_PALETTE.length]
    const newStage: Stage = {
      id: `stage_${Date.now()}`,
      label: isDE ? 'Neuer Status' : 'New Stage',
      color: palette.color,
      bg: palette.bg,
      type: null,
    }
    const next = [...stages, newStage]
    persist(next)
    setEditingId(newStage.id)
    setEditingLabel(newStage.label)
  }

  const commitRename = (id: string) => {
    const trimmed = editingLabel.trim()
    if (trimmed) persist(stages.map(s => s.id === id ? { ...s, label: trimmed } : s))
    setEditingId(null)
  }

  const deleteStage = (id: string) => {
    if (stages.length <= 1) {
      toast.error(isDE ? 'Mindestens eine Stage erforderlich' : 'Need at least one stage')
      return
    }
    const idx = stages.findIndex(s => s.id === id)
    const fallback = (idx > 0 ? stages[idx - 1] : stages[idx + 1]).id
    const affected = projects.filter(p => (p.status || stages[0].id) === id)
    if (affected.length > 0) {
      setProjects(prev => prev.map(p => p.status === id ? { ...p, status: fallback } : p))
      Promise.all(affected.map(p =>
        supabase.from('projects').update({ status: fallback }).eq('id', p.id)
      ))
      toast.success(isDE ? `${affected.length} Projekt${affected.length === 1 ? '' : 'e'} verschoben` : `${affected.length} project${affected.length === 1 ? '' : 's'} moved`)
    }
    persist(stages.filter(s => s.id !== id))
  }

  const setStageType = (id: string, type: Stage['type']) => {
    persist(stages.map(s => s.id === id ? { ...s, type } : s))
    setTypeMenuId(null)
  }

  // ── Card drag ────────────────────────────────────────────────────────────
  const getClientName = (client: Project['client']) => {
    if (!client) return null
    const c = Array.isArray(client) ? client[0] : client
    return c?.full_name || null
  }

  const getProjectsByStage = (id: string) =>
    projects.filter(p => (p.status || stages[0]?.id) === id)

  const handleCardDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('drag-type', 'card')
    e.dataTransfer.setData('card-id', projectId)
    setDragging(projectId)
  }
  const handleCardDragEnd = () => { setDragging(null); setDragOver(null) }

  // ── Column drag ──────────────────────────────────────────────────────────
  const handleColDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation()
    e.dataTransfer.setData('drag-type', 'column')
    e.dataTransfer.setData('col-id', id)
    colDragId.current = id
    setDraggingCol(id)
  }
  const handleColDragEnd = () => {
    colDragId.current = null
    setDraggingCol(null)
    setDragOverCol(null)
  }

  // ── Shared drag-over / drop on columns ───────────────────────────────────
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    colDragId.current ? setDragOverCol(colId) : setDragOver(colId)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const dragType = e.dataTransfer.getData('drag-type')

    if (dragType === 'column') {
      const fromId = e.dataTransfer.getData('col-id')
      if (!fromId || fromId === targetId) { handleColDragEnd(); return }
      const fromIdx = stages.findIndex(s => s.id === fromId)
      const toIdx   = stages.findIndex(s => s.id === targetId)
      const next = [...stages]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      persist(next)
      handleColDragEnd()
      return
    }

    // Card drop
    const cardId = e.dataTransfer.getData('card-id') || dragging
    if (!cardId) return
    const project = projects.find(p => p.id === cardId)
    if (!project || project.status === targetId) { handleCardDragEnd(); return }

    setProjects(prev => prev.map(p => p.id === cardId ? { ...p, status: targetId } : p))
    setDragging(null)
    setDragOver(null)

    const { error } = await supabase.from('projects').update({ status: targetId }).eq('id', cardId)
    if (error) {
      toast.error(isDE ? 'Fehler beim Speichern' : 'Failed to save')
      setProjects(prev => prev.map(p => p.id === cardId ? { ...p, status: project.status } : p))
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Pipeline
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {isDE
            ? 'Projekte nach Status verwalten — Spalten und Karten ziehen zum Verschieben'
            : 'Manage projects by status — drag columns and cards to move'}
        </p>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1" style={{ minHeight: 0 }}>
        {stages.map(col => {
          const colProjects = getProjectsByStage(col.id)
          const isCardOver = dragOver === col.id && !colDragId.current
          const isColOver  = dragOverCol === col.id
          const isColDrag  = draggingCol === col.id

          return (
            <div
              key={col.id}
              className="flex-shrink-0 flex flex-col rounded-2xl transition-all group"
              style={{
                width: '280px',
                background: isCardOver ? col.bg : 'var(--bg-surface)',
                border: `1px solid ${isColOver ? col.color + '60' : isCardOver ? col.color + '40' : 'var(--border-color)'}`,
                opacity: isColDrag ? 0.4 : 1,
                transform: isColOver ? 'scale(1.01)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              onDragLeave={() => { setDragOver(null); setDragOverCol(null) }}
            >
              {/* ── Column header — drag handle for reordering ── */}
              <div
                className="flex items-center justify-between px-3 py-3 cursor-grab active:cursor-grabbing select-none"
                draggable
                onDragStart={e => handleColDragStart(e, col.id)}
                onDragEnd={handleColDragEnd}
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />

                  {editingId === col.id ? (
                    <input
                      ref={editInputRef}
                      value={editingLabel}
                      onChange={e => setEditingLabel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(col.id) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={() => commitRename(col.id)}
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      className="text-[12px] font-bold bg-transparent border-b outline-none min-w-0 w-full"
                      style={{ color: col.color, borderColor: col.color + '70' }}
                    />
                  ) : (
                    <button
                      className="text-[12px] font-bold text-left truncate hover:underline"
                      style={{ color: col.color }}
                      onClick={e => { e.stopPropagation(); setEditingId(col.id); setEditingLabel(col.label) }}
                      onMouseDown={e => e.stopPropagation()}
                      title={isDE ? 'Klicken zum Umbenennen' : 'Click to rename'}
                    >
                      {col.label}
                    </button>
                  )}

                  {col.type && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider"
                      style={{
                        background: col.type === 'won' ? 'rgba(16,185,129,0.15)' : 'rgba(196,59,44,0.15)',
                        color:      col.type === 'won' ? '#10B981'                : '#C43B2C',
                      }}
                    >
                      {col.type === 'won'
                        ? (isDE ? 'Gewonnen' : 'Won')
                        : (isDE ? 'Verloren' : 'Lost')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: col.bg, color: col.color }}
                  >
                    {colProjects.length}
                  </span>

                  {/* Actions shown on column hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    {/* Stage type */}
                    <div className="relative">
                      <button
                        className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                        style={{ color: col.type === 'won' ? '#10B981' : col.type === 'lost' ? '#C43B2C' : 'var(--text-muted)' }}
                        onClick={e => { e.stopPropagation(); setTypeMenuId(typeMenuId === col.id ? null : col.id) }}
                        onMouseDown={e => e.stopPropagation()}
                        title={isDE ? 'Stage-Typ' : 'Stage type'}
                      >
                        <Trophy className="w-3 h-3" />
                      </button>

                      {typeMenuId === col.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setTypeMenuId(null)} />
                          <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50 min-w-[140px] dropdown-glass">
                            {([
                              { type: null,   label: isDE ? 'Standard' : 'Default', color: 'var(--text-muted)' },
                              { type: 'won',  label: isDE ? 'Gewonnen' : 'Won',     color: '#10B981' },
                              { type: 'lost', label: isDE ? 'Verloren' : 'Lost',    color: '#C43B2C' },
                            ] as const).map(opt => (
                              <button
                                key={String(opt.type)}
                                onClick={e => { e.stopPropagation(); setStageType(col.id, opt.type) }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-left transition-colors"
                                style={{ background: col.type === opt.type ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
                                onMouseEnter={e => { if (col.type !== opt.type) e.currentTarget.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={e => { if (col.type !== opt.type) e.currentTarget.style.background = 'transparent' }}
                              >
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color === 'var(--text-muted)' ? 'var(--text-muted)' : opt.color }} />
                                {opt.label}
                                {col.type === opt.type && <span className="ml-auto text-[10px]" style={{ color: opt.color }}>✓</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Delete stage */}
                    <button
                      className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={e => { e.stopPropagation(); deleteStage(col.id) }}
                      onMouseDown={e => e.stopPropagation()}
                      onMouseEnter={e => { e.currentTarget.style.color = '#C43B2C' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                      title={isDE ? 'Stage löschen' : 'Delete stage'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Cards ── */}
              <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
                {colProjects.map(project => {
                  const clientName = getClientName(project.client)
                  return (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={e => handleCardDragStart(e, project.id)}
                      onDragEnd={handleCardDragEnd}
                      className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all group/card"
                      style={{
                        background: dragging === project.id ? 'var(--bg-hover)' : 'var(--bg-base)',
                        border: '1px solid var(--border-color)',
                        opacity: dragging === project.id ? 0.45 : 1,
                        boxShadow: dragging === project.id ? 'var(--card-shadow-hover)' : 'none',
                      }}
                    >
                      <p className="text-[12px] font-semibold leading-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        {project.title}
                      </p>

                      {clientName && (
                        <div className="flex items-center gap-1 mb-1">
                          <User className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{clientName}</span>
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
                        <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full mb-1"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          {project.shooting_type}
                        </span>
                      )}

                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="flex items-center gap-0.5 mt-1.5 text-[10px] font-medium opacity-0 group-hover/card:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                        {isDE ? 'Öffnen' : 'Open'}
                      </Link>
                    </div>
                  )
                })}

                {colProjects.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-8">
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
                      {isDE ? 'Keine Projekte' : 'No projects'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── + Stage button ── */}
        <button
          onClick={addStage}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all"
          style={{
            width: '200px',
            minHeight: '120px',
            border: '2px dashed var(--border-color)',
            background: 'transparent',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.background = 'rgba(196,164,124,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-color)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-semibold">
            {isDE ? 'Stage hinzufügen' : 'Add stage'}
          </span>
        </button>
      </div>
    </div>
  )
}
