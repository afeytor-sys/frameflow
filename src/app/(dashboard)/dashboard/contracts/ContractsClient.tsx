'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getContractTemplatesForLocale } from '@/lib/contractTemplates'
import { formatRelative } from '@/lib/utils'
import {
  FileText, Plus, X, ChevronRight, Check, Sparkles,
  BookOpen, Send, Eye, BookMarked, Trash2, PenLine, Download,
} from 'lucide-react'
import ContractEditor from '@/components/dashboard/ContractEditor'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'

interface Contract {
  id: string
  project_id: string
  title: string
  status: string
  created_at: string
  content?: string | null
  signed_by_name?: string | null
  signed_at?: string | null
  signature_data?: string | null
  photographer_signed_by_name?: string | null
  photographer_signed_at?: string | null
  photographer_signature_data?: string | null
}

interface Project {
  id: string
  title: string
  client_id: string | null
  clients: { full_name: string } | null
}

interface UserTemplate {
  id: string
  name: string
  description: string | null
  content: string
}

interface Props {
  contracts: Contract[]
  projects: Project[]
  userTemplates?: UserTemplate[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
  sent:   { bg: 'rgba(232,162,26,0.10)',  color: '#E8A21A' },
  viewed: { bg: 'rgba(200,168,130,0.10)', color: '#C8A882' },
  signed: { bg: 'rgba(61,186,111,0.10)',  color: '#3DBA6F' },
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft:  <FileText className="w-3.5 h-3.5" />,
  sent:   <Send className="w-3.5 h-3.5" />,
  viewed: <Eye className="w-3.5 h-3.5" />,
  signed: <Check className="w-3.5 h-3.5" />,
}

const TEMPLATE_ACCENTS = [
  { bg: 'rgba(232,162,26,0.10)', color: '#E8A21A', border: 'rgba(232,162,26,0.20)' },
  { bg: 'rgba(61,186,111,0.10)', color: '#3DBA6F', border: 'rgba(61,186,111,0.20)' },
  { bg: 'rgba(99,102,241,0.10)', color: '#6366F1', border: 'rgba(99,102,241,0.20)' },
  { bg: 'rgba(236,72,153,0.10)', color: '#EC4899', border: 'rgba(236,72,153,0.20)' },
]

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'Contracts',
    subtitle: (n: number) => `${n} ${n === 1 ? 'Contract' : 'Contracts'} · Create and manage client contracts`,
    newContract: '+ New contract',
    myTemplates: 'My templates',
    defaultTemplates: 'Default templates',
    newTemplate: 'New template',
    newTemplateDesc: 'Create and save your own contract template',
    createTemplate: 'Create template',
    preview: 'Preview',
    use: 'Use',
    myContracts: 'My Contracts',
    colContract: 'Contract',
    colClient: 'Client',
    colStatus: 'Status',
    colCreated: 'Created',
    noContracts: 'No contracts yet',
    noContractsDesc: 'Select a template above or create a new contract.',
    statusDraft: 'Draft',
    statusSent: 'Sent',
    statusViewed: 'Viewed',
    statusSigned: 'Signed',
    deleteTemplateConfirm: 'Really delete this template?',
    templateDeleted: 'Template deleted',
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
    // New template modal
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
    // Preview modal
    close: 'Close',
    useThisTemplate: 'Use this template',
    // PDF
    pdfDownloaded: 'PDF downloaded!',
    pdfError: 'Error creating PDF',
    pdfPage: (i: number, total: number) => `Page ${i} of ${total}`,
    pdfCreatedWith: 'Created with Frameflow',
    pdfSignatures: 'Signatures',
    pdfPhotographer: 'Photographer',
    pdfClient: 'Client',
    pdfCreated: 'Created:',
  },
  de: {
    title: 'Verträge',
    subtitle: (n: number) => `${n} ${n === 1 ? 'Vertrag' : 'Verträge'} · Kundenverträge erstellen und verwalten`,
    newContract: '+ Neuer Vertrag',
    myTemplates: 'Meine Vorlagen',
    defaultTemplates: 'Standard-Vorlagen',
    newTemplate: 'Neue Vorlage',
    newTemplateDesc: 'Eigene Vertragsvorlage erstellen und speichern',
    createTemplate: 'Vorlage erstellen',
    preview: 'Vorschau',
    use: 'Verwenden',
    myContracts: 'Meine Verträge',
    colContract: 'Vertrag',
    colClient: 'Kunde',
    colStatus: 'Status',
    colCreated: 'Erstellt',
    noContracts: 'Noch keine Verträge',
    noContractsDesc: 'Wähle eine Vorlage oben oder erstelle einen neuen Vertrag.',
    statusDraft: 'Entwurf',
    statusSent: 'Gesendet',
    statusViewed: 'Angesehen',
    statusSigned: 'Unterzeichnet',
    deleteTemplateConfirm: 'Diese Vorlage wirklich löschen?',
    templateDeleted: 'Vorlage gelöscht',
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
    // New template modal
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
    // Preview modal
    close: 'Schließen',
    useThisTemplate: 'Diese Vorlage verwenden',
    // PDF
    pdfDownloaded: 'PDF heruntergeladen!',
    pdfError: 'Fehler beim Erstellen des PDFs',
    pdfPage: (i: number, total: number) => `Seite ${i} von ${total}`,
    pdfCreatedWith: 'Erstellt mit Frameflow',
    pdfSignatures: 'Unterschriften',
    pdfPhotographer: 'Fotograf',
    pdfClient: 'Kunde',
    pdfCreated: 'Erstellt:',
  },
}

type TemplateKey = string

interface TemplateOption {
  kind: 'builtin' | 'user'
  id: string
  name: string
  description: string | null
  content: string
}

export default function ContractsClient({
  contracts: initialContracts,
  projects,
  userTemplates: initialUserTemplates = [],
}: Props) {
  const locale = useLocale()
  const t = T[locale]
  const CONTRACT_TEMPLATES = getContractTemplatesForLocale(locale)

  const STATUS_LABELS: Record<string, string> = {
    draft: t.statusDraft,
    sent: t.statusSent,
    viewed: t.statusViewed,
    signed: t.statusSigned,
  }

  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)

  // New contract modal
  const [showModal, setShowModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<TemplateKey | null>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [contractTitle, setContractTitle] = useState('')
  const [saving, setSaving] = useState(false)

  // Preview modal
  const [previewKey, setPreviewKey] = useState<TemplateKey | null>(null)

  // New template modal
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [newTplName, setNewTplName] = useState('')
  const [newTplDesc, setNewTplDesc] = useState('')
  const [newTplContent, setNewTplContent] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // PDF download
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  // Delete contract
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

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
    setShowModal(true)
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
    setShowModal(false)
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
        console.error('Template save error:', error)
        if (error.code === '42P01') {
          toast.error('Template feature not yet available. Please run migration.')
        } else {
          toast.error(`${t.errorSaving}: ${error.message}`)
        }
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

  const handleDeleteContract = async (e: React.MouseEvent, contractId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const confirmMsg = locale === 'de'
      ? 'Diesen Vertrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      : 'Really delete this contract? This action cannot be undone.'
    if (!confirm(confirmMsg)) return
    setDeletingId(contractId)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('contracts').delete().eq('id', contractId)
      if (error) throw error
      setContracts(prev => prev.filter(c => c.id !== contractId))
      toast.success(locale === 'de' ? 'Vertrag gelöscht' : 'Contract deleted')
    } catch {
      toast.error(locale === 'de' ? 'Fehler beim Löschen' : 'Error deleting contract')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadPDF = async (e: React.MouseEvent, contract: Contract) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloadingId(contract.id)
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')

      const stripHtml = (html: string) =>
        html
          .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/li>/gi, '\n')
          .replace(/<\/h[1-6]>/gi, '\n\n').replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
          .replace(/\n{3,}/g, '\n\n').trim()

      const fmtDate = (iso: string | null | undefined) =>
        iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const pageWidth = 595; const pageHeight = 842; const margin = 56
      const contentWidth = pageWidth - margin * 2
      let page = pdfDoc.addPage([pageWidth, pageHeight])
      let y = pageHeight - margin

      const colorPrimary = rgb(0.08, 0.08, 0.10)
      const colorMuted = rgb(0.45, 0.45, 0.50)
      const colorAccent = rgb(0.77, 0.64, 0.49)
      const colorLine = rgb(0.88, 0.88, 0.90)

      const drawText = (text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; lineHeight?: number } = {}) => {
        const { size = 10, bold = false, color = colorPrimary, indent = 0, lineHeight } = opts
        const lh = lineHeight ?? size * 1.55
        const usedFont = bold ? fontBold : font
        const maxWidth = contentWidth - indent
        for (const para of text.split('\n')) {
          if (para.trim() === '') { y -= lh * 0.6; continue }
          let line = ''
          for (const word of para.split(' ')) {
            const test = line ? `${line} ${word}` : word
            if (usedFont.widthOfTextAtSize(test, size) > maxWidth && line) {
              if (y < margin + lh) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
              page.drawText(line, { x: margin + indent, y, size, font: usedFont, color }); y -= lh; line = word
            } else { line = test }
          }
          if (line) {
            if (y < margin + lh) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
            page.drawText(line, { x: margin + indent, y, size, font: usedFont, color }); y -= lh
          }
        }
      }

      const drawLine = () => {
        if (y < margin + 20) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
        page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: colorLine })
        y -= 12
      }

      page.drawRectangle({ x: 0, y: pageHeight - 6, width: pageWidth, height: 6, color: colorAccent })
      y -= 8
      drawText(contract.title, { size: 22, bold: true })
      y -= 4
      drawText(`${t.pdfCreated} ${fmtDate(contract.created_at)}`, { size: 9, color: colorMuted })
      y -= 8; drawLine(); y -= 4

      const plainText = stripHtml(contract.content || '')
      if (plainText) { drawText(plainText, { size: 10, lineHeight: 16 }); y -= 16 }

      if (y < margin + 200) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
      drawLine(); y -= 4
      drawText(t.pdfSignatures, { size: 13, bold: true }); y -= 12

      const sigBoxWidth = (contentWidth - 24) / 2
      const sigBoxHeight = 110
      const sigBoxY = y - sigBoxHeight

      page.drawRectangle({ x: margin, y: sigBoxY, width: sigBoxWidth, height: sigBoxHeight, borderColor: colorLine, borderWidth: 1, color: rgb(0.98, 0.98, 0.99) })
      page.drawRectangle({ x: margin + sigBoxWidth + 24, y: sigBoxY, width: sigBoxWidth, height: sigBoxHeight, borderColor: colorLine, borderWidth: 1, color: rgb(0.98, 0.98, 0.99) })

      const labelY = sigBoxY + sigBoxHeight - 16
      page.drawText(t.pdfPhotographer, { x: margin + 10, y: labelY, size: 8, font: fontBold, color: colorMuted })
      page.drawText(t.pdfClient, { x: margin + sigBoxWidth + 34, y: labelY, size: 8, font: fontBold, color: colorMuted })

      if (contract.photographer_signature_data) {
        try {
          const base64 = contract.photographer_signature_data.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const img = await pdfDoc.embedPng(imgBytes)
          const d = img.scaleToFit(sigBoxWidth - 20, 60)
          page.drawImage(img, { x: margin + 10, y: sigBoxY + 30, width: d.width, height: d.height })
        } catch { /* skip */ }
      }
      if (contract.signature_data) {
        try {
          const base64 = contract.signature_data.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const img = await pdfDoc.embedPng(imgBytes)
          const d = img.scaleToFit(sigBoxWidth - 20, 60)
          page.drawImage(img, { x: margin + sigBoxWidth + 34, y: sigBoxY + 30, width: d.width, height: d.height })
        } catch { /* skip */ }
      }

      const nameY = sigBoxY - 14
      if (contract.photographer_signed_by_name) page.drawText(contract.photographer_signed_by_name, { x: margin + 10, y: nameY, size: 9, font: fontBold, color: colorPrimary })
      if (contract.photographer_signed_at) page.drawText(fmtDate(contract.photographer_signed_at), { x: margin + 10, y: nameY - 13, size: 8, font, color: colorMuted })
      if (contract.signed_by_name) page.drawText(contract.signed_by_name, { x: margin + sigBoxWidth + 34, y: nameY, size: 9, font: fontBold, color: colorPrimary })
      if (contract.signed_at) page.drawText(fmtDate(contract.signed_at), { x: margin + sigBoxWidth + 34, y: nameY - 13, size: 8, font, color: colorMuted })

      pdfDoc.getPages().forEach((p, idx) => {
        p.drawText(t.pdfPage(idx + 1, pdfDoc.getPageCount()), { x: margin, y: 24, size: 8, font, color: colorMuted })
        p.drawText(t.pdfCreatedWith, { x: pageWidth - margin - 110, y: 24, size: 8, font, color: colorMuted })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contract.title.replace(/[^a-zA-Z0-9\s]/g, '').trim()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t.pdfDownloaded)
    } catch (err) {
      console.error(err)
      toast.error(t.pdfError)
    } finally {
      setDownloadingId(null)
    }
  }

  const previewTpl = previewKey ? getTemplate(previewKey) : null

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            {t.title}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.subtitle(contracts.length)}
          </p>
        </div>
        <button
          onClick={() => openNewContract()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{ background: '#8B5CF6', boxShadow: '0 1px 8px rgba(139,92,246,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          {t.newContract}
        </button>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .contract-card {
          transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease !important;
        }
        .contract-card:hover {
          transform: translateY(-2px) !important;
        }
      `}</style>

      {/* ── My Templates (user-saved) ── */}
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
                  className="contract-card rounded-xl overflow-hidden flex flex-col gap-0 group cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${accent.color}12 0%, ${accent.color}04 100%)`,
                    border: `1px solid ${accent.color}28`,
                    boxShadow: `0 2px 12px ${accent.color}10`,
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: `${i * 60}ms`,
                    opacity: 0,
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
                className="contract-card rounded-xl overflow-hidden flex flex-col gap-0 group"
                style={{
                  background: `linear-gradient(135deg, ${accent.color}12 0%, ${accent.color}04 100%)`,
                  border: `1px solid ${accent.color}28`,
                  boxShadow: `0 2px 12px ${accent.color}10`,
                  animation: 'fadeSlideUp 0.4s ease forwards',
                  animationDelay: `${(i + 1) * 60}ms`,
                  opacity: 0,
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
          <div
            className="modal-glass w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
            style={{ height: 'min(92vh, 900px)' }}
          >
            {/* Header */}
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
              {/* Name + Desc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.nameLabel}</label>
                  <input
                    type="text"
                    value={newTplName}
                    onChange={e => setNewTplName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="input-base w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.descLabel}</label>
                  <input
                    type="text"
                    value={newTplDesc}
                    onChange={e => setNewTplDesc(e.target.value)}
                    placeholder={t.descPlaceholder}
                    className="input-base w-full"
                  />
                </div>
              </div>

              {/* Quick-fill from builtin */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>{t.startFromTemplate}</label>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_TEMPLATES.map((tpl, i) => {
                    const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setNewTplName(tpl.name)
                          setNewTplDesc(tpl.description)
                          setNewTplContent(tpl.content)
                          setEditorKey(k => k + 1)
                        }}
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

              {/* Rich text editor */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.contractContent}</label>
                <ContractEditor
                  key={editorKey}
                  content={newTplContent}
                  onChange={setNewTplContent}
                  placeholder={t.contentPlaceholder}
                />
              </div>
            </div>

            {/* Footer */}
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

      {/* ── Contracts List ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t.myContracts}
          </h2>
        </div>

        {contracts.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            {/* Table header */}
            <div
              className="grid px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-color)', gridTemplateColumns: '1fr 160px 130px 150px auto' }}
            >
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.colContract}</span>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.colClient}</span>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.colStatus}</span>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.colCreated}</span>
              <span />
            </div>
            {contracts.map((contract, i) => {
              const sc = STATUS_COLORS[contract.status] || STATUS_COLORS.draft
              const project = projectMap[contract.project_id]
              const canDownload = !!(contract.signature_data && contract.photographer_signature_data)
              return (
                <a
                  key={contract.id}
                  href={`/dashboard/projects/${contract.project_id}?tab=contracts`}
                  className="group grid items-center px-5 py-3.5 transition-all duration-150 cursor-pointer"
                  style={{
                    gridTemplateColumns: '1fr 160px 130px 150px auto',
                    borderBottom: '1px solid var(--border-color)',
                    animation: 'fadeSlideUp 0.35s ease forwards',
                    animationDelay: `${i * 50}ms`,
                    opacity: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sc.bg }}>
                      <FileText className="w-4 h-4" style={{ color: sc.color }} />
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{contract.title}</p>
                  </div>

                  {/* Client */}
                  <span className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{project?.clients?.full_name || '—'}</span>

                  {/* Status */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium w-fit" style={{ background: sc.bg, color: sc.color }}>
                    {STATUS_ICONS[contract.status]}
                    {STATUS_LABELS[contract.status]}
                  </span>

                  {/* Date */}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelative(contract.created_at, locale)}</span>

                  {/* Hover actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Download PDF — only if both signed */}
                    {canDownload && (
                      <button
                        onClick={(e) => handleDownloadPDF(e, contract)}
                        disabled={downloadingId === contract.id}
                        title={locale === 'de' ? 'PDF herunterladen' : 'Download PDF'}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-40"
                        style={{ background: 'rgba(61,186,111,0.12)', color: '#3DBA6F', border: '1px solid rgba(61,186,111,0.25)' }}
                      >
                        {downloadingId === contract.id
                          ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          : <Download className="w-3 h-3" />
                        }
                        PDF
                      </button>
                    )}

                    {/* Delete contract */}
                    <button
                      onClick={(e) => handleDeleteContract(e, contract.id)}
                      disabled={deletingId === contract.id}
                      title={locale === 'de' ? 'Vertrag löschen' : 'Delete contract'}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40"
                      style={{ color: 'var(--text-muted)', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#E84C1A'; e.currentTarget.style.background = 'rgba(232,76,26,0.10)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      {deletingId === contract.id
                        ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </a>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl flex flex-col items-center justify-center py-16 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-hover)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{t.noContracts}</h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>{t.noContractsDesc}</p>
            <button
              onClick={() => openNewContract()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="w-4 h-4" />
              {t.newContract}
            </button>
          </div>
        )}
      </div>

      {/* ── New Contract Modal ── */}
      {showModal && (
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
                onClick={() => setShowModal(false)}
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
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>{t.templateLabel}</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => { setSelectedKey(null); setContractTitle(locale === 'de' ? 'Fotografievertrag' : 'Photography Contract') }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: selectedKey === null ? 'var(--accent-muted)' : 'var(--bg-hover)',
                      border: `1px solid ${selectedKey === null ? 'var(--accent)' : 'var(--border-color)'}`,
                      color: selectedKey === null ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium text-xs">{t.blank}</span>
                  </button>

                  {userTemplates.map((tpl, i) => {
                    const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
                    const key = `user:${tpl.id}`
                    const isSelected = selectedKey === key
                    return (
                      <button key={key}
                        onClick={() => { setSelectedKey(key); setContractTitle(tpl.name) }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                        style={{
                          background: isSelected ? accent.bg : 'var(--bg-hover)',
                          border: `1px solid ${isSelected ? accent.border : 'var(--border-color)'}`,
                          color: isSelected ? accent.color : 'var(--text-secondary)',
                        }}
                      >
                        <BookMarked className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium text-xs truncate">{tpl.name}</span>
                      </button>
                    )
                  })}

                  {CONTRACT_TEMPLATES.map((tpl, i) => {
                    const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
                    const key = `builtin:${tpl.id}`
                    const isSelected = selectedKey === key
                    return (
                      <button key={key}
                        onClick={() => { setSelectedKey(key); setContractTitle(tpl.name) }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                        style={{
                          background: isSelected ? accent.bg : 'var(--bg-hover)',
                          border: `1px solid ${isSelected ? accent.border : 'var(--border-color)'}`,
                          color: isSelected ? accent.color : 'var(--text-secondary)',
                        }}
                      >
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium text-xs truncate">{tpl.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

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
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t.cancel}</button>
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
