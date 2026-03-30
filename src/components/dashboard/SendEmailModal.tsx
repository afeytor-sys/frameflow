'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Mail, Send, Clock, ChevronDown, Sparkles, Check } from 'lucide-react'
import { getEmailTemplatesForLocale, CATEGORY_COLORS, type EmailCategory } from '@/lib/emailTemplates'
import { useLocale } from '@/hooks/useLocale'
import toast from 'react-hot-toast'

interface Template {
  id: string
  name: string
  subject: string
  body: string
  category: EmailCategory
}

interface Props {
  open: boolean
  onClose: () => void
  /** Pre-filled values from project context */
  projectId?: string | null
  projectTitle?: string | null
  clientEmail?: string | null
  clientName?: string | null
  studioName?: string | null
  portalUrl?: string | null
  /** Pre-filled template (from "Usar template" button) */
  initialTemplate?: { subject: string; body: string } | null
  /** Called after successful send/schedule so parent can refresh list */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSent?: (email: any) => void
}

function replacePlaceholders(text: string, vars: Record<string, string>) {
  return text
    .replace(/\{\{client_name\}\}/g, vars.client_name || '')
    .replace(/\{\{studio_name\}\}/g, vars.studio_name || '')
    .replace(/\{\{project_title\}\}/g, vars.project_title || '')
    .replace(/\{\{portal_url\}\}/g, vars.portal_url || '')
}

export default function SendEmailModal({
  open,
  onClose,
  projectId,
  projectTitle,
  clientEmail,
  clientName,
  studioName,
  portalUrl,
  initialTemplate,
  onSent,
}: Props) {
  const locale = useLocale()
  const BUILTIN = getEmailTemplatesForLocale(locale)

  const [toEmail, setToEmail] = useState(clientEmail || '')
  const [toName, setToName] = useState(clientName || '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [sending, setSending] = useState(false)

  // Template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [userTemplates, setUserTemplates] = useState<Template[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  const supabase = createClient()

  const vars = {
    client_name: toName || clientName || '',
    studio_name: studioName || '',
    project_title: projectTitle || '',
    portal_url: portalUrl || '',
  }

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return
    setToEmail(clientEmail || '')
    setToName(clientName || '')
    setMode('now')
    setScheduledAt('')
    setSending(false)
    setShowTemplatePicker(false)

    if (initialTemplate) {
      setSubject(replacePlaceholders(initialTemplate.subject, vars))
      setBody(replacePlaceholders(initialTemplate.body, vars))
    } else {
      setSubject('')
      setBody('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTemplate])

  // Load user templates once
  useEffect(() => {
    if (templatesLoaded) return
    supabase
      .from('email_templates')
      .select('id, name, subject, body, category')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setUserTemplates(data as Template[])
        setTemplatesLoaded(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyTemplate = (tpl: { subject: string; body: string }) => {
    setSubject(replacePlaceholders(tpl.subject, vars))
    setBody(replacePlaceholders(tpl.body, vars))
    setShowTemplatePicker(false)
  }

  const handleSend = async () => {
    if (!toEmail.trim()) { toast.error('E-Mail-Adresse erforderlich'); return }
    if (!subject.trim()) { toast.error('Betreff erforderlich'); return }
    if (!body.trim()) { toast.error('Nachricht erforderlich'); return }
    if (mode === 'schedule' && !scheduledAt) { toast.error('Bitte Datum/Uhrzeit wählen'); return }

    setSending(true)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: toEmail.trim(),
          toName: toName.trim() || null,
          subject: subject.trim(),
          body: body.trim(),
          projectId: projectId || null,
          scheduledAt: mode === 'schedule' ? new Date(scheduledAt).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Fehler beim Senden')
        return
      }
      if (json.scheduled) {
        toast.success(`Email geplant für ${new Date(scheduledAt).toLocaleString('de-DE')}`)
      } else {
        toast.success(`Email an ${toEmail} gesendet!`)
      }
      onSent?.(json.email)
      onClose()
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{ height: 'min(92vh, 780px)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.10)' }}>
              <Mail className="w-4.5 h-4.5" style={{ color: '#F97316', width: 18, height: 18 }} />
            </div>
            <div>
              <h2 className="font-black text-[16px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Email senden
              </h2>
              {projectTitle && (
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{projectTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">

          {/* Template picker button */}
          <div className="relative">
            <button
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: '#F97316' }} />
                Template verwenden
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTemplatePicker ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </button>

            {showTemplatePicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTemplatePicker(false)} />
                <div
                  className="dropdown-glass absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl overflow-hidden"
                  style={{ maxHeight: 280, overflowY: 'auto' }}
                >
                  {/* User templates */}
                  {userTemplates.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                        Meine Templates
                      </div>
                      {userTemplates.map(tpl => {
                        const cc = CATEGORY_COLORS[tpl.category]
                        return (
                          <button
                            key={tpl.id}
                            onClick={() => applyTemplate(tpl)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cc.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold truncate">{tpl.name}</p>
                              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{tpl.subject}</p>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                  {/* Builtin templates */}
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                    Standard Templates
                  </div>
                  {BUILTIN.map(tpl => {
                    const cc = CATEGORY_COLORS[tpl.category]
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cc.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate">{tpl.name}</p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{tpl.subject.replace(/\{\{[^}]+\}\}/g, '…')}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* To */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>An (Email) *</label>
              <input
                type="email"
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                placeholder="kunde@email.de"
                className="input-base w-full"
                autoFocus={!clientEmail}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Name (optional)</label>
              <input
                type="text"
                value={toName}
                onChange={e => setToName(e.target.value)}
                placeholder="Max Mustermann"
                className="input-base w-full"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Betreff *</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="z.B. Deine Fotos sind fertig!"
              className="input-base w-full"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Nachricht *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`Hallo ${clientName || '{{client_name}}'},\n\ndeine Fotos sind fertig!\n\nViele Grüße`}
              rows={9}
              className="input-base w-full resize-none"
              style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
            />
          </div>

          {/* Send mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('now')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: mode === 'now' ? '#F97316' : 'var(--bg-hover)',
                color: mode === 'now' ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${mode === 'now' ? '#F97316' : 'var(--border-color)'}`,
              }}
            >
              <Send className="w-4 h-4" />
              Jetzt senden
            </button>
            <button
              onClick={() => setMode('schedule')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: mode === 'schedule' ? '#8B5CF6' : 'var(--bg-hover)',
                color: mode === 'schedule' ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${mode === 'schedule' ? '#8B5CF6' : 'var(--border-color)'}`,
              }}
            >
              <Clock className="w-4 h-4" />
              Planen
            </button>
          </div>

          {/* Schedule date/time */}
          {mode === 'schedule' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Datum & Uhrzeit *</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                className="input-base w-full"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="btn-secondary px-5">Abbrechen</button>
          <button
            onClick={handleSend}
            disabled={sending || !toEmail.trim() || !subject.trim() || !body.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: mode === 'schedule' ? '#8B5CF6' : '#F97316' }}
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : mode === 'schedule'
              ? <><Clock className="w-4 h-4" />Email planen</>
              : <><Check className="w-4 h-4" />Jetzt senden</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
