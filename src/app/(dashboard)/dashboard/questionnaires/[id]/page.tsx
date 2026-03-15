'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ClipboardList, Pencil, Trash2, Send, CheckCircle2,
  Plus, X, ChevronDown, AlignLeft, List, ToggleLeft, Clock, FolderOpen,
  BookmarkPlus, CheckSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { QUESTIONNAIRE_TEMPLATES, type Question } from '@/lib/questionnaireTemplates'

const TYPE_LABELS: Record<string, string> = {
  text:     'Kurztext',
  textarea: 'Langtext',
  choice:   'Auswahl (eine)',
  checkbox: 'Checkboxen (mehrere)',
  yesno:    'Ja / Nein',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:     <AlignLeft className="w-3.5 h-3.5" />,
  textarea: <AlignLeft className="w-3.5 h-3.5" />,
  choice:   <List className="w-3.5 h-3.5" />,
  checkbox: <CheckSquare className="w-3.5 h-3.5" />,
  yesno:    <ToggleLeft className="w-3.5 h-3.5" />,
}

interface Questionnaire {
  id: string
  title: string
  questions: Question[]
  sent_at: string | null
  created_at: string
  project_id: string | null
  project?: { id: string; title: string; client?: { full_name: string } | null } | null
}

interface Submission {
  id: string
  answers: Record<string, string>
  submitted_at: string
}

export default function QuestionnaireDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Edit state
  const [editTitle, setEditTitle] = useState('')
  const [editQuestions, setEditQuestions] = useState<Question[]>([])

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    setLoading(true)
    const { data: q } = await supabase
      .from('questionnaires')
      .select(`
        id, title, questions, sent_at, created_at, project_id,
        project:projects(id, title, client:clients(full_name))
      `)
      .eq('id', id)
      .single()

    if (!q) { router.push('/dashboard/questionnaires'); return }
    setQuestionnaire(q as unknown as Questionnaire)

    const { data: sub } = await supabase
      .from('questionnaire_submissions')
      .select('*')
      .eq('questionnaire_id', id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()
    if (sub) setSubmission(sub as Submission)
    setLoading(false)
  }

  const openEdit = () => {
    if (!questionnaire) return
    setEditTitle(questionnaire.title)
    setEditQuestions(questionnaire.questions.map(q => ({ ...q })))
    setEditing(true)
  }

  const addQuestion = () => {
    const newId = `q${Date.now()}`
    setEditQuestions(prev => [...prev, { id: newId, type: 'text', label: '', required: false }])
  }

  const updateQuestion = (qid: string, patch: Partial<Question>) => {
    setEditQuestions(prev => prev.map(q => q.id === qid ? { ...q, ...patch } : q))
  }

  const removeQuestion = (qid: string) => {
    setEditQuestions(prev => prev.filter(q => q.id !== qid))
  }

  const loadTemplate = (key: string) => {
    const tpl = QUESTIONNAIRE_TEMPLATES.find(t => t.key === key)
    if (!tpl) return
    setEditTitle(tpl.title)
    setEditQuestions(tpl.questions.map(q => ({ ...q })))
  }

  const saveEdit = async () => {
    if (!editTitle.trim()) { toast.error('Bitte einen Titel eingeben'); return }
    if (editQuestions.length === 0) { toast.error('Mindestens eine Frage hinzufügen'); return }
    setSaving(true)
    const { error } = await supabase
      .from('questionnaires')
      .update({ title: editTitle.trim(), questions: editQuestions })
      .eq('id', id)
    if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return }
    setQuestionnaire(prev => prev ? { ...prev, title: editTitle.trim(), questions: editQuestions } : prev)
    setSaving(false)
    setEditing(false)
    toast.success('Fragebogen gespeichert!')
  }

  const saveAsTemplate = async () => {
    if (!questionnaire) return
    setSavingTemplate(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingTemplate(false); return }

    const { error } = await supabase
      .from('questionnaire_templates')
      .insert({
        photographer_id: user.id,
        title: questionnaire.title,
        questions: questionnaire.questions,
      })

    if (error) {
      toast.error('Fehler beim Speichern als Vorlage')
    } else {
      toast.success(`"${questionnaire.title}" als Vorlage gespeichert! ✨`, {
        duration: 4000,
      })
      // Navigate to questionnaires list so user sees the new template card
      setTimeout(() => router.push('/dashboard/questionnaires'), 1200)
    }
    setSavingTemplate(false)
  }

  const deleteQuestionnaire = async () => {
    if (!confirm('Fragebogen wirklich löschen?')) return
    await supabase.from('questionnaires').delete().eq('id', id)
    toast.success('Fragebogen gelöscht')
    router.push('/dashboard/questionnaires')
  }

  const sendQuestionnaire = async () => {
    if (!questionnaire?.project_id) { toast.error('Kein Projekt verknüpft'); return }
    setSending(true)
    // Get client email from project
    const { data: proj } = await supabase
      .from('projects')
      .select('client:clients(email, full_name), client_token')
      .eq('id', questionnaire.project_id)
      .single()

    const client = Array.isArray(proj?.client) ? proj.client[0] : proj?.client
    if (!client?.email) { toast.error('Keine Kunden-E-Mail gefunden'); setSending(false); return }

    const res = await fetch('/api/questionnaires/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionnaireId: id,
        projectId: questionnaire.project_id,
        clientEmail: client.email,
        clientName: client.full_name,
        clientToken: (proj as { client_token?: string })?.client_token,
      }),
    })
    if (!res.ok) { toast.error('Fehler beim Senden'); setSending(false); return }
    await supabase.from('questionnaires').update({ sent_at: new Date().toISOString() }).eq('id', id)
    setQuestionnaire(prev => prev ? { ...prev, sent_at: new Date().toISOString() } : prev)
    setSending(false)
    toast.success(`Fragebogen an ${client.email} gesendet!`)
  }

  // Format checkbox answers for display
  const formatAnswer = (answer: string) => {
    if (!answer) return null
    if (answer.includes('|||')) return answer.split('|||').filter(Boolean).join(', ')
    return answer
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in max-w-3xl mx-auto">
        <div className="h-8 w-48 rounded-lg shimmer" />
        <div className="h-64 rounded-2xl shimmer" />
      </div>
    )
  }

  if (!questionnaire) return null

  const project = Array.isArray(questionnaire.project) ? questionnaire.project[0] : questionnaire.project
  const clientName = project?.client
    ? (Array.isArray(project.client) ? project.client[0]?.full_name : project.client?.full_name)
    : null

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-black text-[1.4rem]" style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                Fragebogen bearbeiten
              </h1>
            </div>
          </div>
        </div>

        {/* Template picker */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Vorlage laden</p>
          <div className="flex gap-2 flex-wrap">
            {QUESTIONNAIRE_TEMPLATES.map(tpl => (
              <button
                key={tpl.key}
                onClick={() => loadTemplate(tpl.key)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}
              >
                {tpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Titel *</label>
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="input-base w-full"
            autoFocus
          />
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              Fragen ({editQuestions.length})
            </p>
            <button
              onClick={addQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Frage hinzufügen
            </button>
          </div>

          {editQuestions.length === 0 && (
            <div className="text-center py-8 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Noch keine Fragen — lade eine Vorlage oder füge Fragen hinzu</p>
            </div>
          )}

          {editQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={q.label}
                  onChange={e => updateQuestion(q.id, { label: e.target.value })}
                  placeholder="Frage eingeben..."
                  className="flex-1 bg-transparent text-[13px] outline-none font-medium"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button onClick={() => removeQuestion(q.id)} className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ color: '#C43B2C' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(q.id, { type: e.target.value as Question['type'] })}
                    className="appearance-none pl-7 pr-6 py-1 rounded-lg text-[11px] font-bold outline-none cursor-pointer"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    {Object.entries(TYPE_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                    {TYPE_ICONS[q.type]}
                  </span>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    onClick={() => updateQuestion(q.id, { required: !q.required })}
                    className="relative rounded-full cursor-pointer"
                    style={{ width: '28px', height: '16px', background: q.required ? 'var(--accent)' : 'var(--border-strong)', transition: 'background 150ms' }}
                  >
                    <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow"
                      style={{ left: q.required ? '13px' : '2px', transition: 'left 150ms' }} />
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pflichtfeld</span>
                </label>
              </div>

              {(q.type === 'choice' || q.type === 'checkbox') && (
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Optionen (kommagetrennt)</p>
                  <input
                    type="text"
                    value={(q.options || []).join(', ')}
                    onChange={e => updateQuestion(q.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="input-base w-full text-[12px]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Abbrechen</button>
          <button
            onClick={saveEdit}
            disabled={saving || !editTitle.trim() || editQuestions.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><CheckCircle2 className="w-4 h-4" />Speichern</>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/questionnaires"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1
              className="font-black"
              style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
            >
              {questionnaire.title}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {questionnaire.questions.length} {questionnaire.questions.length === 1 ? 'Frage' : 'Fragen'}
              </span>
              {project && (
                <Link
                  href={`/dashboard/projects/${project.id}?tab=questionnaire`}
                  className="flex items-center gap-1 text-[12px] font-bold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  <FolderOpen className="w-3 h-3" />
                  {project.title}
                </Link>
              )}
              {questionnaire.sent_at && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <Send className="w-3 h-3" />
                  Gesendet {new Date(questionnaire.sent_at).toLocaleDateString('de-DE')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {!submission && (
            <button
              onClick={sendQuestionnaire}
              disabled={sending || !questionnaire.project_id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#8B5CF6' }}
              title={!questionnaire.project_id ? 'Kein Projekt verknüpft' : 'Senden'}
            >
              {sending
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send className="w-3.5 h-3.5" />Senden</>
              }
            </button>
          )}

          {/* Save as Vorlage */}
          <button
            onClick={saveAsTemplate}
            disabled={savingTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
            title="Als Vorlage speichern"
          >
            {savingTemplate
              ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <><BookmarkPlus className="w-3.5 h-3.5" />Als Vorlage</>
            }
          </button>

          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Bearbeiten
          </button>
          <button
            onClick={deleteQuestionnaire}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
            title="Löschen"
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,59,44,0.20)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(196,59,44,0.10)' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status banner */}
      {submission ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
          <span className="text-[13px] font-bold" style={{ color: '#10B981' }}>
            Ausgefüllt von {clientName || 'Kunde'} am {new Date(submission.submitted_at).toLocaleDateString('de-DE')}
          </span>
        </div>
      ) : questionnaire.sent_at ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <span className="text-[13px] font-bold" style={{ color: '#F59E0B' }}>
            Gesendet — warte auf Antwort von {clientName || 'Kunde'}
          </span>
        </div>
      ) : null}

      {/* Questions list */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            <h2 className="font-black text-[14px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Fragen
            </h2>
          </div>
          {questionnaire.questions.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <p className="text-[13px]">Noch keine Fragen — klicke auf &quot;Bearbeiten&quot; um Fragen hinzuzufügen</p>
            </div>
          ) : (
            questionnaire.questions.map((q, i) => {
              const rawAnswer = submission?.answers[q.id]
              const answer = rawAnswer ? formatAnswer(rawAnswer) : null
              return (
                <div key={q.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{q.label}</p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {TYPE_LABELS[q.type]}{q.required ? ' · Pflichtfeld' : ''}
                        {(q.type === 'choice' || q.type === 'checkbox') && q.options?.length ? ` · ${q.options.join(', ')}` : ''}
                      </p>
                      {/* Answer if submitted */}
                      {submission && (
                        <div className="mt-2">
                          {q.type === 'checkbox' && rawAnswer?.includes('|||') ? (
                            <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                              {rawAnswer.split('|||').filter(Boolean).map(opt => (
                                <span key={opt} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-bold"
                                  style={{ background: 'rgba(139,92,246,0.10)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.20)' }}>
                                  ✓ {opt}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-lg" style={{ background: answer ? 'rgba(16,185,129,0.08)' : 'transparent', border: answer ? '1px solid rgba(16,185,129,0.15)' : 'none' }}>
                              <p className="text-[13px]" style={{ color: answer ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: answer ? 'normal' : 'italic' }}>
                                {answer || '— keine Antwort —'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
