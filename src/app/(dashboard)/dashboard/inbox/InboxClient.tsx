'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Inbox, Send, ChevronDown, FileText, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  sender: 'lead' | 'photographer'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  photographer_id: string
  lead_name: string
  lead_email: string
  created_at: string
  messages: Message[]
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

interface Props {
  conversations: Conversation[]
  photographerEmail: string | null
  emailTemplates: EmailTemplate[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function getLastMessage(messages: Message[]): Message | null {
  if (!messages || messages.length === 0) return null
  return [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

function getSortedMessages(messages: Message[]): Message[] {
  if (!messages) return []
  return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/**
 * Detect if a message content looks like structured form data.
 * Returns parsed key-value pairs if ≥2 lines match "Label: value" pattern,
 * otherwise returns null (plain text).
 */
function parseFormMessage(content: string): Array<{ label: string; value: string }> | null {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const pairs: Array<{ label: string; value: string }> = []
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      const label = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (label.length > 0 && value.length > 0) {
        pairs.push({ label, value })
      }
    } else {
      // Line doesn't match "Label: value" — treat whole thing as plain text
      return null
    }
  }

  return pairs.length >= 2 ? pairs : null
}

/** Format a value if it looks like a date */
function formatValueIfDate(value: string): string {
  // ISO date pattern: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch {
      return value
    }
  }
  return value
}

/** Check if a label likely refers to an email field */
function isEmailLabel(label: string): boolean {
  return /email|e-mail|mail/i.test(label)
}

/**
 * Extract name / date / location from parsed form fields.
 * Returns an object with whatever could be found (values may be undefined).
 */
function extractLeadData(
  leadName: string,
  pairs: Array<{ label: string; value: string }> | null
): { name: string; date?: string; location?: string } {
  const name = leadName
  if (!pairs) return { name }

  const dateEntry = pairs.find(p =>
    /^(datum|date|event.?date|shoot.?date|hochzeit.?datum|wedding.?date)$/i.test(p.label.trim())
  )
  const locationEntry = pairs.find(p =>
    /^(ort|location|venue|stadt|city|place|hochzeitsort)$/i.test(p.label.trim())
  )

  return {
    name,
    date: dateEntry ? formatValueIfDate(dateEntry.value) : undefined,
    location: locationEntry?.value,
  }
}

/** Replace {{name}}, {{date}}, {{location}} placeholders in a template body */
function replacePlaceholders(
  body: string,
  data: { name: string; date?: string; location?: string }
): string {
  return body
    .replace(/\{\{name\}\}/gi, data.name || '{{name}}')
    .replace(/\{\{date\}\}/gi, data.date || '{{date}}')
    .replace(/\{\{location\}\}/gi, data.location || '{{location}}')
}

// ── Structured message bubble ─────────────────────────────────────────────────

function StructuredMessageBubble({
  pairs,
  leadName,
  createdAt,
}: {
  pairs: Array<{ label: string; value: string }>
  leadName: string
  createdAt: string
}) {
  return (
    <div className="flex justify-start">
      <div style={{ maxWidth: '80%', minWidth: '260px' }}>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-hover, #f5f5f3)',
            border: '1px solid var(--border-color)',
            borderBottomLeftRadius: '4px',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent, #C9A96E)' }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Form submission
            </span>
          </div>
          {/* Fields */}
          <div className="px-4 py-3 space-y-2">
            {pairs.map(({ label, value }) => {
              const formattedValue = formatValueIfDate(value)
              const isEmail = isEmailLabel(label)
              return (
                <div key={label} className="flex items-start gap-2">
                  <span
                    className="text-[12px] font-semibold flex-shrink-0"
                    style={{ color: 'var(--text-secondary)', minWidth: '90px' }}
                  >
                    {label}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                    {isEmail ? (
                      <a
                        href={`mailto:${value}`}
                        className="underline"
                        style={{ color: 'var(--accent, #C9A96E)' }}
                      >
                        {value}
                      </a>
                    ) : (
                      formattedValue
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <p className="text-[10px] mt-1 text-left" style={{ color: 'var(--text-muted)' }}>
          {leadName} · {formatTime(createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InboxClient({ conversations, photographerEmail, emailTemplates }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null
  )

  // Local messages state for optimistic updates — keyed by conversation id
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({})

  // Reply state
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Templates dropdown
  const [showTemplates, setShowTemplates] = useState(false)
  const templatesRef = useRef<HTMLDivElement>(null)

  // Refs for scroll-to-bottom
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  // Merge server messages with local optimistic messages
  const getMessages = useCallback((convId: string): Message[] => {
    const conv = conversations.find(c => c.id === convId)
    const serverMsgs = conv ? getSortedMessages(conv.messages) : []
    const localMsgs = localMessages[convId] ?? []
    const serverIds = new Set(serverMsgs.map(m => m.id))
    const newLocal = localMsgs.filter(m => !serverIds.has(m.id))
    return [...serverMsgs, ...newLocal].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [conversations, localMessages])

  const displayMessages = selected ? getMessages(selected.id) : []

  // Scroll to bottom when messages change or conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages.length, selectedId])

  // Auto-focus textarea + clear reply text when switching conversations
  useEffect(() => {
    setReplyText('')
    setShowTemplates(false)
    // Small delay so the panel has rendered
    const t = setTimeout(() => textareaRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [selectedId])

  // Close templates dropdown on outside click
  useEffect(() => {
    if (!showTemplates) return
    const handler = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTemplates])

  const handleSend = async () => {
    if (!selected || !replyText.trim() || isSending) return

    const content = replyText.trim()
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: Message = {
      id: optimisticId,
      sender: 'photographer',
      content,
      created_at: new Date().toISOString(),
    }

    // Optimistic update
    setLocalMessages(prev => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] ?? []), optimisticMsg],
    }))
    setReplyText('')
    setIsSending(true)

    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id, content }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLocalMessages(prev => ({
          ...prev,
          [selected.id]: (prev[selected.id] ?? []).filter(m => m.id !== optimisticId),
        }))
        setReplyText(content)
        toast.error(data.error ?? 'Failed to send reply')
        return
      }

      if (data.message) {
        setLocalMessages(prev => ({
          ...prev,
          [selected.id]: [
            ...(prev[selected.id] ?? []).filter(m => m.id !== optimisticId),
            data.message,
          ],
        }))
      }

      if (data.emailSent === false) {
        toast('Message saved, but email could not be sent.', { icon: '⚠️' })
      }
    } catch {
      setLocalMessages(prev => ({
        ...prev,
        [selected.id]: (prev[selected.id] ?? []).filter(m => m.id !== optimisticId),
      }))
      setReplyText(content)
      toast.error('Network error — please try again')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  // Extract lead data from the first lead message (for placeholders + mini info)
  const firstLeadMsg = displayMessages.find(m => m.sender === 'lead')
  const firstLeadParsed = firstLeadMsg ? parseFormMessage(firstLeadMsg.content) : null
  const leadData = selected ? extractLeadData(selected.lead_name, firstLeadParsed) : null

  const applyTemplate = (tpl: EmailTemplate) => {
    const body = leadData ? replacePlaceholders(tpl.body, leadData) : tpl.body
    setReplyText(body)
    setShowTemplates(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const quickActions = selected ? [
    {
      label: 'Angebot senden',
      text: `Hallo ${selected.lead_name},\n\nvielen Dank für deine Anfrage! Ich freue mich über dein Interesse.\n\nGerne sende ich dir ein individuelles Angebot zu. Kannst du mir noch ein paar Details mitteilen?\n\nBeste Grüße`,
    },
    {
      label: 'Termin vorschlagen',
      text: `Hallo ${selected.lead_name},\n\nvielen Dank für deine Nachricht! Ich würde mich gerne mit dir für ein kurzes Kennenlerngespräch verabreden.\n\nWärst du verfügbar für einen kurzen Anruf diese Woche?\n\nBeste Grüße`,
    },
  ] : []

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>

      {/* ── Left: Conversation list ─────────────────────────────────────── */}
      <div className="flex flex-col flex-shrink-0 overflow-y-auto"
        style={{
          width: '300px',
          borderRight: '1px solid var(--border-color)',
          background: 'var(--bg-surface, var(--card-bg))',
        }}>

        {/* Header */}
        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4" style={{ color: '#10B981' }} />
            <h1 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
            {conversations.length > 0 && (
              <span className="ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                {conversations.length}
              </span>
            )}
          </div>
        </div>

        {/* Empty state */}
        {conversations.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
            <MessageCircle className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              Submissions from your forms will appear here.
            </p>
          </div>
        )}

        {/* Conversation rows */}
        {conversations.map(conv => {
          const allMsgs = getMessages(conv.id)
          const last = allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : getLastMessage(conv.messages)
          const isActive = conv.id === selectedId
          return (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className="w-full text-left px-4 py-3.5 transition-all flex-shrink-0"
              style={{
                background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
                borderBottom: '1px solid var(--border-color)',
                borderLeft: isActive ? '3px solid #10B981' : '3px solid transparent',
              }}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                  style={{ background: isActive ? '#10B981' : 'var(--accent, #C9A96E)' }}>
                  {conv.lead_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {conv.lead_name}
                    </p>
                    {last && (
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(last.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{conv.lead_email}</p>
                </div>
              </div>
              {last && (
                <p className="text-[12px] truncate pl-10" style={{ color: 'var(--text-secondary)' }}>
                  {last.sender === 'photographer' ? 'You: ' : ''}{last.content}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Right: Message thread ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageCircle className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-6 py-3.5 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                  style={{ background: '#10B981' }}>
                  {selected.lead_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                    {selected.lead_name}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {selected.lead_email}
                    </p>
                    {leadData?.date && (
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        · {leadData.date}
                      </span>
                    )}
                    {leadData?.location && (
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        · {leadData.location}
                      </span>
                    )}
                  </div>
                </div>
                {/* Quick actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {quickActions.map(action => (
                    <button
                      key={action.label}
                      onClick={() => { setReplyText(action.text); setTimeout(() => textareaRef.current?.focus(), 50) }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {displayMessages.length === 0 && (
                <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
              )}
              {displayMessages.map(msg => {
                const isLead = msg.sender === 'lead'

                // Try to parse structured form data for lead messages
                const parsed = isLead ? parseFormMessage(msg.content) : null

                if (parsed) {
                  return (
                    <StructuredMessageBubble
                      key={msg.id}
                      pairs={parsed}
                      leadName={selected.lead_name}
                      createdAt={msg.created_at}
                    />
                  )
                }

                return (
                  <div key={msg.id} className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%]">
                      <div
                        className="px-4 py-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                        style={isLead ? {
                          background: 'var(--bg-hover, #f5f5f3)',
                          color: 'var(--text-primary)',
                          borderBottomLeftRadius: '4px',
                        } : {
                          background: 'var(--msg-sent-bg, #1A1A18)',
                          color: 'var(--msg-sent-color, #FFFFFF)',
                          borderBottomRightRadius: '4px',
                          opacity: msg.id.startsWith('optimistic-') ? 0.7 : 1,
                        }}
                      >
                        {msg.content}
                      </div>
                      <p className={`text-[10px] mt-1 ${isLead ? 'text-left' : 'text-right'}`}
                        style={{ color: 'var(--text-muted)' }}>
                        {isLead ? selected.lead_name : 'You'} · {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Reply area ──────────────────────────────────────────────── */}
            <div className="px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>

              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a reply… (Cmd+Enter to send)"
                  rows={3}
                  disabled={isSending}
                  className="flex-1 resize-none rounded-xl px-4 py-3 text-[13px] leading-relaxed outline-none transition-all disabled:opacity-50"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1.5px solid var(--card-border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent, #C9A96E)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)' }}
                />

                {/* Templates button + Send button */}
                <div className="flex flex-col gap-2 flex-shrink-0">

                  {/* Templates dropdown */}
                  <div className="relative" ref={templatesRef}>
                    <button
                      onClick={() => setShowTemplates(v => !v)}
                      disabled={isSending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-40"
                      style={{
                        background: showTemplates ? 'var(--accent-muted, rgba(201,169,110,0.12))' : 'var(--bg-hover)',
                        border: '1.5px solid var(--card-border)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                      title="Insert email template"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Templates
                      <ChevronDown className="w-3 h-3" style={{ transform: showTemplates ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                    </button>

                    {showTemplates && (
                      <div
                        className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden z-50"
                        style={{
                          width: '260px',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        }}
                      >
                        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Email Templates
                          </p>
                        </div>

                        {emailTemplates.length === 0 ? (
                          <div className="px-4 py-4 text-center">
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              No templates yet.
                            </p>
                            <a
                              href="/dashboard/email-vorlagen"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] mt-1.5"
                              style={{ color: 'var(--accent, #C9A96E)' }}
                            >
                              Create templates
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="max-h-[220px] overflow-y-auto">
                            {emailTemplates.map(tpl => (
                              <button
                                key={tpl.id}
                                onClick={() => applyTemplate(tpl)}
                                className="w-full text-left px-4 py-3 transition-colors"
                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                              >
                                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {tpl.name}
                                </p>
                                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {tpl.subject}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!replyText.trim() || isSending}
                    className="flex items-center justify-center w-full h-10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: replyText.trim() && !isSending ? 'var(--accent, #C9A96E)' : 'var(--bg-hover)',
                      color: replyText.trim() && !isSending ? '#fff' : 'var(--text-muted)',
                    }}
                    title="Send reply (Cmd+Enter)"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                Reply will be sent to {selected.lead_email}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
