'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CONTRACT_TEMPLATES } from '@/lib/contractTemplates'
import { formatRelative } from '@/lib/utils'
import {
  FileText, Plus, X, ChevronRight, Check, Sparkles,
  BookOpen, Send, Eye, BookMarked, Trash2, PenLine, Download,
} from 'lucide-react'
import ContractEditor from '@/components/dashboard/ContractEditor'
import toast from 'react-hot-toast'

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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf', sent: 'Gesendet', viewed: 'Angesehen', signed: 'Unterschrieben',
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
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)

  // New contract modal
  const [showModal, setShowModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<TemplateKey | null>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [contractTitle, setContractTitle] = useState('Fotografievertrag')
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

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  const getTemplate = (key: TemplateKey): TemplateOption | null => {
    if (key.startsWith('builtin:')) {
      const t = CONTRACT_TEMPLATES.find((t) => t.id === key.slice(8))
      return t ? { kind: 'builtin', ...t } : null
    }
    if (key.startsWith('user:')) {
      const t = userTemplates.find((t) => t.id === key.slice(5))
      return t ? { kind: 'user', ...t } : null
    }
    return null
  }

  const openNewContract = (key?: TemplateKey) => {
    if (key) {
      const tpl = getTemplate(key)
      if (tpl) { setSelectedKey(key); setContractTitle(tpl.name) }
    } else {
      setSelectedKey(null)
      setContractTitle('Fotografievertrag')
    }
    setSelectedProject('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!selectedProject) { toast.error('Bitte ein Projekt auswählen'); return }
    setSaving(true)
    const supabase = createClient()
    const tpl = selectedKey ? getTemplate(selectedKey) : null

    const { error } = await supabase.from('contracts').insert({
      project_id: selectedProject,
      title: contractTitle,
      content: tpl?.content ?? '',
      status: 'draft',
    })

    if (error) { toast.error('Fehler beim Erstellen des Vertrags'); setSaving(false); return }

    toast.success('Vertrag erstellt!')
    setShowModal(false)
    setSaving(false)
    router.push(`/dashboard/projects/${selectedProject}?tab=contracts`)
  }

  const handleDeleteUserTemplate = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return
    const supabase = createClient()
    await supabase.from('contract_templates').delete().eq('id', id)
    setUserTemplates((prev) => prev.filter((t) => t.id !== id))
    toast.success('Vorlage gelöscht')
  }

  const handleCreateTemplate = async () => {
    if (!newTplName.trim()) { toast.error('Bitte einen Namen eingeben'); return }
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
          toast.error('Vorlagen-Funktion noch nicht verfügbar. Bitte Migration ausführen.')
        } else {
          toast.error(`Fehler: ${error.message}`)
        }
        setSavingTemplate(false)
        return
      }
      setUserTemplates(prev => [...prev, data as UserTemplate])
      setShowNewTemplateModal(false)
      setNewTplName('')
      setNewTplDesc('')
      setNewTplContent('')
      toast.success('Vorlage gespeichert!')
    } catch (err) {
      console.error(err)
      toast.error('Unbekannter Fehler beim Speichern')
    } finally {
      setSavingTemplate(false)
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
      drawText(`Erstellt am: ${fmtDate(contract.created_at)}`, { size: 9, color: colorMuted })
      y -= 8; drawLine(); y -= 4

      const plainText = stripHtml(contract.content || '')
      if (plainText) { drawText(plainText, { size: 10, lineHeight: 16 }); y -= 16 }

      if (y < margin + 200) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
      drawLine(); y -= 4
      drawText('Unterschriften', { size: 13, bold: true }); y -= 12

      const sigBoxWidth = (contentWidth - 24) / 2
      const sigBoxHeight = 110
      const sigBoxY = y - sigBoxHeight

      page.drawRectangle({ x: margin, y: sigBoxY, width: sigBoxWidth, height: sigBoxHeight, borderColor: colorLine, borderWidth: 1, color: rgb(0.98, 0.98, 0.99) })
      page.drawRectangle({ x: margin + sigBoxWidth + 24, y: sigBoxY, width: sigBoxWidth, height: sigBoxHeight, borderColor: colorLine, borderWidth: 1, color: rgb(0.98, 0.98, 0.99) })

      const labelY = sigBoxY + sigBoxHeight - 16
      page.drawText('Fotograf', { x: margin + 10, y: labelY, size: 8, font: fontBold, color: colorMuted })
      page.drawText('Kunde', { x: margin + sigBoxWidth + 34, y: labelY, size: 8, font: fontBold, color: colorMuted })

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
        p.drawText(`Seite ${idx + 1} von ${pdfDoc.getPageCount()}`, { x: margin, y: 24, size: 8, font, color: colorMuted })
        p.drawText('Erstellt mit Frameflow', { x: pageWidth - margin - 100, y: 24, size: 8, font, color: colorMuted })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contract.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '').trim()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF heruntergeladen!')
    } catch (err) {
      console.error(err)
      toast.error('Fehler beim Erstellen des PDFs')
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
            Verträge
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {contracts.length} {contracts.length === 1 ? 'Vertrag' : 'Verträge'} · Erstelle und verwalte Kundenverträge
          </p>
        </div>
        <button
          onClick={() => openNewContract()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{ background: '#8B5CF6', boxShadow: '0 1px 8px rgba(139,92,246,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          Neuer Vertrag
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
              Meine Vorlagen
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
                        title="Vorlage löschen"
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
                        Vorschau
                      </button>
                      <button
                        onClick={() => openNewContract(`user:${tpl.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                        style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                      >
                        Verwenden
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
            Standard-Vorlagen
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
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Neue Vorlage</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Eigene Vertragsvorlage erstellen und speichern</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>
              <PenLine className="w-3.5 h-3.5" />
              Vorlage erstellen
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
                      Vorschau
                    </button>
                    <button
                      onClick={() => openNewContract(`builtin:${tpl.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                    >
                      Verwenden
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
            className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
            style={{ height: 'min(92vh, 900px)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Neue Vorlage erstellen</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Speichere deine eigene Vertragsvorlage</p>
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
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Name *</label>
                  <input
                    type="text"
                    value={newTplName}
                    onChange={e => setNewTplName(e.target.value)}
                    placeholder="z.B. Mein Hochzeitsvertrag"
                    className="input-base w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Beschreibung (optional)</label>
                  <input
                    type="text"
                    value={newTplDesc}
                    onChange={e => setNewTplDesc(e.target.value)}
                    placeholder="Kurze Beschreibung der Vorlage"
                    className="input-base w-full"
                  />
                </div>
              </div>

              {/* Quick-fill from builtin */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Von Standard-Vorlage starten</label>
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

              {/* Rich text editor — TipTap */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Vertragsinhalt</label>
                <ContractEditor
                  key={editorKey}
                  content={newTplContent}
                  onChange={setNewTplContent}
                  placeholder="Vertragstext hier eingeben..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowNewTemplateModal(false)} className="btn-secondary flex-1">Abbrechen</button>
              <button
                onClick={handleCreateTemplate}
                disabled={savingTemplate || !newTplName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                {savingTemplate
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><BookMarked className="w-4 h-4" />Vorlage speichern</>
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
            Meine Verträge
          </h2>
        </div>

        {contracts.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_160px_120px_auto] lg:grid-cols-[1fr_160px_140px_auto_120px_auto] px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Vertrag</span>
              <span className="text-xs font-medium uppercase tracking-wide hidden md:block" style={{ color: 'var(--text-muted)' }}>Kunde</span>
              <span className="text-xs font-medium uppercase tracking-wide hidden md:block" style={{ color: 'var(--text-muted)' }}>Status</span>
              <span className="text-xs font-medium uppercase tracking-wide hidden lg:block" style={{ color: 'var(--text-muted)' }}>Erstellt</span>
              <span className="hidden lg:block" />
              <span />
            </div>
            {contracts.map((contract, i) => {
              const sc = STATUS_COLORS[contract.status] || STATUS_COLORS.draft
              const project = projectMap[contract.project_id]
              const fullySignedByBoth = !!(contract.signature_data && contract.photographer_signature_data)
              return (
                <a
                  key={contract.id}
                  href={`/dashboard/projects/${contract.project_id}?tab=contracts`}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_160px_120px_auto] lg:grid-cols-[1fr_160px_140px_auto_120px_auto] items-center px-5 py-3.5 transition-all duration-200 cursor-pointer"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    animation: 'fadeSlideUp 0.35s ease forwards',
                    animationDelay: `${i * 50}ms`,
                    opacity: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sc.bg }}>
                      <FileText className="w-4 h-4" style={{ color: sc.color }} />
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{contract.title}</p>
                  </div>
                  <span className="text-sm hidden md:block" style={{ color: 'var(--text-muted)' }}>{project?.clients?.full_name || '—'}</span>
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium w-fit" style={{ background: sc.bg, color: sc.color }}>
                    {STATUS_ICONS[contract.status]}
                    {STATUS_LABELS[contract.status]}
                  </span>
                  <span className="text-xs hidden lg:block" style={{ color: 'var(--text-muted)' }}>{formatRelative(contract.created_at, 'de')}</span>
                  <div className="hidden lg:flex items-center">
                    {fullySignedByBoth && (
                      <button
                        onClick={(e) => handleDownloadPDF(e, contract)}
                        disabled={downloadingId === contract.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 hover:opacity-88"
                        style={{ background: 'rgba(61,186,111,0.12)', color: '#3DBA6F', border: '1px solid rgba(61,186,111,0.25)' }}
                        title="Vertrag als PDF herunterladen"
                      >
                        {downloadingId === contract.id
                          ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          : <Download className="w-3 h-3" />
                        }
                        PDF
                      </button>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                </a>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl flex flex-col items-center justify-center py-16 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-hover)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Verträge</h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>Wähle eine Vorlage oben aus oder erstelle einen neuen Vertrag.</p>
            <button
              onClick={() => openNewContract()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="w-4 h-4" />
              Neuer Vertrag
            </button>
          </div>
        )}
      </div>

      {/* ── New Contract Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Neuer Vertrag</h2>
                {selectedKey && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Vorlage: {getTemplate(selectedKey)?.name}
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
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Vorlage</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => { setSelectedKey(null); setContractTitle('Fotografievertrag') }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: selectedKey === null ? 'var(--accent-muted)' : 'var(--bg-hover)',
                      border: `1px solid ${selectedKey === null ? 'var(--accent)' : 'var(--border-color)'}`,
                      color: selectedKey === null ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium text-xs">Leer</span>
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
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Titel</label>
                <input type="text" value={contractTitle} onChange={(e) => setContractTitle(e.target.value)} className="input-base w-full" placeholder="z.B. Fotografievertrag" />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Projekt *</label>
                {projects.length > 0 ? (
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="input-base w-full"
                    style={{ color: selectedProject ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    <option value="">Projekt auswählen...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}{p.clients?.full_name ? ` — ${p.clients.full_name}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    Kein Projekt vorhanden.{' '}
                    <a href="/dashboard/projects/new" className="font-medium" style={{ color: 'var(--accent)' }}>Projekt erstellen →</a>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Abbrechen</button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !selectedProject}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Plus className="w-4 h-4" />Erstellen & bearbeiten</>
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
            className="w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}
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
              <button onClick={() => setPreviewKey(null)} className="text-sm font-medium transition-colors" style={{ color: 'var(--text-muted)' }}>Schließen</button>
              <button
                onClick={() => { setPreviewKey(null); openNewContract(previewKey!) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                <Check className="w-4 h-4" />
                Dieses Template verwenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
