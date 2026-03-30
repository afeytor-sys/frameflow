'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { CONTRACT_TEMPLATES } from '@/lib/contractTemplates'
import ContractEditor from './ContractEditor'
import ContractPDFDownload from './ContractPDFDownload'
import SignatureCanvas from 'react-signature-canvas'
import {
  FileText, Plus, Send, Download, Check, Trash2,
  ChevronDown, BookMarked, X, Bookmark, RotateCcw, PenLine, CheckCircle2, Mail, Calendar, Clock, Copy, Link2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import EmailVorlagePicker from './EmailVorlagePicker'
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
  photographerName?: string | null
  portalUrl?: string | null
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
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
}

// ── SignatureBlock — shows a signed signature (client or photographer) ──────
function SignatureBlock({
  label,
  name,
  signedAt,
  ipAddress,
  signatureData,
  color,
  bg,
  border,
}: {
  label: string
  name: string
  signedAt: string | null
  ipAddress: string | null
  signatureData: string | null
  color: string
  bg: string
  border: string
}) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {label}: <span style={{ color }}>{name}</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {signedAt ? formatDateTime(signedAt, 'en') : ''}
            {ipAddress ? ` · IP: ${ipAddress}` : ''}
          </p>
        </div>
      </div>
      {signatureData && (
        <div className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', maxWidth: '320px' }}>
          <img src={signatureData} alt={`Signature ${label}`} className="w-full h-auto" style={{ maxHeight: '100px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

// ── PhotographerSignatureSection — canvas for photographer to sign ────────────
function PhotographerSignatureSection({
  contractId,
  photographerName,
  existingSignature,
  existingName,
  existingAt,
  onSaved,
}: {
  contractId: string
  photographerName?: string | null
  existingSignature: string | null
  existingName: string | null
  existingAt: string | null
  onSaved: (data: { photographer_signature_data: string; photographer_signed_by_name: string; photographer_signed_at: string }) => void
}) {
  const sigRef = useRef<SignatureCanvas>(null)
  const [name, setName] = useState(existingName ?? photographerName ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(!!existingSignature)

  const supabase = createClient()

  const handleSign = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return }
    if (sigRef.current?.isEmpty()) { toast.error('Please sign in the field'); return }
    setSaving(true)
    const signatureData = sigRef.current!.toDataURL('image/png')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('contracts')
      .update({
        photographer_signed_by_name: name.trim(),
        photographer_signature_data: signatureData,
        photographer_signed_at: now,
      })
      .eq('id', contractId)

    if (error) { toast.error('Error saving signature'); setSaving(false); return }
    onSaved({ photographer_signature_data: signatureData, photographer_signed_by_name: name.trim(), photographer_signed_at: now })
    setDone(true)
    setSaving(false)
    toast.success('Your signature has been saved!')
  }

  if (done && existingSignature) {
    return (
      <SignatureBlock
        label={photographerName || 'Photographer'}
        name={existingName ?? name}
        signedAt={existingAt}
        ipAddress={null}
        signatureData={existingSignature}
        color="var(--accent)"
        bg="rgba(196,164,124,0.10)"
        border="rgba(196,164,124,0.25)"
      />
    )
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(196,164,124,0.12)' }}>
          <PenLine className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Your signature (Photographer)</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sign the contract as photographer</p>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Full Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          className="input-base w-full text-[13px]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
            Signature *
          </label>
          <button
            type="button"
            onClick={() => sigRef.current?.clear()}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '2px dashed var(--border-color)', background: 'var(--bg-hover)' }}>
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{ className: 'w-full', style: { height: '140px', touchAction: 'none' } }}
            backgroundColor="transparent"
            penColor="#111110"
          />
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Sign with mouse or finger</p>
      </div>

      <button
        onClick={handleSign}
        disabled={saving || !name.trim()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-40 hover:opacity-90"
        style={{ background: 'var(--accent)', boxShadow: '0 1px 8px rgba(196,164,124,0.25)' }}
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><PenLine className="w-4 h-4" />Sign now</>
        }
      </button>
    </div>
  )
}

export default function ContractTab({
  projectId,
  clientEmail,
  clientName,
  photographerName,
  portalUrl,
  contracts: initialContracts,
  userTemplates: initialUserTemplates = [],
}: Props) {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)
  const [activeContract, setActiveContract] = useState<Contract | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [title, setTitle] = useState('Photography Contract')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  // Send email modal
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendMode, setSendMode] = useState<'send' | 'schedule'>('send')
  const [pendingSendContract, setPendingSendContract] = useState<Contract | null>(null)
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [scheduledEmailId, setScheduledEmailId] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)

  // Save as template modal
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [markingSigned, setMarkingSigned] = useState(false)

  const handleCreateFromTemplate = (tplContent: string, tplName: string) => {
    setTitle(tplName)
    setContent(tplContent)
    setShowTemplates(false)
    setIsCreating(true)
  }

  const handleCreateBlank = () => {
    setTitle('Photography Contract')
    setContent('')
    setIsCreating(true)
    setShowTemplates(false)
  }

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Contract content cannot be empty')
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
      toast.error('Error saving contract')
      setSaving(false)
      return
    }

    setContracts((prev) => [...prev, data])
    setActiveContract(data)
    setIsCreating(false)
    toast.success('Contract saved')
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
      toast.error('Error saving contract')
    } else {
      setContracts((prev) => prev.map((c) => c.id === contract.id ? { ...c, title, content } : c))
      toast.success('Contract updated')
    }
    setSaving(false)
  }

  const handleSend = async (contract: Contract) => {
    if (!clientEmail) {
      toast.error('No email address found for this client')
      return
    }
    setSending(true)
    const res = await fetch('/api/contracts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: contract.id }),
    })

    if (!res.ok) {
      toast.error('Error sending contract')
    } else {
      setContracts((prev) =>
        prev.map((c) => c.id === contract.id ? { ...c, status: 'sent' as const, sent_at: new Date().toISOString() } : c)
      )
      if (activeContract?.id === contract.id) {
        setActiveContract((prev) => prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : prev)
      }
      toast.success(`Contract sent to ${clientEmail}`)
    }
    setSending(false)
  }

  const handleMarkSigned = async (contract: Contract) => {
    if (!confirm('Mark contract as signed? This cannot be undone.')) return
    setMarkingSigned(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: now,
        signed_by_name: clientName || 'Signed externally',
      })
      .eq('id', contract.id)
    setMarkingSigned(false)
    if (error) { toast.error('Error: ' + error.message); return }
    const updated = { ...contract, status: 'signed' as const, signed_at: now, signed_by_name: clientName || 'Signed externally' }
    setContracts(prev => prev.map(c => c.id === contract.id ? updated : c))
    setActiveContract(updated)
    toast.success('Contract marked as signed ✓')
  }

  const handleDelete = async (contractId: string) => {
    if (!confirm('Really delete this contract?')) return
    const supabase = createClient()
    await supabase.from('contracts').delete().eq('id', contractId)
    setContracts((prev) => prev.filter((c) => c.id !== contractId))
    if (activeContract?.id === contractId) setActiveContract(null)
    toast.success('Contract deleted')
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a name')
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
      toast.error('Error saving template')
    } else {
      setUserTemplates((prev) => [...prev, data])
      toast.success('Template saved!')
      setShowSaveTemplate(false)
      setTemplateName('')
      setTemplateDesc('')
    }
    setSavingTemplate(false)
  }

  // ── Handle contract schedule ──
  const handleContractSchedule = async () => {
    if (!pendingSendContract || !clientEmail) return
    if (!scheduleDate) { toast.error('Please select a date'); return }
    setScheduling(true)
    const dt = new Date(`${scheduleDate}T${scheduleTime}:00`)
    if (dt <= new Date()) { toast.error('Das Datum muss in der Zukunft liegen'); setScheduling(false); return }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08);">
    <div style="background: #1A1A18; padding: 24px 32px;">
      <p style="color: #C4A47C; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 0;">Fotonizer</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #1A1A18; margin: 0 0 8px;">${sendSubject}</h2>
      <div style="color: #4A4845; font-size: 15px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 24px;">${sendMessage}</div>
      <a href="${appUrl}/client/contract/${pendingSendContract.id}" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;">📄 Vertrag unterschreiben →</a>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('/api/emails/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        toEmail: clientEmail,
        toName: clientName,
        subject: sendSubject,
        htmlBody,
        plainBody: sendMessage,
        type: 'contract',
        referenceId: pendingSendContract.id,
        scheduledAt: dt.toISOString(),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || 'Fehler beim Planen')
      setScheduling(false)
      return
    }

    const data = await res.json()
    setScheduledAt(dt.toISOString())
    setScheduledEmailId(data.scheduledEmail?.id || null)
    setShowSendModal(false)
    setScheduling(false)
    toast.success(`📅 Vertrag geplant für ${dt.toLocaleDateString('de-DE')} um ${scheduleTime} Uhr`)
  }

  const cancelContractSchedule = async () => {
    if (scheduledEmailId) {
      await fetch(`/api/emails/schedule?id=${scheduledEmailId}`, { method: 'DELETE' })
    }
    setScheduledAt(null)
    setScheduledEmailId(null)
    toast('Geplanter Versand abgebrochen', { icon: '🗑️' })
  }

  // ── Send email modal ──
  const sendModal = showSendModal && pendingSendContract ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={() => setShowSendModal(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
              <Mail className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {sendMode === 'send' ? 'Send contract' : 'Schedule contract'}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>To {clientEmail}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSendModal(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Template picker */}
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Email template</p>
            <EmailVorlagePicker
              category="rechnung"
              onSelect={(subject, body) => { setSendSubject(subject); setSendMessage(body) }}
              vars={{ client_name: clientName, project_title: pendingSendContract.title }}
              label="Select template"
            />
          </div>
          {/* Subject */}
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Subject</label>
            <input
              type="text"
              value={sendSubject}
              onChange={e => setSendSubject(e.target.value)}
              className="input-base w-full"
              placeholder="Email subject..."
            />
          </div>
          {/* Message */}
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Message</label>
            <textarea
              value={sendMessage}
              onChange={e => setSendMessage(e.target.value)}
              rows={7}
              className="input-base w-full resize-none"
              style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
              placeholder="Your message to the client..."
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              The signature link will be automatically added to the email.
            </p>
          </div>
          {/* Schedule date/time — only in schedule mode */}
          {sendMode === 'schedule' && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: '#8B5CF6' }}>Versandzeitpunkt</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Datum *</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Uhrzeit</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="input-base w-full"
                  />
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
        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={() => setShowSendModal(false)} className="btn-secondary flex-1">Cancel</button>
          {sendMode === 'send' ? (
            <button
              onClick={async () => {
                if (!clientEmail || !pendingSendContract) return
                setSending(true)
                // 1. Update contract status to 'sent' (no email from API)
                const statusRes = await fetch('/api/contracts/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contractId: pendingSendContract.id }),
                })
                if (!statusRes.ok) {
                  toast.error('Error updating contract status')
                  setSending(false)
                  return
                }
                // 2. Send the customized email with contract link
                const contractLink = portalUrl ? `${portalUrl}/contract` : `${window.location.origin}/client/${pendingSendContract.project_id}/contract`
                const bodyWithLink = sendMessage + `\n\n🔗 ${contractLink}`
                const emailRes = await fetch('/api/emails/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    toEmail: clientEmail,
                    toName: clientName,
                    subject: sendSubject,
                    body: bodyWithLink,
                    projectId,
                  }),
                })
                setSending(false)
                setShowSendModal(false)
                if (!emailRes.ok) {
                  toast.error('Error sending email')
                  return
                }
                setContracts(prev => prev.map(c => c.id === pendingSendContract.id ? { ...c, status: 'sent' as const, sent_at: new Date().toISOString() } : c))
                if (activeContract?.id === pendingSendContract.id) {
                  setActiveContract(prev => prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : prev)
                }
                toast.success(`Contract sent to ${clientEmail}`)
              }}
              disabled={sending || !sendSubject.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#8B5CF6' }}
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send className="w-4 h-4" />Send now</>
              }
            </button>
          ) : (
            <button
              onClick={handleContractSchedule}
              disabled={scheduling || !scheduleDate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#8B5CF6' }}
            >
              {scheduling
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Calendar className="w-4 h-4" />Planen</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null

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
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
            >
              {saving ? 'Saving...' : 'Save'}
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
              ← Back
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
                title="Save as template"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save as template
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
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setPendingSendContract(activeContract)
                    setSendMode('send')
                    setSendSubject(`📄 ${activeContract.title}`)
                    setSendMessage(`Hello ${clientName?.split(' ')[0] || ''},\n\nplease sign the attached contract via the following link.\n\nThank you!\n${photographerName || ''}`)
                    setShowSendModal(true)
                  }}
                  disabled={!clientEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Send className="w-3.5 h-3.5" />
                  Send to client
                </button>
                {/* Schedule button */}
                {!scheduledAt && (
                  <button
                    onClick={() => {
                      setPendingSendContract(activeContract)
                      setSendMode('schedule')
                      setSendSubject(`📄 ${activeContract.title}`)
                      setSendMessage(`Hello ${clientName?.split(' ')[0] || ''},\n\nplease sign the attached contract via the following link.\n\nThank you!\n${photographerName || ''}`)
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setScheduleDate(tomorrow.toISOString().split('T')[0])
                      setScheduleTime('09:00')
                      setShowSendModal(true)
                    }}
                    disabled={!clientEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' }}
                    title="Versand planen"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Planen
                  </button>
                )}
                {/* Scheduled badge */}
                {scheduledAt && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}>
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                    <span className="text-[11.5px] font-bold" style={{ color: '#8B5CF6' }}>
                      {new Date(scheduledAt).toLocaleDateString('de-DE')}
                    </span>
                    <button onClick={cancelContractSchedule} className="w-4 h-4 flex items-center justify-center" style={{ color: '#8B5CF6' }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
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
                Resend
              </button>
            )}
            {/* Mark as signed manually — for contracts signed on paper */}
            {activeContract.status !== 'signed' && (
              <button
                onClick={() => handleMarkSigned(activeContract)}
                disabled={markingSigned}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'rgba(61,186,111,0.12)', color: '#3DBA6F', border: '1px solid rgba(61,186,111,0.25)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(61,186,111,0.20)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(61,186,111,0.12)')}
                title="Signed externally / on paper"
              >
                {markingSigned
                  ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : <CheckCircle2 className="w-3.5 h-3.5" />
                }
                Mark as signed
              </button>
            )}
            {/* PDF download — available whenever photographer has signed */}
            {activeContract.photographer_signature_data && (
              <ContractPDFDownload
                title={title || activeContract.title}
                content={content || activeContract.content || ''}
                createdAt={activeContract.created_at}
                photographerName={activeContract.photographer_signed_by_name ?? null}
                photographerSignedAt={activeContract.photographer_signed_at ?? null}
                photographerSignatureData={activeContract.photographer_signature_data ?? null}
                clientName={activeContract.signed_by_name ?? null}
                clientSignedAt={activeContract.signed_at ?? null}
                clientSignatureData={activeContract.signature_data ?? null}
              />
            )}
            {activeContract.status === 'signed' && activeContract.pdf_url && !activeContract.photographer_signature_data && (
              <a
                href={activeContract.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ background: '#3DBA6F', color: '#fff' }}
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            )}
            {/* Copy contract link */}
            {portalUrl && activeContract.status !== 'draft' && (
              <button
                onClick={() => {
                  const contractLink = `${portalUrl}/contract`
                  navigator.clipboard.writeText(contractLink).then(() => {
                    toast.success('Link copied!')
                  }).catch(() => {
                    toast.error('Could not copy link')
                  })
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ background: 'rgba(196,164,124,0.12)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.25)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(196,164,124,0.20)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(196,164,124,0.12)')}
                title="Copy contract link"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy link
              </button>
            )}
          </div>
        </div>

        {/* ── Banner: client signed but photographer hasn't yet ── */}
        {activeContract.status === 'signed' && !activeContract.photographer_signature_data && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(61,186,111,0.08)', border: '1px solid rgba(61,186,111,0.30)' }}>
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#3DBA6F' }} />
            <div>
              <p className="text-[13px] font-bold" style={{ color: '#3DBA6F' }}>
                ✍️ {activeContract.signed_by_name || clientName} hat den Vertrag unterschrieben!
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Jetzt bitte auch deine eigene Unterschrift hinzufügen (siehe unten).
              </p>
            </div>
          </div>
        )}

        {/* ── Client signature block ── */}
        {activeContract.status === 'signed' && (
          <SignatureBlock
            label={clientName || 'Client'}
            name={activeContract.signed_by_name ?? ''}
            signedAt={activeContract.signed_at ?? null}
            ipAddress={activeContract.ip_address ?? null}
            signatureData={activeContract.signature_data ?? null}
            color="#3DBA6F"
            bg="rgba(61,186,111,0.10)"
            border="rgba(61,186,111,0.20)"
          />
        )}

        <ContractEditor
          content={(() => {
            // If contract is signed and has client_fields, apply them to the content for display
            const baseContent = content || activeContract.content || ''
            const fields = activeContract.client_fields as Record<string, string> | null
            if (activeContract.status === 'signed' && fields && Object.keys(fields).length > 0) {
              let result = baseContent
              for (const [key, value] of Object.entries(fields)) {
                const val = String(value || '')
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                result = result.replace(
                  new RegExp(`<span[^>]*>\\{\\{${escapedKey}\\}\\}<\\/span>`, 'g'),
                  `<span style="background:rgba(196,164,124,0.15);color:#8B5CF6;border-radius:3px;padding:0 3px;font-weight:600;">${val}</span>`
                )
                result = result.replace(
                  new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'),
                  `<span style="background:rgba(196,164,124,0.15);color:#8B5CF6;border-radius:3px;padding:0 3px;font-weight:600;">${val}</span>`
                )
              }
              return result
            }
            return baseContent
          })()}
          onChange={setContent}
          editable={activeContract.status === 'draft'}
        />

        {/* ── Photographer signature block ── */}
        {/* Show for all statuses so photographer can always sign */}
        {activeContract.status !== 'draft' ? (
          <PhotographerSignatureSection
            contractId={activeContract.id}
            photographerName={photographerName}
            existingSignature={activeContract.photographer_signature_data ?? null}
            existingName={activeContract.photographer_signed_by_name ?? null}
            existingAt={activeContract.photographer_signed_at ?? null}
            onSaved={(data) => {
              setActiveContract(prev => prev ? { ...prev, ...data } : prev)
            }}
          />
        ) : (
          /* Draft: show a hint that the photographer can sign after sending */
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(196,164,124,0.08)', border: '1px dashed rgba(196,164,124,0.35)' }}>
            <PenLine className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Deine Unterschrift (Fotograf)</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Sende den Vertrag zuerst an den Kunden, um ihn anschließend selbst zu unterschreiben.
              </p>
            </div>
          </div>
        )}

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
                    Save as template
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
                    Template name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. My Wedding Contract"
                    className="input-base w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Short description..."
                    className="input-base w-full"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowSaveTemplate(false)}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Cancel
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
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send modal rendered here for activeContract view */}
        {sendModal}
      </div>
    )
  }

  // ── Contract list ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Contracts
        </h3>
        <div className="relative">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            New contract
            <ChevronDown className="w-3 h-3" />
          </button>

          {showTemplates && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
              <div
                className="dropdown-glass absolute right-0 top-full mt-1 rounded-xl z-20 w-64 overflow-hidden"
              >
                <div className="p-2">
                  {/* Blank */}
                  <button
                    onClick={handleCreateBlank}
                    className="w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Blank contract</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create from scratch</p>
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
                        My templates
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
                    Default templates
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
            No contract yet
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Create a contract from a template or from scratch.
          </p>
          <button
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-page)' }}
          >
            <Plus className="w-3 h-3" />
            Create first contract
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
                        ? `Signed ${formatDateTime(contract.signed_at, 'en')}`
                        : contract.sent_at
                        ? `Sent ${formatDateTime(contract.sent_at, 'en')}`
                        : 'Draft'}
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

      {/* Send modal rendered here for list view */}
      {sendModal}
    </div>
  )
}
