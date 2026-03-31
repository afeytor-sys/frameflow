'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getContractTemplatesForLocale } from '@/lib/contractTemplates'
import {
  Plus, X, ChevronRight, Check,
  BookOpen, BookMarked, Sparkles, PenLine, Trash2, ArrowLeft,
} from 'lucide-react'
import ContractEditor from '@/components/dashboard/ContractEditor'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'

interface UserTemplate {
  id: string
  name: string
  description: string | null
  content: string
}

interface Project {
  id: string
  title: string
  client_id: string | null
  clients: { full_name: string } | null
}

interface Props {
  userTemplates: UserTemplate[]
  projects: Project[]
}

const TEMPLATE_ACCENTS = [
  { bg: 'rgba(232,162,26,0.10)', color: '#E8A21A', border: 'rgba(232,162,26,0.20)' },
  { bg: 'rgba(61,186,111,0.10)', color: '#3DBA6F', border: 'rgba(61,186,111,0.20)' },
  { bg: 'rgba(99,102,241,0.10)', color: '#6366F1', border: 'rgba(99,102,241,0.20)' },
  { bg: 'rgba(236,72,153,0.10)', color: '#EC4899', border: 'rgba(236,72,153,0.20)' },
]

type TemplateKey = string

interface TemplateOption {
  kind: 'builtin' | 'user'
  id: string
  name: string
  description: string | null
  content: string
}

const T = {
  en: {
    title: 'Templates',
    subtitle: 'Manage and create contract templates',
    back: 'Back to Contracts',
    myTemplates: 'My templates',
    defaultTemplates: 'Default templates',
    newTemplate: 'New template',
    newTemplateDesc: 'Create and save your own contract template',
    createTemplate: 'Create template',
    preview: 'Preview',
    use: 'Use',
    deleteTemplateConfirm: 'Really delete this template?',
    templateDeleted: 'Template deleted',
    createNewTemplate: 'Create new template',
    createNewTemplateDesc: 'Save your own contract template',
    nameLabel: 'Name *',
    descLabel: 'Description (optional)',
    namePlaceholder: 'e.g. My Wedding Contract',
    descPlaceholder: 'Short description of the template',
    startFromTemplate: 'Start from default template',
    contractContent: 'Contract content',
    contentPlaceholder: 'Enter contract text here...',
    saveTemplate: 'Save template',
    errorName: 'Please enter a name',
    errorSaving: 'Error saving template',
    successTemplateSaved: 'Template saved!',
    close: 'Close',
    useThisTemplate: 'Use this template',
    // New contract modal
    newContractTitle: 'New contract',
    templateLabel: 'Template',
    blank: 'Blank',
    titleLabel: 'Title',
    titlePlaceholder: 'e.g. Photography Contract',
    projectLabel: 'Project *',
    projectPlaceholder: 'Select project...',
    noProject: 'No project found.',
    noProjectLink: 'Create project →',
    cancel: 'Cancel',
    createAndEdit: 'Create & edit',
    templateUsed: 'Template:',
    errorProject: 'Please select a project',
    errorCreating: 'Error creating contract',
    successCreated: 'Contract created!',
  },
  de: {
    title: 'Vorlagen',
    subtitle: 'Vertragsvorlagen verwalten und erstellen',
    back: 'Zurück zu Verträgen',
    myTemplates: 'Meine Vorlagen',
    defaultTemplates: 'Standard-Vorlagen',
    newTemplate: 'Neue Vorlage',
    newTemplateDesc: 'Eigene Vertragsvorlage erstellen und speichern',
    createTemplate: 'Vorlage erstellen',
    preview: 'Vorschau',
    use: 'Verwenden',
    deleteTemplateConfirm: 'Diese Vorlage wirklich löschen?',
    templateDeleted: 'Vorlage gelöscht',
    createNewTemplate: 'Neue Vorlage erstellen',
    createNewTemplateDesc: 'Eigene Vertragsvorlage speichern',
    nameLabel: 'Name *',
    descLabel: 'Beschreibung (optional)',
    namePlaceholder: 'z.B. Mein Hochzeitsvertrag',
    descPlaceholder: 'Kurze Beschreibung der Vorlage',
    startFromTemplate: 'Von Standard-Vorlage starten',
    contractContent: 'Vertragsinhalt',
    contentPlaceholder: 'Vertragstext hier eingeben...',
    saveTemplate: 'Vorlage speichern',
    errorName: 'Bitte einen Namen eingeben',
    errorSaving: 'Fehler beim Speichern der Vorlage',
    successTemplateSaved: 'Vorlage gespeichert!',
    close: 'Schließen',
    useThisTemplate: 'Diese Vorlage verwenden',
    // New contract modal
    newContractTitle: 'Neuer Vertrag',
    templateLabel: 'Vorlage',
    blank: 'Leer',
    titleLabel: 'Titel',
    titlePlaceholder: 'z.B. Fotografievertrag',
    projectLabel: 'Projekt *',
    projectPlaceholder: 'Projekt auswählen...',
    noProject: 'Kein Projekt vorhanden.',
    noProjectLink: 'Projekt erstellen →',
    cancel: 'Abbrechen',
    createAndEdit: 'Erstellen & bearbeiten',
    templateUsed: 'Vorlage:',
    errorProject: 'Bitte ein Projekt auswählen',
    errorCreating: 'Fehler beim Erstellen des Vertrags',
    successCreated: 'Vertrag erstellt!',
  },
}

export default function TemplatesClient({ userTemplates: initialUserTemplates, projects }: Props) {
  const locale = useLocale()
  const t = T[locale]
  const CONTRACT_TEMPLATES = getContractTemplatesForLocale(locale)
  const router = useRouter()

  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)

  // Preview modal
  const [previewKey, setPreviewKey] = useState<TemplateKey | null>(null)

  // New template modal
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [newTplName, setNewTplName] = useState('')
  const [newTplDesc, setNewTplDesc] = useState('')
  const [newTplContent, setNewTplContent] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // New contract modal (triggered from "Use" button)
  const [showContractModal, setShowContractModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<TemplateKey | null>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [contractTitle, setContractTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const getTemplate = (key: TemplateKey): TemplateOption | null => {
    if (key.startsWith('builtin:')) {
      const tpl = CONTRACT_TEMPLATES.find((t) => t.id === key.slice(8))
      return tpl ? { kind: 'builtin', ...tpl } : null
    }
    if (key.startsWith('user:')) {
      const tpl = userTemplates.find((t) => t.id === key.slice(5))
      return tpl ? { kind: 'user', ...tpl } : null
    }
    return null
  }

  const openNewContract = (key?: TemplateKey) => {
    if (key) {
      const tpl = getTemplate(key)
      if (tpl) { setSelectedKey(key); setContractTitle(tpl.name) }
    } else {
      setSelectedKey(null)
      setContractTitle(locale === 'de' ? 'Fotografievertrag' : 'Photography Contract')
    }
    setSelectedProject('')
    setShowContractModal(true)
  }

  const handleCreate = async () => {
    if (!selectedProject) { toast.error(t.errorProject); return }
    setSaving(true)
    const supabase = createClient()
    const tpl = selectedKey ? getTemplate(selectedKey) : null

    const { error } = await supabase.from('contracts').insert({
      project_id: selectedProject,
      title: contractTitle,
      content: tpl?.content ?? '',
      status: 'draft',
    })

    if (error) { toast.error(t.errorCreating); setSaving(false); return }

    toast.success(t.successCreated)
    setShowContractModal(false)
    setSaving(false)
    router.push(`/dashboard/projects/${selectedProject}?tab=contracts`)
  }

  const handleDeleteUserTemplate = async (id: string) => {
    if (!confirm(t.deleteTemplateConfirm)) return
    const supabase = createClient()
    await supabase.from('contract_templates').delete().eq('id', id)
    setUserTemplates((prev) => prev.filter((t) => t.id !== id))
    toast.success(t.templateDeleted)
  }

  const handleCreateTemplate = async () => {
    if (!newTplName.trim()) { toast.error(t.errorName); return }
    setSavingTemplate(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSavingTemplate(false); return }
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          photographer_id: user.id,
          name: newTplName.trim(),
          description: newTplDesc.trim() || null,
          content: newTplContent,
        })
        .select().single()
      if (error) {
        toast.error(error.code === '42P01'
          ? 'Template feature not yet available. Please run migration.'
          : `${t.errorSaving}: ${error.message}`)
        setSavingTemplate(false)
        return
      }
      setUserTemplates(prev => [...prev, data as UserTemplate])
      setShowNewTemplateModal(false)
      setNewTplName('')
      setNewTplDesc('')
      setNewTplContent('')
      toast.success(t.successTemplateSaved)
    } catch (err) {
      console.error(err)
      toast.error(t.errorSaving)
    } finally {
      setSavingTemplate(false)
    }
  }

  const previewTpl = previewKey ? getTemplate(previewKey) : null

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tpl-card {
          transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease !important;
        }
        .tpl-card:hover {
          transform: translateY(-2px) !important;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard/contracts"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1
              className="font-black"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
            >
              {t.title}
            </h1>
          </div>
          <p className="text-[14px] mt-1 ml-11" style={{ color: 'var(--text-muted)' }}>
            {t.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowNewTemplateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 1px 8px rgba(196,164,124,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          {t.newTemplate}
        </button>
      </div>

      {/* ── My Templates ── */}
      {userTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookMarked className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {t.myTemplates}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {userTemplates.map((tpl, i) => {
              const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
              return (
                <div
                  key={tpl.id}
                  className="tpl-card rounded-xl overflow-hidden flex flex-col gap-0 group"
                  style={{
                    background: `linear-gradient(135deg, ${accent.color}12 0%, ${accent.color}04 100%)`,
                    border: `1px solid ${accent.color}28`,
                    boxShadow: `0 2px 12px ${accent.color}10`,
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: `${i * 60}ms`,
                    opacity: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${accent.color}22`; e.currentTarget.style.borderColor = accent.color + '45' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 12px ${accent.color}10`; e.currentTarget.style.borderColor = accent.color + '28' }}
                >
                  <div className="h-[3px] w-full" style={{ background: accent.color, opacity: 0.7 }} />
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
                      >
                        <BookMarked className="w-5 h-5" style={{ color: accent.color }} />
                      </div>
                      <button
                        onClick={() => handleDeleteUserTemplate(tpl.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#E84C1A'; e.currentTarget.style.background = 'rgba(232,76,26,0.10)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                        title={locale === 'de' ? 'Vorlage löschen' : 'Delete template'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                      {tpl.description && (
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewKey(`user:${tpl.id}`)}
                        className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      >
                        {t.preview}
                      </button>
                      <button
                        onClick={() => openNewContract(`user:${tpl.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                        style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                      >
                        {t.use}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Standard Templates ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t.defaultTemplates}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Create new template card */}
          <button
            onClick={() => setShowNewTemplateModal(true)}
            className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:scale-[1.01] text-left group"
            style={{ background: 'var(--bg-surface)', border: '2px dashed var(--border-color)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
            >
              <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.newTemplate}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t.newTemplateDesc}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>
              <PenLine className="w-3.5 h-3.5" />
              {t.createTemplate}
            </div>
          </button>

          {CONTRACT_TEMPLATES.map((tpl, i) => {
            const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
            return (
              <div
                key={tpl.id}
                className="tpl-card rounded-xl overflow-hidden flex flex-col gap-0 group"
                style={{
                  background: `linear-gradient(135deg, ${accent.color}12 0%, ${accent.color}04 100%)`,
                  border: `1px solid ${accent.color}28`,
                  boxShadow: `0 2px 12px ${accent.color}10`,
                  animation: 'fadeSlideUp 0.4s ease forwards',
                  animationDelay: `${(i + 1) * 60}ms`,
                  opacity: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${accent.color}22`; e.currentTarget.style.borderColor = accent.color + '45' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 12px ${accent.color}10`; e.currentTarget.style.borderColor = accent.color + '28' }}
              >
                <div className="h-[3px] w-full" style={{ background: accent.color, opacity: 0.7 }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
                  >
                    <BookOpen className="w-5 h-5" style={{ color: accent.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewKey(`builtin:${tpl.id}`)}
                      className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                      {t.preview}
                    </button>
                    <button
                      onClick={() => openNewContract(`builtin:${tpl.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                    >
                      {t.use}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── New Template Modal ── */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-glass w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col" style={{ height: 'min(92vh, 900px)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{t.createNewTemplate}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.createNewTemplateDesc}</p>
              </div>
              <button
                onClick={() => setShowNewTemplateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.nameLabel}</label>
                  <input type="text" value={newTplName} onChange={e => setNewTplName(e.target.value)} placeholder={t.namePlaceholder} className="input-base w-full" autoFocus />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.descLabel}</label>
                  <input type="text" value={newTplDesc} onChange={e => setNewTplDesc(e.target.value)} placeholder={t.descPlaceholder} className="input-base w-full" />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>{t.startFromTemplate}</label>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_TEMPLATES.map((tpl, i) => {
                    const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => { setNewTplName(tpl.name); setNewTplDesc(tpl.description); setNewTplContent(tpl.content); setEditorKey(k => k + 1) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                      >
                        <BookOpen className="w-3 h-3" />
                        {tpl.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.contractContent}</label>
                <ContractEditor key={editorKey} content={newTplContent} onChange={setNewTplContent} placeholder={t.contentPlaceholder} />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowNewTemplateModal(false)} className="btn-secondary flex-1">{t.cancel}</button>
              <button
                onClick={handleCreateTemplate}
                disabled={savingTemplate || !newTplName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                {savingTemplate
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><BookMarked className="w-4 h-4" />{t.saveTemplate}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Contract Modal ── */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-glass w-full max-w-md rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{t.newContractTitle}</h2>
                {selectedKey && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t.templateUsed} {getTemplate(selectedKey)?.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowContractModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.titleLabel}</label>
                <input type="text" value={contractTitle} onChange={(e) => setContractTitle(e.target.value)} className="input-base w-full" placeholder={t.titlePlaceholder} />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.projectLabel}</label>
                {projects.length > 0 ? (
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="input-base w-full"
                    style={{ color: selectedProject ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    <option value="">{t.projectPlaceholder}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}{p.clients?.full_name ? ` — ${p.clients.full_name}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {t.noProject}{' '}
                    <a href="/dashboard/projects/new" className="font-medium" style={{ color: 'var(--accent)' }}>{t.noProjectLink}</a>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowContractModal(false)} className="btn-secondary flex-1">{t.cancel}</button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !selectedProject}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Plus className="w-4 h-4" />{t.createAndEdit}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Preview Modal ── */}
      {previewTpl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPreviewKey(null)}
        >
          <div
            className="modal-glass w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{previewTpl.name}</h2>
                {previewTpl.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{previewTpl.description}</p>}
              </div>
              <button
                onClick={() => setPreviewKey(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: previewTpl.content }} />
            </div>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setPreviewKey(null)} className="text-sm font-medium transition-colors" style={{ color: 'var(--text-muted)' }}>{t.close}</button>
              <button
                onClick={() => { setPreviewKey(null); openNewContract(previewKey!) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                <Check className="w-4 h-4" />
                {t.useThisTemplate}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
