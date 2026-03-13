'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDateTime } from '@/lib/utils'
import { CONTRACT_TEMPLATES } from '@/lib/contractTemplates'
import ContractEditor from './ContractEditor'
import { FileText, Plus, Send, Download, Check, Eye, Trash2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contract } from '@/types/database'

interface Props {
  projectId: string
  clientEmail?: string
  clientName?: string
  contracts: Contract[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
  sent: 'bg-[#E8A21A]/10 text-[#E8A21A]',
  viewed: 'bg-[#C8A882]/10 text-[#C8A882]',
  signed: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  viewed: 'Angesehen',
  signed: 'Unterschrieben',
}

export default function ContractTab({ projectId, clientEmail, clientName, contracts: initialContracts }: Props) {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [activeContract, setActiveContract] = useState<Contract | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [title, setTitle] = useState('Fotografievertrag')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const handleCreateFromTemplate = (templateId: string) => {
    const template = CONTRACT_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    setTitle(template.name)
    setContent(template.content)
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
      .insert({
        project_id: projectId,
        title,
        content,
        status: 'draft',
      })
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

  // Creating new contract
  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-display text-lg font-semibold text-[#1A1A1A] bg-transparent border-b border-transparent hover:border-[#E8E8E4] focus:border-[#C8A882] outline-none transition-all px-1 py-0.5"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
        <ContractEditor content={content} onChange={setContent} />
      </div>
    )
  }

  // Viewing/editing existing contract
  if (activeContract) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveContract(null)}
              className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              ← Zurück
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={activeContract.status === 'signed'}
              className="font-display text-lg font-semibold text-[#1A1A1A] bg-transparent border-b border-transparent hover:border-[#E8E8E4] focus:border-[#C8A882] outline-none transition-all px-1 py-0.5 disabled:cursor-default"
            />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[activeContract.status]}`}>
              {STATUS_LABELS[activeContract.status]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeContract.status === 'draft' && (
              <>
                <button
                  onClick={() => handleUpdate(activeContract)}
                  disabled={saving}
                  className="px-3 py-1.5 border border-[#E8E8E4] text-sm font-medium text-[#1A1A1A] rounded-lg hover:bg-[#F0F0EC] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  onClick={() => handleSend(activeContract)}
                  disabled={sending || !clientEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E8E8E4] text-sm font-medium text-[#6B6B6B] rounded-lg hover:bg-[#F0F0EC] transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3DBA6F] text-white text-sm font-medium rounded-lg hover:bg-[#35A862] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                PDF herunterladen
              </a>
            )}
          </div>
        </div>

        {/* Signed info */}
        {activeContract.status === 'signed' && (
          <div className="flex items-center gap-3 p-3 bg-[#3DBA6F]/10 rounded-lg border border-[#3DBA6F]/20">
            <Check className="w-4 h-4 text-[#3DBA6F] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                Unterschrieben von {activeContract.signed_by_name}
              </p>
              <p className="text-xs text-[#6B6B6B]">
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
      </div>
    )
  }

  // Contract list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-[#1A1A1A]">Verträge</h3>
        <div className="relative">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Vertrag
            <ChevronDown className="w-3 h-3" />
          </button>

          {showTemplates && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#E8E8E4] rounded-xl shadow-lg z-20 w-64 overflow-hidden">
                <div className="p-2">
                  <button
                    onClick={handleCreateBlank}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F0F0EC] rounded-lg transition-colors"
                  >
                    <p className="font-medium text-[#1A1A1A]">Leerer Vertrag</p>
                    <p className="text-xs text-[#6B6B6B]">Von Grund auf neu erstellen</p>
                  </button>
                  <div className="border-t border-[#F0F0EC] my-1" />
                  <p className="text-xs font-medium text-[#6B6B6B] px-3 py-1 uppercase tracking-wide">Vorlagen</p>
                  {CONTRACT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleCreateFromTemplate(template.id)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F0F0EC] rounded-lg transition-colors"
                    >
                      <p className="font-medium text-[#1A1A1A]">{template.name}</p>
                      <p className="text-xs text-[#6B6B6B]">{template.description}</p>
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
          <div className="w-12 h-12 rounded-full bg-[#F0F0EC] flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-[#6B6B6B]" />
          </div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-1">Noch kein Vertrag</p>
          <p className="text-xs text-[#6B6B6B] mb-4">Erstelle einen Vertrag aus einer Vorlage oder von Grund auf neu.</p>
          <button
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Ersten Vertrag erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center justify-between p-4 rounded-xl border border-[#E8E8E4] hover:border-[#C8A882]/30 transition-all group"
            >
              <button
                onClick={() => {
                  setActiveContract(contract)
                  setTitle(contract.title)
                  setContent(contract.content || '')
                }}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#E8A21A]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[#E8A21A]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{contract.title}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    {contract.signed_at
                      ? `Unterschrieben ${formatDateTime(contract.signed_at, 'de')}`
                      : contract.sent_at
                      ? `Gesendet ${formatDateTime(contract.sent_at, 'de')}`
                      : 'Entwurf'}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contract.status]}`}>
                  {STATUS_LABELS[contract.status]}
                </span>
                {contract.status === 'draft' && (
                  <button
                    onClick={() => handleDelete(contract.id)}
                    className="w-7 h-7 flex items-center justify-center rounded text-[#6B6B6B] hover:text-[#E84C1A] hover:bg-[#E84C1A]/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
