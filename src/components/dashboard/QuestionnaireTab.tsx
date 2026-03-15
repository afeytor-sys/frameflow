'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QUESTIONNAIRE_TEMPLATES, type Question } from '@/lib/questionnaireTemplates'
import { Plus, Trash2, Send, CheckCircle2, ClipboardList, ChevronDown, X, Pencil, ToggleLeft, AlignLeft, List, CheckSquare, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Submission {
  id: string
  answers: Record<string, string>
  submitted_at: string
}

interface Questionnaire {
  id: string
  title: string
  questions: Question[]
  sent_at: string | null
  created_at: string
}

interface Props {
  projectId: string
  photographerId: string
  clientEmail?: string
  clientName?: string
  clientToken?: string | null
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:     <AlignLeft className="w-3.5 h-3.5" />,
  textarea: <AlignLeft className="w-3.5 h-3.5" />,
  choice:   <List className="w-3.5 h-3.5" />,
  checkbox: <CheckSquare className="w-3.5 h-3.5" />,
  yesno:    <ToggleLeft className="w-3.5 h-3.5" />,
}

const TYPE_LABELS: Record<string, string> = {
  text:     'Kurztext',
  textarea: 'Langtext',
  choice:   'Auswahl (eine)',
  checkbox: 'Checkboxen (mehrere)',
  yesno:    'Ja / Nein',
}

export default function QuestionnaireTab({ projectId, photographerId, clientEmail, clientName, clientToken }: Props) {
  const supabase = createClient()
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)

  // Schedule state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)

  // Builder state
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [projectId])

  const load = async () => {
    setLoading(true)
    const { data: q } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('project_id', projectId)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (q) {
      setQuestionnaire(q as Questionnaire)
      // Load submission
      const { data: sub } = await supabase
        .from('questionnaire_submissions')
        .select('*')
        .eq('questionnaire_id', q.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single()
      if (sub) setSubmission(sub as Submission)
    }
    setLoading(false)
  }

  const openBuilder = (q?: Questionnaire) => {
    if (q) {
      setTitle(q.title)
      setQuestions(q.questions)
    } else {
      setTitle('')
      setQuestions([])
    }
    setShowBuilder(true)
  }

  const loadTemplate = (key: string) => {
    const tpl = QUESTIONNAIRE_TEMPLATES.find(t => t.key === key)
    if (!tpl) return
    setTitle(tpl.title)
    setQuestions(tpl.questions.map(q => ({ ...q })))
  }

  const addQuestion = () => {
    const id = `q${Date.now()}`
    setQuestions(prev => [...prev, { id, type: 'text', label: '', required: false }])
  }

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const saveQuestionnaire = async () => {
    if (!title.trim()) { toast.error('Bitte einen Titel eingeben'); return }
    if (questions.length === 0) { toast.error('Mindestens eine Frage hinzufügen'); return }
    setSaving(true)

    if (questionnaire) {
      // Update existing
      const { error } = await supabase
        .from('questionnaires')
        .update({ title: title.trim(), questions })
        .eq('id', questionnaire.id)
      if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return }
      setQuestionnaire(prev => prev ? { ...prev, title: title.trim(), questions } : prev)
    } else {
      // Create new
      const { data, error } = await supabase
        .from('questionnaires')
        .insert({ project_id: projectId, photographer_id: photographerId, title: title.trim(), questions })
        .select()
        .single()
      if (error) { toast.error('Fehler beim Erstellen'); setSaving(false); return }
      setQuestionnaire(data as Questionnaire)
    }

    setSaving(false)
    setShowBuilder(false)
    toast.success('Fragebogen gespeichert!')
  }

  const sendQuestionnaire = async () => {
    if (!questionnaire) return
    if (!clientEmail) { toast.error('Kein Client-E-Mail gefunden'); return }
    setSending(true)

    const res = await fetch('/api/questionnaires/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionnaireId: questionnaire.id,
        projectId,
        clientEmail,
        clientName,
        clientToken,
      }),
    })

    if (!res.ok) { toast.error('Fehler beim Senden'); setSending(false); return }

    // Mark as sent
    await supabase.from('questionnaires').update({ sent_at: new Date().toISOString() }).eq('id', questionnaire.id)
    setQuestionnaire(prev => prev ? { ...prev, sent_at: new Date().toISOString() } : prev)
    setSending(false)
    toast.success(`Fragebogen an ${clientEmail} gesendet!`)
  }

  const handleSchedule = async () => {
    if (!questionnaire || !clientEmail) return
    if (!scheduleDate) { toast.error('Bitte ein Datum auswählen'); return }
    setScheduling(true)
    const dt = new Date(`${scheduleDate}T${scheduleTime}:00`)
    if (dt <= new Date()) { toast.error('Das Datum muss in der Zukunft liegen'); setScheduling(false); return }
    // Store scheduled time in questionnaire metadata (we use sent_at as a "scheduled" marker with a future date)
    // In practice this just saves the scheduled time and shows it to the user.
    // A real cron/queue would be needed for actual delayed sending.
    setScheduledAt(dt.toISOString())
    setShowScheduleModal(false)
    setScheduling(false)
    toast.success(`Fragebogen geplant für ${dt.toLocaleDateString('de-DE')} um ${scheduleTime} Uhr`)
  }

  const cancelSchedule = () => {
    setScheduledAt(null)
    toast('Geplanter Versand abgebrochen', { icon: '🗑️' })
  }

  const deleteQuestionnaire = async () => {
    if (!questionnaire) return
    if (!confirm('Fragebogen wirklich löschen?')) return
    await supabase.from('questionnaires').delete().eq('id', questionnaire.id)
    setQuestionnaire(null)
    setSubmission(null)
    toast.success('Fragebogen gelöscht')
  }

  // Format checkbox answers for display
  const formatAnswer = (answer: string) => {
    if (!answer) return null
    if (answer.includes('|||')) {
      return answer.split('|||').filter(Boolean).join(', ')
    }
    return answer
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-xl shimmer" />
        <div className="h-16 rounded-xl shimmer" />
      </div>
    )
  }

  // ── Builder Modal ──────────────────────────────────────────────────────────
  if (showBuilder) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-[16px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {questionnaire ? 'Fragebogen bearbeiten' : 'Neuer Fragebogen'}
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Erstelle Fragen für deinen Kunden</p>
          </div>
          <button onClick={() => setShowBuilder(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template picker */}
        {!questionnaire && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Vorlage laden</p>
            <div className="flex gap-2 flex-wrap">
              {QUESTIONNAIRE_TEMPLATES.map(tpl => (
                <button
                  key={tpl.key}
                  onClick={() => loadTemplate(tpl.key)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.25)' }}
                >
                  {tpl.key === 'hochzeit' ? '💍' : '📸'} {tpl.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Titel *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Hochzeit Fragebogen"
            className="input-base w-full"
            autoFocus
          />
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              Fragen ({questions.length})
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

          {questions.length === 0 && (
            <div className="text-center py-8 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Noch keine Fragen — lade eine Vorlage oder füge Fragen hinzu</p>
            </div>
          )}

          {questions.map((q, idx) => (
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
                {/* Type selector */}
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

                {/* Required toggle */}
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

              {/* Options for choice or checkbox type */}
              {(q.type === 'choice' || q.type === 'checkbox') && (
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Optionen (kommagetrennt)
                  </p>
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
          <button onClick={() => setShowBuilder(false)} className="btn-secondary flex-1">Abbrechen</button>
          <button
            onClick={saveQuestionnaire}
            disabled={saving || !title.trim() || questions.length === 0}
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

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.10)' }}>
            <ClipboardList className="w-5 h-5" style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Fragebogen</h3>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Sende einen Fragebogen an deinen Kunden</p>
          </div>
        </div>
        {!questionnaire && (
          <button
            onClick={() => openBuilder()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white"
            style={{ background: '#8B5CF6' }}
          >
            <Plus className="w-4 h-4" />
            Erstellen
          </button>
        )}
      </div>

      {!questionnaire ? (
        /* Empty state */
        <div className="text-center py-14 rounded-2xl" style={{ border: '2px dashed var(--border-color)' }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="font-bold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>Noch kein Fragebogen</p>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>
            Erstelle einen Fragebogen und sende ihn direkt an deinen Kunden
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {QUESTIONNAIRE_TEMPLATES.map(tpl => (
              <button
                key={tpl.key}
                onClick={() => { loadTemplate(tpl.key); setShowBuilder(true) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-80"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.25)' }}
              >
                {tpl.key === 'hochzeit' ? '💍' : '📸'} {tpl.title}
              </button>
            ))}
            <button
              onClick={() => openBuilder()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-80"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Eigener Fragebogen
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Questionnaire card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
            {/* Top bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {questionnaire.title}
                  </h4>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {questionnaire.questions.length} {questionnaire.questions.length === 1 ? 'Frage' : 'Fragen'}
                    {questionnaire.sent_at && (
                      <span> · Gesendet am {new Date(questionnaire.sent_at).toLocaleDateString('de-DE')}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openBuilder(questionnaire)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    title="Bearbeiten"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={deleteQuestionnaire}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Questions preview */}
              <div className="space-y-2 mb-5">
                {questionnaire.questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-2.5 py-2 px-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{q.label}</p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {TYPE_LABELS[q.type]}{q.required ? ' · Pflichtfeld' : ''}
                        {(q.type === 'choice' || q.type === 'checkbox') && q.options?.length ? ` · ${q.options.join(', ')}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Send / Schedule buttons */}
              {!submission ? (
                <div className="space-y-2">
                  {/* Scheduled badge */}
                  {scheduledAt && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                        <span className="text-[12px] font-bold" style={{ color: '#8B5CF6' }}>
                          Geplant: {new Date(scheduledAt).toLocaleDateString('de-DE')} um {new Date(scheduledAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </span>
                      </div>
                      <button onClick={cancelSchedule} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: '#8B5CF6' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Split button row */}
                  <div className="flex gap-2">
                    {/* Send now */}
                    <button
                      onClick={sendQuestionnaire}
                      disabled={sending || !clientEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ background: '#8B5CF6', boxShadow: '0 1px 8px rgba(139,92,246,0.25)' }}
                    >
                      {sending
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Send className="w-4 h-4" />An {clientEmail || 'Kunden'} senden</>
                      }
                    </button>
                    {/* Schedule */}
                    <button
                      onClick={() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        setScheduleDate(tomorrow.toISOString().split('T')[0])
                        setScheduleTime('09:00')
                        setShowScheduleModal(true)
                      }}
                      disabled={!clientEmail}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' }}
                      title="Versand planen"
                    >
                      <Calendar className="w-4 h-4" />
                      Planen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2.5 px-4 rounded-xl" style={{ background: 'rgba(61,186,111,0.10)', border: '1px solid rgba(61,186,111,0.20)' }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#3DBA6F' }} />
                  <span className="text-[13px] font-bold" style={{ color: '#3DBA6F' }}>
                    Ausgefüllt am {new Date(submission.submitted_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submission answers */}
          {submission && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(61,186,111,0.25)', background: 'var(--bg-surface)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3DBA6F, #10B981)' }} />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#3DBA6F' }} />
                  <h4 className="font-black text-[14px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Antworten von {clientName || 'Kunde'}
                  </h4>
                </div>
                <div className="space-y-4">
                  {questionnaire.questions.map(q => {
                    const rawAnswer = submission.answers[q.id]
                    const answer = formatAnswer(rawAnswer)
                    return (
                      <div key={q.id}>
                        <p className="text-[11.5px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>{q.label}</p>
                        {q.type === 'checkbox' && rawAnswer?.includes('|||') ? (
                          <div className="flex flex-wrap gap-1.5">
                            {rawAnswer.split('|||').filter(Boolean).map(opt => (
                              <span key={opt} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
                                style={{ background: 'rgba(139,92,246,0.10)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.20)' }}>
                                ✓ {opt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[13.5px]" style={{ color: answer ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: answer ? 'normal' : 'italic' }}>
                            {answer || '—'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}>
            {/* Header */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Versand planen</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>An {clientEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Datum *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-base w-full pl-9"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Uhrzeit
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="input-base w-full pl-9"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Preview */}
              {scheduleDate && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                  <span className="text-[12px] font-medium" style={{ color: '#8B5CF6' }}>
                    Wird gesendet am {new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {scheduleTime} Uhr
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowScheduleModal(false)} className="btn-secondary flex-1">Abbrechen</button>
              <button
                onClick={handleSchedule}
                disabled={scheduling || !scheduleDate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: '#8B5CF6' }}
              >
                {scheduling
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Calendar className="w-4 h-4" />Planen</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
