'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ClipboardList, ArrowUpRight, Clock, CheckCircle2, Send, FolderOpen, Plus, Sparkles, ChevronRight, ClipboardCheck, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { QUESTIONNAIRE_TEMPLATES } from '@/lib/questionnaireTemplates'

interface QuestionnaireRow {
  id: string
  title: string
  sent_at: string | null
  created_at: string
  project: { id: string; title: string } | null
  submission: { submitted_at: string } | null
}

function getStatus(q: QuestionnaireRow): 'draft' | 'sent' | 'completed' {
  if (q.submission) return 'completed'
  if (q.sent_at) return 'sent'
  return 'draft'
}

const STATUS_CONFIG = {
  draft:     { label: 'Entwurf',    color: '#64748B', bg: 'rgba(100,116,139,0.12)', icon: Clock },
  sent:      { label: 'Gesendet',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: Send },
  completed: { label: 'Ausgefüllt', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2 },
}

const TEMPLATE_ACCENTS = [
  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)' },
  { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)' },
]

const TEMPLATE_CARDS = [
  {
    key: 'hochzeit',
    label: 'Hochzeit-Fragebogen',
    desc: 'Trauung, Feier, Gäste & besondere Wünsche',
    accentIdx: 0,
  },
  {
    key: 'portrait',
    label: 'Portrait Shooting',
    desc: 'Stil, Look, Referenzen & Wünsche',
    accentIdx: 1,
  },
  {
    key: 'event',
    label: 'Event-Fragebogen',
    desc: 'Ablauf, Personen & Programmpunkte',
    accentIdx: 2,
  },
]

export default function QuestionnairesPage() {
  const [rows, setRows] = useState<QuestionnaireRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'completed'>('all')
  const [creating, setCreating] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('questionnaires')
        .select(`
          id, title, sent_at, created_at,
          project:projects(id, title),
          submission:questionnaire_submissions(submitted_at)
        `)
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false })

      setRows((data as unknown as QuestionnaireRow[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const createFromTemplate = async (key: string) => {
    setCreating(key)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let title = 'Neuer Fragebogen'
      let questions: object[] = []

      if (key === 'blank') {
        title = 'Neuer Fragebogen'
        questions = []
      } else {
        const tpl = QUESTIONNAIRE_TEMPLATES.find(t => t.key === key)
        if (tpl) {
          title = tpl.title
          questions = tpl.questions
        }
      }

      const { data, error } = await supabase
        .from('questionnaires')
        .insert({ photographer_id: user.id, title, questions })
        .select('id')
        .single()

      if (error) { toast.error('Fehler beim Erstellen'); return }

      toast.success(`"${title}" erstellt!`)
      // Add to list
      setRows(prev => [{
        id: data.id,
        title,
        sent_at: null,
        created_at: new Date().toISOString(),
        project: null,
        submission: null,
      }, ...prev])
    } finally {
      setCreating(null)
    }
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => getStatus(r) === filter)

  const counts = {
    all: rows.length,
    draft: rows.filter(r => getStatus(r) === 'draft').length,
    sent: rows.filter(r => getStatus(r) === 'sent').length,
    completed: rows.filter(r => getStatus(r) === 'completed').length,
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="h-8 w-48 rounded-lg shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1
          className="font-black"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
        >
          Fragebögen
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {rows.length} {rows.length === 1 ? 'Fragebogen' : 'Fragebögen'} · Alle Kundenfragebögen im Überblick
        </p>
      </div>

      {/* ── Vorlagen ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Standard-Vorlagen
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ── Neue leere Vorlage card ── */}
          <button
            onClick={() => createFromTemplate('blank')}
            disabled={creating === 'blank'}
            className="group relative flex flex-col rounded-2xl overflow-hidden text-left transition-all duration-200 disabled:opacity-60"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
              >
                {creating === 'blank' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Neue Vorlage
                </p>
                <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                  Eigenen Fragebogen erstellen und speichern
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>
                <PenLine className="w-3.5 h-3.5" />
                Vorlage erstellen
              </div>
            </div>
          </button>

          {/* ── Built-in template cards ── */}
          {TEMPLATE_CARDS.map((tpl) => {
            const accent = TEMPLATE_ACCENTS[tpl.accentIdx]
            return (
              <div
                key={tpl.key}
                className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${accent.color}12 0%, ${accent.color}04 100%)`,
                  border: `1px solid ${accent.color}28`,
                  boxShadow: `0 2px 12px ${accent.color}10`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 24px ${accent.color}22`
                  e.currentTarget.style.borderColor = accent.color + '45'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = `0 2px 12px ${accent.color}10`
                  e.currentTarget.style.borderColor = accent.color + '28'
                }}
              >
                {/* Top color bar */}
                <div className="h-[3px] w-full" style={{ background: accent.color, opacity: 0.7 }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
                  >
                    <ClipboardCheck className="w-5 h-5" style={{ color: accent.color }} />
                  </div>
                  {/* Title + desc */}
                  <div className="flex-1">
                    <p className="text-[13.5px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {tpl.label}
                    </p>
                    <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {tpl.desc}
                    </p>
                  </div>
                  {/* Buttons */}
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => {/* preview — future */ }}
                      className="flex-1 flex items-center justify-center text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                    >
                      Vorschau
                    </button>
                    <button
                      onClick={() => createFromTemplate(tpl.key)}
                      disabled={creating === tpl.key}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                    >
                      {creating === tpl.key ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Verwenden <ChevronRight className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'draft', 'sent', 'completed'] as const).map(f => {
          const isActive = filter === f
          const cfg = f === 'all' ? null : STATUS_CONFIG[f]
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
              style={{
                background: isActive
                  ? (cfg ? cfg.bg : 'var(--bg-active)')
                  : 'var(--bg-surface)',
                color: isActive
                  ? (cfg ? cfg.color : 'var(--text-on-active)')
                  : 'var(--text-muted)',
                border: `1px solid ${isActive ? (cfg ? cfg.color + '40' : 'transparent') : 'var(--border-color)'}`,
              }}
            >
              {f === 'all' ? 'Alle' : cfg!.label}
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-black"
                style={{
                  background: isActive ? 'rgba(0,0,0,0.15)' : 'var(--bg-hover)',
                  color: isActive ? 'inherit' : 'var(--text-muted)',
                }}
              >
                {counts[f]}
              </span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(q => {
            const status = getStatus(q)
            const sc = STATUS_CONFIG[status]
            const StatusIcon = sc.icon

            return (
              <div
                key={q.id}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sc.color + '40' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: sc.bg }}
                >
                  <ClipboardList className="w-4 h-4" style={{ color: sc.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {q.title}
                  </p>
                  {q.project && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <FolderOpen className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {Array.isArray(q.project) ? q.project[0]?.title : q.project.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="hidden sm:block flex-shrink-0 text-right">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {status === 'completed' && q.submission
                      ? `Ausgefüllt ${new Date(Array.isArray(q.submission) ? q.submission[0]?.submitted_at : q.submission.submitted_at).toLocaleDateString('de')}`
                      : status === 'sent' && q.sent_at
                      ? `Gesendet ${new Date(q.sent_at).toLocaleDateString('de')}`
                      : `Erstellt ${new Date(q.created_at).toLocaleDateString('de')}`
                    }
                  </p>
                </div>

                {/* Status badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 text-[11px] font-bold"
                  style={{ background: sc.bg, color: sc.color }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </div>

                {/* Open project link */}
                {q.project && (
                  <Link
                    href={`/dashboard/projects/${Array.isArray(q.project) ? q.project[0]?.id : q.project.id}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    title="Projekt öffnen"
                    onClick={e => e.stopPropagation()}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <ClipboardList className="w-6 h-6" style={{ color: '#6366F1' }} />
          </div>
          <h3 className="font-black mb-2" style={{ fontSize: '1.1rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {filter === 'all' ? 'Noch keine Fragebögen' : `Keine ${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.label}-Fragebögen`}
          </h3>
          <p className="text-[13px] max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Wähle eine Vorlage oben aus oder erstelle Fragebögen direkt in einem Projekt
          </p>
        </div>
      )}
    </div>
  )
}
