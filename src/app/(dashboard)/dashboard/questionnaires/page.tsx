'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, ArrowUpRight, Clock, CheckCircle2, Send, FolderOpen,
  Plus, Sparkles, ChevronRight, ClipboardCheck, PenLine, BookmarkCheck, Trash2,
  X, AlignLeft, List, ToggleLeft, CheckSquare, ChevronDown, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuestionnaireTemplatesForLocale, type Question } from '@/lib/questionnaireTemplates'
import { useLocale } from '@/hooks/useLocale'

interface QuestionnaireRow {
  id: string
  title: string
  sent_at: string | null
  created_at: string
  scheduled_at?: string | null
  project: { id: string; title: string } | null
  submission: { submitted_at: string } | null
}

interface CustomTemplate {
  id: string
  title: string
  questions: Question[]
  created_at: string
}

function getStatus(q: QuestionnaireRow): 'draft' | 'not_sent' | 'scheduled' | 'completed' {
  const hasSub = Array.isArray(q.submission) ? q.submission.length > 0 : !!q.submission
  if (hasSub) return 'completed'
  if (q.scheduled_at) return 'scheduled'
  if (q.sent_at) return 'not_sent'
  return 'draft'
}

const TEMPLATE_ACCENTS = [
  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)' },
  { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)' },
]

const CUSTOM_ACCENT = { color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' }

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'Questionnaires',
    subtitle: (n: number) => `${n} ${n === 1 ? 'Questionnaire' : 'Questionnaires'} · All client questionnaires at a glance`,
    defaultTemplates: 'Default templates',
    myTemplates: 'My templates',
    newTemplate: 'New template',
    newTemplateDesc: 'Create and save your own questionnaire',
    createTemplate: 'Create template',
    noCustomTemplates: 'No custom templates yet',
    noCustomTemplatesDesc: 'Open a questionnaire and click "Save as template" to save it here',
    question: 'question',
    questions: 'questions',
    saved: 'Saved',
    use: 'Use',
    preview: 'Preview',
    filterAll: 'All',
    statusDraft: 'Draft',
    statusSent: 'Sent',
    statusScheduled: 'Scheduled',
    statusCompleted: 'Completed',
    noQuestionnaires: 'No questionnaires yet',
    noQuestionnairesFilter: (label: string) => `No "${label}" questionnaires`,
    noQuestionnairesHint: 'Select a template above or create questionnaires directly in a project',
    completed: 'Completed',
    scheduled: 'Scheduled',
    created: 'Created',
    builderTitle: 'Edit questionnaire & save',
    builderSubtitle: 'Adjust the questions and save the questionnaire',
    builderTitleLabel: 'Title *',
    builderTitlePlaceholder: 'e.g. Wedding questionnaire',
    builderQuestionsLabel: (n: number) => `Questions (${n})`,
    builderAddQuestion: 'Add question',
    builderNoQuestions: 'No questions yet — add questions',
    builderQuestionPlaceholder: 'Enter question...',
    builderRequired: 'Required',
    builderOptionsLabel: 'Options (comma-separated)',
    builderOptionsPlaceholder: 'Option 1, Option 2, Option 3',
    builderCancel: 'Cancel',
    builderSave: 'Save & Create',
    typeShortText: 'Short text',
    typeLongText: 'Long text',
    typeSingleChoice: 'Single choice',
    typeMultipleChoice: 'Multiple choice',
    typeYesNo: 'Yes / No',
    errorTitle: 'Please enter a title',
    errorQuestion: 'Add at least one question',
    errorCreating: 'Error creating',
    errorDeleting: 'Error deleting',
    successCreated: (title: string) => `"${title}" created!`,
    successDeleted: 'Questionnaire deleted',
    successTemplateDeleted: 'Template deleted',
    confirmDeleteQ: (title: string) => `Really delete questionnaire "${title}"?`,
    confirmDeleteT: (title: string) => `Really delete template "${title}"?`,
    templateCards: [
      { key: 'hochzeit', label: 'Wedding questionnaire',  desc: 'Ceremony, reception, guests & special wishes' },
      { key: 'portrait', label: 'Portrait Shooting',       desc: 'Style, look, references & wishes' },
      { key: 'event',    label: 'Event questionnaire',     desc: 'Schedule, people & program items' },
    ],
  },
  de: {
    title: 'Fragebögen',
    subtitle: (n: number) => `${n} ${n === 1 ? 'Fragebogen' : 'Fragebögen'} · Alle Kundenfragebögen auf einen Blick`,
    defaultTemplates: 'Standard-Vorlagen',
    myTemplates: 'Meine Vorlagen',
    newTemplate: 'Neue Vorlage',
    newTemplateDesc: 'Erstelle und speichere deinen eigenen Fragebogen',
    createTemplate: 'Vorlage erstellen',
    noCustomTemplates: 'Noch keine eigenen Vorlagen',
    noCustomTemplatesDesc: 'Öffne einen Fragebogen und klicke auf "Als Vorlage speichern"',
    question: 'Frage',
    questions: 'Fragen',
    saved: 'Gespeichert',
    use: 'Verwenden',
    preview: 'Vorschau',
    filterAll: 'Alle',
    statusDraft: 'Entwurf',
    statusSent: 'Gesendet',
    statusScheduled: 'Geplant',
    statusCompleted: 'Abgeschlossen',
    noQuestionnaires: 'Noch keine Fragebögen',
    noQuestionnairesFilter: (label: string) => `Keine "${label}"-Fragebögen`,
    noQuestionnairesHint: 'Wähle eine Vorlage oben oder erstelle Fragebögen direkt in einem Projekt',
    completed: 'Abgeschlossen',
    scheduled: 'Geplant',
    created: 'Erstellt',
    builderTitle: 'Fragebogen bearbeiten & speichern',
    builderSubtitle: 'Passe die Fragen an und speichere den Fragebogen',
    builderTitleLabel: 'Titel *',
    builderTitlePlaceholder: 'z.B. Hochzeits-Fragebogen',
    builderQuestionsLabel: (n: number) => `Fragen (${n})`,
    builderAddQuestion: 'Frage hinzufügen',
    builderNoQuestions: 'Noch keine Fragen — füge Fragen hinzu',
    builderQuestionPlaceholder: 'Frage eingeben...',
    builderRequired: 'Pflichtfeld',
    builderOptionsLabel: 'Optionen (kommagetrennt)',
    builderOptionsPlaceholder: 'Option 1, Option 2, Option 3',
    builderCancel: 'Abbrechen',
    builderSave: 'Speichern & Erstellen',
    typeShortText: 'Kurztext',
    typeLongText: 'Langtext',
    typeSingleChoice: 'Einfachauswahl',
    typeMultipleChoice: 'Mehrfachauswahl',
    typeYesNo: 'Ja / Nein',
    errorTitle: 'Bitte einen Titel eingeben',
    errorQuestion: 'Mindestens eine Frage hinzufügen',
    errorCreating: 'Fehler beim Erstellen',
    errorDeleting: 'Fehler beim Löschen',
    successCreated: (title: string) => `"${title}" erstellt!`,
    successDeleted: 'Fragebogen gelöscht',
    successTemplateDeleted: 'Vorlage gelöscht',
    confirmDeleteQ: (title: string) => `Fragebogen "${title}" wirklich löschen?`,
    confirmDeleteT: (title: string) => `Vorlage "${title}" wirklich löschen?`,
    templateCards: [
      { key: 'hochzeit', label: 'Hochzeits-Fragebogen',   desc: 'Trauung, Feier, Gäste & besondere Wünsche' },
      { key: 'portrait', label: 'Portrait-Shooting',       desc: 'Stil, Look, Referenzen & Wünsche' },
      { key: 'event',    label: 'Event-Fragebogen',        desc: 'Ablauf, Personen & Programmpunkte' },
    ],
  },
}

export default function QuestionnairesPage() {
  const locale = useLocale()
  const t = T[locale]
  const QUESTIONNAIRE_TEMPLATES = getQuestionnaireTemplatesForLocale(locale)

  const STATUS_CONFIG = {
    draft:     { label: t.statusDraft,     color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', icon: PenLine },
    not_sent:  { label: t.statusSent,      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: Send },
    scheduled: { label: t.statusScheduled, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: Calendar },
    completed: { label: t.statusCompleted, color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2 },
  }

  const TYPE_LABELS: Record<string, string> = {
    text:     t.typeShortText,
    textarea: t.typeLongText,
    choice:   t.typeSingleChoice,
    checkbox: t.typeMultipleChoice,
    yesno:    t.typeYesNo,
  }

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    text:     <AlignLeft className="w-3.5 h-3.5" />,
    textarea: <AlignLeft className="w-3.5 h-3.5" />,
    choice:   <List className="w-3.5 h-3.5" />,
    checkbox: <CheckSquare className="w-3.5 h-3.5" />,
    yesno:    <ToggleLeft className="w-3.5 h-3.5" />,
  }

  const [rows, setRows] = useState<QuestionnaireRow[]>([])
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'not_sent' | 'scheduled' | 'completed'>('all')
  const [creating, setCreating] = useState<string | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null)
  const [deletingRow, setDeletingRow] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderTitle, setBuilderTitle] = useState('')
  const [builderQuestions, setBuilderQuestions] = useState<Question[]>([])
  const [builderSaving, setBuilderSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: questionnaires }, { data: templates }] = await Promise.all([
        supabase
          .from('questionnaires')
          .select(`
            id, title, sent_at, created_at,
            project:projects(id, title),
            submission:questionnaire_submissions(submitted_at)
          `)
          .eq('photographer_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('questionnaire_templates')
          .select('id, title, questions, created_at')
          .eq('photographer_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setRows((questionnaires as unknown as QuestionnaireRow[]) || [])
      setCustomTemplates((templates as CustomTemplate[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const openBuilderFromTemplate = async (key: string, customTpl?: CustomTemplate) => {
    let title = locale === 'de' ? 'Neuer Fragebogen' : 'New questionnaire'
    let questions: Question[] = []

    if (customTpl) {
      title = customTpl.title
      questions = customTpl.questions.map(q => ({ ...q }))
    } else if (key !== 'blank') {
      const tpl = QUESTIONNAIRE_TEMPLATES.find(t => t.key === key)
      if (tpl) {
        title = tpl.title
        questions = tpl.questions.map(q => ({ ...q }))
      }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('questionnaires')
      .insert({ photographer_id: user.id, title, questions })
      .select('id')
      .single()

    if (error) { toast.error(t.errorCreating); return }

    router.push(`/dashboard/questionnaires/${data.id}`)
  }

  const builderAddQuestion = () => {
    const id = `q${Date.now()}`
    setBuilderQuestions(prev => [...prev, { id, type: 'text', label: '', required: false }])
  }

  const builderUpdateQuestion = (id: string, patch: Partial<Question>) => {
    setBuilderQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const builderRemoveQuestion = (id: string) => {
    setBuilderQuestions(prev => prev.filter(q => q.id !== id))
  }

  const builderSave = async () => {
    if (!builderTitle.trim()) { toast.error(t.errorTitle); return }
    if (builderQuestions.length === 0) { toast.error(t.errorQuestion); return }
    setBuilderSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBuilderSaving(false); return }

    const { data, error } = await supabase
      .from('questionnaires')
      .insert({ photographer_id: user.id, title: builderTitle.trim(), questions: builderQuestions })
      .select('id')
      .single()

    if (error) { toast.error(t.errorCreating); setBuilderSaving(false); return }

    toast.success(t.successCreated(builderTitle.trim()))
    setRows(prev => [{
      id: data.id,
      title: builderTitle.trim(),
      sent_at: null,
      created_at: new Date().toISOString(),
      project: null,
      submission: null,
    }, ...prev])
    setBuilderSaving(false)
    setBuilderOpen(false)
  }

  const createFromTemplate = async (key: string) => {
    setCreating(key)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const blankTitle = locale === 'de' ? 'Neuer Fragebogen' : 'New questionnaire'
      const { data, error } = await supabase
        .from('questionnaires')
        .insert({ photographer_id: user.id, title: blankTitle, questions: [] })
        .select('id')
        .single()

      if (error) { toast.error(t.errorCreating); return }

      toast.success(locale === 'de' ? 'Fragebogen erstellt!' : 'Questionnaire created!')
      setRows(prev => [{
        id: data.id,
        title: blankTitle,
        sent_at: null,
        created_at: new Date().toISOString(),
        project: null,
        submission: null,
      }, ...prev])
    } finally {
      setCreating(null)
    }
  }

  const deleteRow = async (rowId: string, rowTitle: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(t.confirmDeleteQ(rowTitle))) return
    setDeletingRow(rowId)
    const { error } = await supabase.from('questionnaires').delete().eq('id', rowId)
    if (error) {
      toast.error(t.errorDeleting)
    } else {
      setRows(prev => prev.filter(r => r.id !== rowId))
      toast.success(t.successDeleted)
    }
    setDeletingRow(null)
  }

  const deleteCustomTemplate = async (tplId: string, tplTitle: string) => {
    if (!confirm(t.confirmDeleteT(tplTitle))) return
    setDeletingTemplate(tplId)
    const { error } = await supabase.from('questionnaire_templates').delete().eq('id', tplId)
    if (error) {
      toast.error(t.errorDeleting)
    } else {
      setCustomTemplates(prev => prev.filter(t => t.id !== tplId))
      toast.success(t.successTemplateDeleted)
    }
    setDeletingTemplate(null)
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => getStatus(r) === filter)

  const counts = {
    all:       rows.length,
    draft:     rows.filter(r => getStatus(r) === 'draft').length,
    not_sent:  rows.filter(r => getStatus(r) === 'not_sent').length,
    scheduled: rows.filter(r => getStatus(r) === 'scheduled').length,
    completed: rows.filter(r => getStatus(r) === 'completed').length,
  }

  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'

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
          {t.title}
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.subtitle(rows.length)}
        </p>
      </div>

      {/* Default templates */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t.defaultTemplates}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Blank template card */}
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
                  {t.newTemplate}
                </p>
                <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {t.newTemplateDesc}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>
                <PenLine className="w-3.5 h-3.5" />
                {t.createTemplate}
              </div>
            </div>
          </button>

          {/* Built-in template cards */}
          {t.templateCards.map((tplCard, idx) => {
            const accent = TEMPLATE_ACCENTS[idx]
            return (
              <div
                key={tplCard.key}
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
                <div className="h-[3px] w-full" style={{ background: accent.color, opacity: 0.7 }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
                  >
                    <ClipboardCheck className="w-5 h-5" style={{ color: accent.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {tplCard.label}
                    </p>
                    <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {tplCard.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => {/* preview — future */ }}
                      className="flex-1 flex items-center justify-center text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                    >
                      {t.preview}
                    </button>
                    <button
                      onClick={() => openBuilderFromTemplate(tplCard.key)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                    >
                      {t.use} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* My templates (custom) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookmarkCheck className="w-4 h-4" style={{ color: CUSTOM_ACCENT.color }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t.myTemplates}
          </h2>
          {customTemplates.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: CUSTOM_ACCENT.bg, color: CUSTOM_ACCENT.color, border: `1px solid ${CUSTOM_ACCENT.border}` }}
            >
              {customTemplates.length}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {customTemplates.length === 0 ? (
            <div
              className="col-span-full flex flex-col items-center justify-center py-10 rounded-2xl text-center"
              style={{ border: '2px dashed var(--border-color)', background: 'var(--bg-surface)' }}
            >
              <BookmarkCheck className="w-8 h-8 mb-3 opacity-30" style={{ color: CUSTOM_ACCENT.color }} />
              <p className="text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>{t.noCustomTemplates}</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                {t.noCustomTemplatesDesc}
              </p>
            </div>
          ) : customTemplates.map((tpl) => {
            const isDeleting = deletingTemplate === tpl.id
            return (
              <div
                key={tpl.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${CUSTOM_ACCENT.color}10 0%, ${CUSTOM_ACCENT.color}04 100%)`,
                  border: `1px solid ${CUSTOM_ACCENT.color}28`,
                  boxShadow: `0 2px 12px ${CUSTOM_ACCENT.color}08`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 24px ${CUSTOM_ACCENT.color}18`
                  e.currentTarget.style.borderColor = CUSTOM_ACCENT.color + '45'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = `0 2px 12px ${CUSTOM_ACCENT.color}08`
                  e.currentTarget.style.borderColor = CUSTOM_ACCENT.color + '28'
                }}
              >
                <div className="h-[3px] w-full" style={{ background: CUSTOM_ACCENT.color, opacity: 0.7 }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: CUSTOM_ACCENT.bg, border: `1px solid ${CUSTOM_ACCENT.border}` }}
                    >
                      <BookmarkCheck className="w-5 h-5" style={{ color: CUSTOM_ACCENT.color }} />
                    </div>
                    <button
                      onClick={() => deleteCustomTemplate(tpl.id, tpl.title)}
                      disabled={isDeleting}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                      title={locale === 'de' ? 'Vorlage löschen' : 'Delete template'}
                    >
                      {isDeleting
                        ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {tpl.title}
                    </p>
                    <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {tpl.questions.length} {tpl.questions.length === 1 ? t.question : t.questions} · {t.saved} {new Date(tpl.created_at).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <button
                    onClick={() => openBuilderFromTemplate('', tpl)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl transition-all hover:opacity-90"
                    style={{ background: CUSTOM_ACCENT.bg, color: CUSTOM_ACCENT.color, border: `1px solid ${CUSTOM_ACCENT.border}` }}
                  >
                    {t.use} <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'draft', 'not_sent', 'scheduled', 'completed'] as const).map(f => {
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
              {f === 'all' ? t.filterAll : cfg!.label}
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
              <Link
                key={q.id}
                href={`/dashboard/questionnaires/${q.id}`}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sc.color + '40' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: sc.bg }}
                >
                  <ClipboardList className="w-4 h-4" style={{ color: sc.color }} />
                </div>

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

                <div className="hidden sm:block flex-shrink-0 text-right">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {status === 'completed' && q.submission
                      ? `${t.completed} ${new Date(Array.isArray(q.submission) ? q.submission[0]?.submitted_at : q.submission.submitted_at).toLocaleDateString(dateLocale)}`
                      : status === 'scheduled' && q.scheduled_at
                      ? `${t.scheduled} ${new Date(q.scheduled_at).toLocaleDateString(dateLocale)}`
                      : `${t.created} ${new Date(q.created_at).toLocaleDateString(dateLocale)}`
                    }
                  </p>
                </div>

                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 text-[11px] font-bold"
                  style={{ background: sc.bg, color: sc.color }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </div>

                <button
                  onClick={e => deleteRow(q.id, q.title, e)}
                  disabled={deletingRow === q.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  style={{ background: 'rgba(196,59,44,0.10)', color: '#C43B2C' }}
                  title={locale === 'de' ? 'Fragebogen löschen' : 'Delete questionnaire'}
                >
                  {deletingRow === q.id
                    ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>
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
            {filter === 'all' ? t.noQuestionnaires : t.noQuestionnairesFilter(STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.label)}
          </h3>
          <p className="text-[13px] max-w-xs" style={{ color: 'var(--text-muted)' }}>
            {t.noQuestionnairesHint}
          </p>
        </div>
      )}

      {/* Builder Modal */}
      {builderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setBuilderOpen(false) }}
        >
          <div
            className="modal-glass w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
          >
            <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="font-black text-[16px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {t.builderTitle}
                </h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.builderSubtitle}</p>
              </div>
              <button
                onClick={() => setBuilderOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.builderTitleLabel}</label>
                <input
                  type="text"
                  value={builderTitle}
                  onChange={e => setBuilderTitle(e.target.value)}
                  placeholder={t.builderTitlePlaceholder}
                  className="input-base w-full"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                    {t.builderQuestionsLabel(builderQuestions.length)}
                  </p>
                  <button
                    onClick={builderAddQuestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.builderAddQuestion}
                  </button>
                </div>

                {builderQuestions.length === 0 && (
                  <div className="text-center py-8 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.builderNoQuestions}</p>
                  </div>
                )}

                {builderQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={q.label}
                        onChange={e => builderUpdateQuestion(q.id, { label: e.target.value })}
                        placeholder={t.builderQuestionPlaceholder}
                        className="flex-1 bg-transparent text-[13px] outline-none font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button onClick={() => builderRemoveQuestion(q.id)} className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ color: '#C43B2C' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative">
                        <select
                          value={q.type}
                          onChange={e => builderUpdateQuestion(q.id, { type: e.target.value as Question['type'] })}
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
                          onClick={() => builderUpdateQuestion(q.id, { required: !q.required })}
                          className="relative rounded-full cursor-pointer"
                          style={{ width: '28px', height: '16px', background: q.required ? 'var(--accent)' : 'var(--border-strong)', transition: 'background 150ms' }}
                        >
                          <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow"
                            style={{ left: q.required ? '13px' : '2px', transition: 'left 150ms' }} />
                        </div>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.builderRequired}</span>
                      </label>
                    </div>
                    {(q.type === 'choice' || q.type === 'checkbox') && (
                      <div className="space-y-1.5">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.builderOptionsLabel}</p>
                        <input
                          type="text"
                          value={(q.options || []).join(', ')}
                          onChange={e => builderUpdateQuestion(q.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder={t.builderOptionsPlaceholder}
                          className="input-base w-full text-[12px]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBuilderOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                >
                  {t.builderCancel}
                </button>
                <button
                  onClick={builderSave}
                  disabled={builderSaving || !builderTitle.trim() || builderQuestions.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {builderSaving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><CheckCircle2 className="w-4 h-4" />{t.builderSave}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
