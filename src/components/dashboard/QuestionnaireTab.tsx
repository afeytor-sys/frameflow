'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QUESTIONNAIRE_TEMPLATES, type Question } from '@/lib/questionnaireTemplates'
import { Plus, Trash2, Send, CheckCircle2, ClipboardList, ChevronDown, X, Pencil, ToggleLeft, AlignLeft, List, CheckSquare, Calendar, Clock, Mail, Sparkles, ClipboardCheck, BookmarkCheck, ChevronRight } from 'lucide-react'
import EmailVorlagePicker from './EmailVorlagePicker'
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

  // Email compose modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailMode, setEmailMode] = useState<'send' | 'schedule'>('send')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')

  // Vorlage picker modal state
  const [showVorlagenModal, setShowVorlagenModal] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<{ id: string; title: string; questions: Question[]; created_at: string }[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

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
    if (questions.length === 0) { toast.error('Add at least one question'); return }
    setSaving(true)

    if (questionnaire) {
      // Update existing
      const { error } = await supabase
        .from('questionnaires')
        .update({ title: title.trim(), questions })
        .eq('id', questionnaire.id)
      if (error) { toast.error('Error saving'); setSaving(false); return }
      setQuestionnaire(prev => prev ? { ...prev, title: title.trim(), questions } : prev)
    } else {
      // Create new
      const { data, error } = await supabase
        .from('questionnaires')
        .insert({ project_id: projectId, photographer_id: photographerId, title: title.trim(), questions })
        .select()
        .single()
      if (error) { toast.error('Error creating'); setSaving(false); return }
      setQuestionnaire(data as Questionnaire)
    }

    setSaving(false)
    setShowBuilder(false)
    toast.success('Questionnaire saved!')
  }

  // Build default email message
  const buildDefaultMessage = (qTitle: string, studioName?: string) => {
    const firstName = clientName?.split(' ')[0] || 'Hallo'
    const studio = studioName || 'Your photographer'
    return `Hallo ${firstName}! 👋

Thank you for your interest! I am very much looking forward to our shoot together.

I have prepared a questionnaire for you: "${qTitle}"

Please take a moment to answer the questions — it helps me prepare everything perfectly for you.

Best regards,
${studio}`
  }

  const openEmailModal = (mode: 'send' | 'schedule') => {
    if (!questionnaire) return
    if (!clientEmail) { toast.error('Kein Client-E-Mail gefunden'); return }
    if (mode === 'schedule') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduleDate(tomorrow.toISOString().split('T')[0])
      setScheduleTime('09:00')
    }
    setEmailMode(mode)
    setEmailSubject(`📋 ${questionnaire.title}`)
    setEmailMessage(buildDefaultMessage(questionnaire.title))
    setShowEmailModal(true)
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
        customSubject: emailSubject,
        customMessage: emailMessage,
      }),
    })

    if (!res.ok) { toast.error('Error sending'); setSending(false); return }

    // Mark as sent
    await supabase.from('questionnaires').update({ sent_at: new Date().toISOString() }).eq('id', questionnaire.id)
    setQuestionnaire(prev => prev ? { ...prev, sent_at: new Date().toISOString() } : prev)
    setSending(false)
    setShowEmailModal(false)
    toast.success(`Fragebogen an ${clientEmail} gesendet!`)
  }

  const handleSchedule = async () => {
    if (!questionnaire || !clientEmail) return
    if (!scheduleDate) { toast.error('Please select a date'); return }
    setScheduling(true)
    const dt = new Date(`${scheduleDate}T${scheduleTime}:00`)
    if (dt <= new Date()) { toast.error('Das Datum muss in der Zukunft liegen'); setScheduling(false); return }
    setScheduledAt(dt.toISOString())
    setShowEmailModal(false)
    setShowScheduleModal(false)
    setScheduling(false)
    toast.success(`Questionnaire scheduled for ${dt.toLocaleDateString('en-US')} at ${scheduleTime}`)
  }

  const cancelSchedule = () => {
    setScheduledAt(null)
    toast('Geplanter Versand abgebrochen', { icon: '🗑️' })
  }

  const openVorlagenModal = async () => {
    setShowVorlagenModal(true)
    if (customTemplates.length === 0) {
      setLoadingTemplates(true)
      const { data } = await supabase
        .from('questionnaire_templates')
        .select('id, title, questions, created_at')
        .eq('photographer_id', photographerId)
        .order('created_at', { ascending: false })
      setCustomTemplates((data as { id: string; title: string; questions: Question[]; created_at: string }[]) || [])
      setLoadingTemplates(false)
    }
  }

  const deleteQuestionnaire = async () => {
    if (!questionnaire) return
    if (!confirm('Really delete this questionnaire?')) return
    await supabase.from('questionnaires').delete().eq('id', questionnaire.id)
    setQuestionnaire(null)
    setSubmission(null)
    toast.success('Questionnaire deleted')
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
              {questionnaire ? 'Edit questionnaire' : 'New questionnaire'}
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Create questions for your client</p>
          </div>
          <button onClick={() => setShowBuilder(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template picker */}
        {!questionnaire && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Load template</p>
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
              Add question
            </button>
          </div>

          {questions.length === 0 && (
            <div className="text-center py-8 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No questions yet — load a template or add questions</p>
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
          <button onClick={() => setShowBuilder(false)} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={saveQuestionnaire}
            disabled={saving || !title.trim() || questions.length === 0}
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
        <div className="flex items-center gap-2">
          <button
            onClick={openVorlagenModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-80"
            style={{ background: 'rgba(139,92,246,0.10)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.22)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Vorlage
          </button>
          {!questionnaire && (
            <button
              onClick={() => openBuilder()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white"
              style={{ background: '#8B5CF6' }}
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          )}
        </div>
      </div>

      {!questionnaire ? (
        /* Empty state */
        <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed var(--border-color)' }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="font-bold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>Noch kein Fragebogen</p>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Erstelle einen Fragebogen und sende ihn direkt an deinen Kunden
          </p>
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
                      <span> · Sent am {new Date(questionnaire.sent_at).toLocaleDateString('de-DE')}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openBuilder(questionnaire)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={deleteQuestionnaire}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                    title="Delete"
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
                    {/* Send now → opens email compose modal */}
                    <button
                      onClick={() => openEmailModal('send')}
                      disabled={sending || !clientEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ background: '#8B5CF6', boxShadow: '0 1px 8px rgba(139,92,246,0.25)' }}
                    >
                      <Send className="w-4 h-4" />
                      An {clientEmail || 'Kunden'} senden
                    </button>
                    {/* Schedule → opens email compose modal in schedule mode */}
                    <button
                      onClick={() => openEmailModal('schedule')}
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
                    Completed on {new Date(submission.submitted_at).toLocaleDateString('en-US')}
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

      {/* ── Email Compose Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)', maxHeight: '92vh' }}>
            {/* Header */}
            <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                  <Mail className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {emailMode === 'send' ? 'E-Mail verfassen' : 'E-Mail planen'}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>An {clientEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Vorlage picker */}
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  E-Mail Vorlage
                </p>
                <EmailVorlagePicker
                  category="fragebogen"
                  onSelect={(subject, body) => { setEmailSubject(subject); setEmailMessage(body) }}
                  vars={{ client_name: clientName, project_title: questionnaire?.title }}
                  label="Select template"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Betreff
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="input-base w-full"
                  placeholder="E-Mail Betreff..."
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Nachricht
                </label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={10}
                  className="input-base w-full resize-none"
                  style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
                  placeholder="Deine Nachricht an den Kunden..."
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  The questionnaire button will be automatically added to the email.
                </p>
              </div>

              {/* Schedule date/time — only in schedule mode */}
              {emailMode === 'schedule' && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: '#8B5CF6' }}>Versandzeitpunkt</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Datum *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={e => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="input-base w-full pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Uhrzeit</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                          className="input-base w-full pl-9"
                        />
                      </div>
                    </div>
                  </div>
                  {scheduleDate && (
                    <p className="text-[12px] font-medium" style={{ color: '#8B5CF6' }}>
                      📅 Wird gesendet am {new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {scheduleTime} Uhr
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowEmailModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={emailMode === 'send' ? sendQuestionnaire : handleSchedule}
                disabled={emailMode === 'send' ? (sending || !emailMessage.trim()) : (scheduling || !scheduleDate)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: '#8B5CF6', boxShadow: '0 1px 8px rgba(139,92,246,0.25)' }}
              >
                {(sending || scheduling)
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : emailMode === 'send'
                    ? <><Send className="w-4 h-4" />Jetzt senden</>
                    : <><Calendar className="w-4 h-4" />Planen</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vorlagen Picker Modal ── */}
      {showVorlagenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowVorlagenModal(false) }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)', maxHeight: '88vh' }}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Select template</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Choose a template and customize it</p>
                </div>
              </div>
              <button
                onClick={() => setShowVorlagenModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* My templates */}
              {loadingTemplates ? (
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded shimmer" />
                  <div className="h-14 rounded-xl shimmer" />
                  <div className="h-14 rounded-xl shimmer" />
                </div>
              ) : customTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookmarkCheck className="w-3.5 h-3.5" style={{ color: '#8B5CF6' }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>My templates</p>
                  </div>
                  <div className="space-y-2">
                    {customTemplates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setTitle(tpl.title)
                          setQuestions(tpl.questions.map(q => ({ ...q })))
                          setShowVorlagenModal(false)
                          setShowBuilder(true)
                        }}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:opacity-90 group"
                        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(139,92,246,0.15)' }}>
                          <ClipboardCheck className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{tpl.title}</p>
                          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {tpl.questions.length} Fragen · Erstellt {new Date(tpl.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: '#8B5CF6' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider if both sections exist */}
              {customTemplates.length > 0 && !loadingTemplates && (
                <div style={{ height: 1, background: 'var(--border-color)' }} />
              )}

              {/* Standard Vorlagen */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Default templates</p>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'hochzeit', emoji: '💍', label: 'Wedding — Questionnaire', desc: 'Ceremony, reception, guests & special wishes', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
                    { key: 'portrait', emoji: '📸', label: 'Portrait Shoot — Questionnaire', desc: 'Style, look, references & wishes', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)' },
                    { key: 'event',   emoji: '🎉', label: 'Event — Fragebogen', desc: 'Ablauf, Personen & Programmpunkte', color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)' },
                  ].map(tpl => {
                    const tplData = QUESTIONNAIRE_TEMPLATES.find(t => t.key === tpl.key)
                    return (
                      <button
                        key={tpl.key}
                        onClick={() => {
                          loadTemplate(tpl.key)
                          setShowVorlagenModal(false)
                          setShowBuilder(true)
                        }}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:opacity-90 group"
                        style={{ background: tpl.bg, border: `1px solid ${tpl.border}` }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                          style={{ background: 'rgba(255,255,255,0.15)' }}>
                          {tpl.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{tpl.label}</p>
                          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {tpl.desc} · {tplData?.questions.length} Fragen
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: tpl.color }} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-color)' }} />

              {/* Eigener Fragebogen */}
              <button
                onClick={() => {
                  setShowVorlagenModal(false)
                  openBuilder()
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:opacity-90 group"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                  <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Eigener Fragebogen</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Von Grund auf neu erstellen</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Modal (legacy, kept for safety) ── */}
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
              <button onClick={() => setShowScheduleModal(false)} className="btn-secondary flex-1">Cancel</button>
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
