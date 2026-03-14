'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { CONTRACT_TEMPLATES } from '@/lib/contractTemplates'
import ContractEditor from './ContractEditor'
import {
  FileText, Plus, Send, Download, Check, Trash2,
  ChevronDown, BookMarked, X, Bookmark,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contract } from '@/types/database'

interface UserTemplate {
  id: string
  name: string
  description: string | null
  content: string
}

interface Props {
  projectId: string
  clientEmail?: string
  clientName?: string
  contracts: Contract[]
  userTemplates?: UserTemplate[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.12)', color: '#9CA3AF' },
  sent:   { bg: 'rgba(232,162,26,0.12)',  color: '#E8A21A' },
  viewed: { bg: 'rgba(200,168,130,0.12)', color: '#C8A882' },
  signed: { bg: 'rgba(61,186,111,0.12)',  color: '#3DBA6F' },
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  viewed: 'Angesehen',
  signed: 'Unterschrieben',
}

export default function ContractTab({
  projectId,
  clientEmail,
  contracts: initialContracts,
  userTemplates: initialUserTemplates = [],
}: Props) {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)
  const [activeContract, setActiveContract] = useState<Contract | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [title, setTitle] = useState('Fotografievertrag')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  // Save as template modal
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const handleCreateFromTemplate = (tplContent: string, tplName: string) => {
    setTitle(tplName)
    setContent(tplContent)
    setShowTemplates(false)
    setIsCreating(true)
  }

  const handleCreateBlank = () => {
    setTitle('Fotografievertrag')
    setContent('')
    setIsCreating(true)
    setShowTemplates(false)
  }

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Vertragsinhalt darf nicht leer sein')
      return
    }
    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('contracts')
      .insert({ project_id: projectId, title, content, status: 'draft' })
      .select()
      .single()

    if (error) {
      toast.error('Fehler beim Speichern')
      setSaving(false)
      return
    }

    setContracts((prev) => [...prev, data])
    setActiveContract(data)
    setIsCreating(false)
    toast.success('Vertrag gespeichert')
    setSaving(false)
    router.refresh()
  }

  const handleUpdate = async (contract: Contract) => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('contracts')
      .update({ title, content })
      .eq('id', contract.id)

    if (error) {
      toast.error('Fehler beim Speichern')
    } else {
      setContracts((prev) => prev.map((c) => c.id === contract.id ? { ...c, title, content } : c))
      toast.success('Vertrag aktualisiert')
    }
    setSaving(false)
  }

  const handleSend = async (contract: Contract) => {
    if (!clientEmail) {
      toast.error('Keine E-Mail-Adresse für diesen Kunden hinterlegt')
      return
    }
    setSending(true)
    const res = await fetch('/api/contracts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: contract.id }),
    })

    if (!res.ok) {
      toast.error('Fehler beim Senden')
    } else {
      setContracts((prev) =>
        prev.map((c) => c.id === contract.id ? { ...c, status: 'sent' as const, sent_at: new Date().toISOString() } : c)
      )
      if (activeContract?.id === contract.id) {
        setActiveContract((prev) => prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : prev)
      }
      toast.success(`Vertrag an ${clientEmail} gesendet`)
    }
    setSending(false)
  }

  const handleDelete = async (contractId: string) => {
    if (!confirm('Vertrag wirklich löschen?')) return
    const supabase = createClient()
    await supabase.from('contracts').delete().eq('id', contractId)
    setContracts((prev) => prev.filter((c) => c.id !== contractId))
    if (activeContract?.id === contractId) setActiveContract(null)
    toast.success('Vertrag gelöscht')
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Bitte einen Namen eingeben')
      return
    }
    setSavingTemplate(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingTemplate(false); return }

    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        photographer_id: user.id,
        name: templateName.trim(),
        description: templateDesc.trim() || null,
        content: content || activeContract?.content || '',
      })
      .select()
      .single()

    if (error) {
      toast.error('Fehler beim Speichern der Vorlage')
    } else {
      setUserTemplates((prev) => [...prev, data])
      toast.success('Vorlage gespeichert!')
      setShowSaveTemplate(false)
      setTemplateName('')
      setTemplateDesc('')
    }
    setSavingTemplate(false)
  }

  // ── Creating new contract ──
  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-display text-lg font-semibold bg-transparent border-b border-transparent outline-none transition-all px-1 py-0.5"
            style={{
              color: 'var(--text-primary)',
              borderBottomColor: 'transparent',
            }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
        <ContractEditor content={content} onChange={setContent} />
      </div>
    )
  }

  // ── Viewing/editing existing contract ──
  if (activeContract) {
    const sc = STATUS_COLORS[activeContract.status] || STATUS_COLORS.draft
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveContract(null)}
              className="text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ← Zurück
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={activeContract.status === 'signed'}
              className="font-display text-lg font-semibold bg-transparent border-b border-transparent outline-none transition-all px-1 py-0.5 disabled:cursor-default"
              style={{ color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
            />
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: sc.bg, color: sc.color }}
            >
              {STATUS_LABELS[activeContract.status]}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Save as template button */}
            {activeContract.status === 'draft' && (
              <button
                onClick={() => {
                  setTemplateName(title)
                  setTemplateDesc('')
                  setShowSaveTemplate(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
                title="Als Vorlage speichern"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Als Vorlage
              </button>
            )}

            {activeContract.status === 'draft' && (
              <>
                <button
                  onClick={() => handleUpdate(activeContract)}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  onClick={() => handleSend(activeContract)}
                  disabled={sending || !clientEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Senden...' : 'An Kunden senden'}
                </button>
              </>
            )}
            {activeContract.status === 'sent' && (
              <button
                onClick={() => handleSend(activeContract)}
                disabled={sending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Send className="w-3.5 h-3.5" />
                Erneut senden
              </button>
            )}
            {activeContract.status === 'signed' && activeContract.pdf_url && (
              <a
                href={activeContract.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ background: '#3DBA6F', color: '#fff' }}
              >
                <Download className="w-3.5 h-3.5" />
                PDF herunterladen
              </a>
            )}
          </div>
        </div>

        {/* Signed info */}
        {activeContract.status === 'signed' && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'rgba(61,186,111,0.10)', border: '1px solid rgba(61,186,111,0.20)' }}
          >
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#3DBA6F' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Unterschrieben von {activeContract.signed_by_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {activeContract.signed_at ? formatDateTime(activeContract.signed_at, 'de') : ''}
                {activeContract.ip_address ? ` · IP: ${activeContract.ip_address}` : ''}
              </p>
            </div>
          </div>
        )}

        <ContractEditor
          content={content || activeContract.content || ''}
          onChange={setContent}
          editable={activeContract.status === 'draft'}
        />

        {/* Save as template modal */}
        {showSaveTemplate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          >
            <div
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--card-shadow-hover)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <h3 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>
                    Als Vorlage speichern
                  </h3>
                </div>
                <button
                  onClick={() => setShowSaveTemplate(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Name der Vorlage *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="z.B. Mein Hochzeitsvertrag"
                    className="input-base w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Beschreibung (optional)
                  </label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Kurze Beschreibung..."
                    className="input-base w-full"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowSaveTemplate(false)}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate || !templateName.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}
                  >
                    {savingTemplate ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <BookMarked className="w-3.5 h-3.5" />
                        Speichern
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Contract list ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Verträge
        </h3>
        <div className="relative">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Vertrag
            <ChevronDown className="w-3 h-3" />
          </button>

          {showTemplates && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
              <div
                className="absolute right-0 top-full mt-1 rounded-xl z-20 w-64 overflow-hidden"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--card-shadow-hover)',
                }}
              >
                <div className="p-2">
                  {/* Blank */}
                  <button
                    onClick={handleCreateBlank}
                    className="w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Leerer Vertrag</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Von Grund auf neu erstellen</p>
                  </button>

                  {/* User templates */}
                  {userTemplates.length > 0 && (
                    <>
                      <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
                      <p
                        className="text-xs font-bold px-3 py-1 uppercase tracking-wide flex items-center gap-1.5"
                        style={{ color: 'var(--accent)' }}
                      >
                        <BookMarked className="w-3 h-3" />
                        Meine Vorlagen
                      </p>
                      {userTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleCreateFromTemplate(tpl.content, tpl.name)}
                          className="w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors"
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                          {tpl.description && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Default templates */}
                  <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
                  <p
                    className="text-xs font-bold px-3 py-1 uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Standard-Vorlagen
                  </p>
                  {CONTRACT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleCreateFromTemplate(template.content, template.name)}
                      className="w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{template.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--bg-hover)' }}
          >
            <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Noch kein Vertrag
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Erstelle einen Vertrag aus einer Vorlage oder von Grund auf neu.
          </p>
          <button
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
          >
            <Plus className="w-3 h-3" />
            Ersten Vertrag erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((contract) => {
            const sc = STATUS_COLORS[contract.status] || STATUS_COLORS.draft
            return (
              <div
                key={contract.id}
                className="flex items-center justify-between p-4 rounded-xl transition-all group"
                style={{ border: '1px solid var(--border-color)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(196,164,124,0.30)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <button
                  onClick={() => {
                    setActiveContract(contract)
                    setTitle(contract.title)
                    setContent(contract.content || '')
                  }}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(232,162,26,0.10)' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: '#E8A21A' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {contract.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {contract.signed_at
                        ? `Unterschrieben ${formatDateTime(contract.signed_at, 'de')}`
                        : contract.sent_at
                        ? `Gesendet ${formatDateTime(contract.sent_at, 'de')}`
                        : 'Entwurf'}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    {STATUS_LABELS[contract.status]}
                  </span>
                  {contract.status === 'draft' && (
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="w-7 h-7 flex items-center justify-center rounded transition-colors opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#E84C1A'
                        e.currentTarget.style.background = 'rgba(232,76,26,0.10)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
