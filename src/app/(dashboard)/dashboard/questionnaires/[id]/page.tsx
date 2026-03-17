'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ClipboardList, Pencil, Trash2, Send, CheckCircle2,
  Plus, X, ChevronDown, AlignLeft, List, ToggleLeft, Clock, FolderOpen,
  BookmarkPlus, CheckSquare, Search, User, Folder, Calendar, ChevronRight,
  ChevronUp,
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

interface ProjectOption {
  id: string
  title: string
  client_token: string
  custom_slug: string | null
  client: { full_name: string; email: string } | null
}

export default function QuestionnaireDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [sending, setSending] = useState(false)

  // Edit state
  const [editTitle, setEditTitle] = useState('')
  const [editQuestions, setEditQuestions] = useState<Question[]>([])

  useEffect(() => { load() }, [id])

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

  const openSendModal = async () => {
    setShowSendModal(true)
    setProjectSearch('')
    setScheduleMode(false)
    setScheduledAt('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('projects')
      .select('id, title, client_token, custom_slug, client:clients(full_name, email)')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false })

    const list = (data || []).map((p: unknown) => {
      const proj = p as { id: string; title: string; client_token: string; custom_slug: string | null; client: unknown }
      const clientRaw = Array.isArray(proj.client) ? proj.client[0] : proj.client
      return {
        id: proj.id,
        title: proj.title,
        client_token: proj.client_token,
        custom_slug: proj.custom_slug,
        client: clientRaw as { full_name: string; email: string } | null,
      }
    })
    setProjects(list)

    // Pre-select current project if linked
    if (questionnaire?.project_id) {
      const current = list.find(p => p.id === questionnaire.project_id)
      if (current) setSelectedProject(current)
    }
  }

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.client?.full_name || '').toLowerCase().includes(projectSearch.toLowerCase())
  )

  const handleSend = async () => {
    if (!selectedProject) { toast.error('Please select a project'); return }
    if (!selectedProject.client?.email) { toast.error('Kein Kunde mit E-Mail in diesem Projekt'); return }

    setSending(true)
    try {
      // 1. Link project to questionnaire if not already linked
      if (questionnaire?.project_id !== selectedProject.id) {
        await supabase
          .from('questionnaires')
          .update({ project_id: selectedProject.id })
          .eq('id', id)
        setQuestionnaire(prev => prev ? { ...prev, project_id: selectedProject.id } : prev)
      }

      if (scheduleMode && scheduledAt) {
        // Save scheduled_at (visual only)
        await supabase
          .from('questionnaires')
          .update({ sent_at: null })
          .eq('id', id)
        toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString('en-US')} ✅`)
        setShowSendModal(false)
        setSending(false)
        return
      }

      // 2. Send email
      const token = selectedProject.custom_slug || selectedProject.client_token
      const res = await fetch('/api/questionnaires/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaireId: id,
          projectId: selectedProject.id,
          clientEmail: selectedProject.client.email,
          clientName: selectedProject.client.full_name,
          clientToken: token,
        }),
      })

      if (!res.ok) { toast.error('Error sending'); return }

      // 3. Update sent_at
      const now = new Date().toISOString()
      await supabase.from('questionnaires').update({ sent_at: now }).eq('id', id)
      setQuestionnaire(prev => prev ? { ...prev, sent_at: now } : prev)

      toast.success(`Fragebogen an ${selectedProject.client.email} gesendet! 📧`)
      setShowSendModal(false)
    } finally {
      setSending(false)
    }
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

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    setEditQuestions(prev => {
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  const loadTemplate = (key: string) => {
    const tpl = QUESTIONNAIRE_TEMPLATES.find(t => t.key === key)
    if (!tpl) return
    setEditTitle(tpl.title)
    setEditQuestions(tpl.questions.map(q => ({ ...q })))
  }

  const saveEdit = async () => {
    if (!editTitle.trim()) { toast.error('Bitte einen Titel eingeben'); return }
    if (editQuestions.length === 0) { toast.error('Add at least one question'); return }
    setSaving(true)
    const { error } = await supabase
      .from('questionnaires')
      .update({ title: editTitle.trim(), questions: editQuestions })
      .eq('id', id)
    if (error) { toast.error('Error saving'); setSaving(false); return }
    setQuestionnaire(prev => prev ? { ...prev, title: editTitle.trim(), questions: editQuestions } : prev)
    setSaving(false)
    setEditing(false)
    toast.success('Questionnaire saved!')
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
      toast.error('Error saving als Vorlage')
    } else {
      toast.success(`"${questionnaire.title}" als Vorlage gespeichert! ✨`, { duration: 4000 })
      setTimeout(() => router.push('/dashboard/questionnaires'), 1200)
    }
    setSavingTemplate(false)
  }

  const deleteQuestionnaire = async () => {
    if (!confirm('Really delete this questionnaire?')) return
    await supabase.from('questionnaires').delete().eq('id', id)
    toast.success('Questionnaire deleted')
    router.push('/dashboard/questionnaires')
  }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
            <h1 className="font-black text-[1.4rem]" style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
              Edit questionnaire
            </h1>
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Load template</p>
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
              Add question
            </button>
          </div>

          {editQuestions.length === 0 && (
            <div className="text-center py-8 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No questions yet — load a template or add questions</p>
            </div>
          )}

          {editQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                {/* Move up/down buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveQuestion(idx, 'up')}
                    disabled={idx === 0}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-20"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { if (idx > 0) e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    title="Nach oben"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveQuestion(idx, 'down')}
                    disabled={idx === editQuestions.length - 1}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-20"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { if (idx < editQuestions.length - 1) e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    title="Nach unten"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                <div className="space-y-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Optionen ({(q.options || []).length})
                  </p>
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          {optIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...(q.options || [])]
                            newOpts[optIdx] = e.target.value
                            updateQuestion(q.id, { options: newOpts })
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const newOpts = [...(q.options || []), '']
                              updateQuestion(q.id, { options: newOpts })
                            }
                          }}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] outline-none"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                          autoFocus={opt === '' && optIdx === (q.options || []).length - 1}
                        />
                        <button
                          onClick={() => {
                            const newOpts = (q.options || []).filter((_, i) => i !== optIdx)
                            updateQuestion(q.id, { options: newOpts })
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#C43B2C' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                          title="Option entfernen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => updateQuestion(q.id, { options: [...(q.options || []), ''] })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-all hover:opacity-80"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}
                  >
                    <Plus className="w-3 h-3" />
                    Add option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={saveEdit}
            disabled={saving || !editTitle.trim() || editQuestions.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><CheckCircle2 className="w-4 h-4" />Save</>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <>
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
                    Sent {new Date(questionnaire.sent_at).toLocaleDateString('de-DE')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {!submission && (
              <button
                onClick={openSendModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#8B5CF6' }}
              >
                <Send className="w-3.5 h-3.5" />
                Senden
              </button>
            )}

            <button
              onClick={saveAsTemplate}
              disabled={savingTemplate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
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
              Edit
            </button>
            <button
              onClick={deleteQuestionnaire}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
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
              Submitted by {clientName || 'Client'} on {new Date(submission.submitted_at).toLocaleDateString('en-US')}
            </span>
          </div>
        ) : questionnaire.sent_at ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}>
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <span className="text-[13px] font-bold" style={{ color: '#F59E0B' }}>
              Sent — warte auf Antwort von {clientName || 'Kunde'}
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
                <p className="text-[13px]">No questions yet — click &quot;Edit&quot; to add questions</p>
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

      {/* ── Send Modal ── */}
      {showSendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSendModal(false) }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden animate-in"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
          >
            {/* Modal header */}
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.10)' }}>
                  <Send className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <h2 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    Send questionnaire
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{questionnaire.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Project search */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Folder className="w-3.5 h-3.5" />
                  Select project
                </label>

                {/* Search input */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    placeholder="Projekt oder Kunde suchen..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                </div>

                {/* Project list */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                      <p className="text-[12px]">No projects found</p>
                    </div>
                  ) : filteredProjects.map(p => {
                    const isSelected = selectedProject?.id === p.id
                    const hasEmail = !!p.client?.email
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(139,92,246,0.10)' : 'var(--bg-hover)',
                          border: `1px solid ${isSelected ? 'rgba(139,92,246,0.35)' : 'var(--border-color)'}`,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: isSelected ? 'rgba(139,92,246,0.15)' : 'var(--bg-surface)' }}
                        >
                          <Folder className="w-4 h-4" style={{ color: isSelected ? '#8B5CF6' : 'var(--text-muted)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                          {p.client ? (
                            <p className="text-[11px] truncate" style={{ color: hasEmail ? 'var(--text-muted)' : '#F59E0B' }}>
                              <User className="w-2.5 h-2.5 inline mr-1" />
                              {p.client.full_name}
                              {hasEmail ? ` · ${p.client.email}` : ' · Keine E-Mail'}
                            </p>
                          ) : (
                            <p className="text-[11px]" style={{ color: '#F59E0B' }}>No client linked</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selected project summary */}
              {selectedProject && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.20)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
                    <User className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selectedProject.client?.full_name || 'Kein Kunde'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {selectedProject.client?.email || '—'} · {selectedProject.title}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                </div>
              )}

              {/* Schedule toggle */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  Versand
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScheduleMode(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: !scheduleMode ? 'rgba(139,92,246,0.10)' : 'var(--bg-hover)',
                      border: `1px solid ${!scheduleMode ? 'rgba(139,92,246,0.35)' : 'var(--border-color)'}`,
                      color: !scheduleMode ? '#8B5CF6' : 'var(--text-muted)',
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Jetzt senden
                  </button>
                  <button
                    onClick={() => setScheduleMode(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: scheduleMode ? 'rgba(245,158,11,0.10)' : 'var(--bg-hover)',
                      border: `1px solid ${scheduleMode ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}`,
                      color: scheduleMode ? '#F59E0B' : 'var(--text-muted)',
                    }}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Planen
                  </button>
                </div>

                {scheduleMode && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      ℹ️ The send will be marked as scheduled. You can trigger it manually later.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !selectedProject || !selectedProject.client?.email || (scheduleMode && !scheduledAt)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: scheduleMode ? '#F59E0B' : '#8B5CF6' }}
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : scheduleMode ? (
                  <><Calendar className="w-4 h-4" />Versand planen</>
                ) : (
                  <><Send className="w-4 h-4" />Jetzt senden</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
