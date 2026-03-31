'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle, Inbox, Send, ChevronDown, FileText, ExternalLink,
  MapPin, Calendar, Users, Clock, Tag, Globe, Zap, Timer,
} from 'lucide-react'
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

interface LeadData {
  name: string
  date?: string
  location?: string
  guestCount?: string
  coverageHours?: string
  type?: string
  source?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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

function parseFormMessage(content: string): Array<{ label: string; value: string }> | null {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const pairs: Array<{ label: string; value: string }> = []
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      const label = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (label.length > 0 && value.length > 0) pairs.push({ label, value })
    } else {
      return null
    }
  }
  return pairs.length >= 2 ? pairs : null
}

function formatValueIfDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return value }
  }
  return value
}

function isEmailLabel(label: string): boolean {
  return /email|e-mail|mail/i.test(label)
}

function extractLeadData(
  leadName: string,
  pairs: Array<{ label: string; value: string }> | null,
): LeadData {
  const name = leadName
  if (!pairs) return { name }

  const find = (pattern: RegExp) => pairs.find(p => pattern.test(p.label.trim()))

  const dateEntry     = find(/^(datum|date|event.?date|shoot.?date|hochzeit.?datum|wedding.?date)$/i)
  const locationEntry = find(/^(ort|location|venue|stadt|city|place|hochzeitsort)$/i)
  const guestEntry    = find(/^(g[äa]ste|guests?|g[äa]steanzahl|anzahl.?g[äa]ste|number.?of.?guests?)$/i)
  const hoursEntry    = find(/^(stunden|hours?|coverage.?hours?|stundenzahl|dauer)$/i)
  const typeEntry     = find(/^(typ|type|art|event.?type|art.?der.?feier|hochzeitsart)$/i)
  const sourceEntry   = find(/^(quelle|source|how.?did.?you.?find|woher|kanal)$/i)

  return {
    name,
    date:          dateEntry     ? formatValueIfDate(dateEntry.value) : undefined,
    location:      locationEntry?.value,
    guestCount:    guestEntry?.value,
    coverageHours: hoursEntry?.value,
    type:          typeEntry?.value,
    source:        sourceEntry?.value,
  }
}

function replacePlaceholders(body: string, data: LeadData): string {
  return body
    .replace(/\{\{name\}\}/gi,     data.name     || '{{name}}')
    .replace(/\{\{date\}\}/gi,     data.date     || '{{date}}')
    .replace(/\{\{location\}\}/gi, data.location || '{{location}}')
}

// ── Task 5: Response time calculation ─────────────────────────────────────────

function calcResponseLabel(messages: Message[]): string {
  const firstIn  = messages.find(m => m.sender === 'lead')
  const firstOut = messages.find(m => m.sender === 'photographer')
  if (!firstIn)  return ''
  if (!firstOut) return 'Wartet auf Antwort'
  const diffMs  = new Date(firstOut.created_at).getTime() - new Date(firstIn.created_at).getTime()
  const diffMin = Math.max(0, Math.round(diffMs / 60000))
  if (diffMin < 60)  return `Antwortzeit: ${diffMin} Min.`
  const hours = Math.round(diffMin / 60)
  return `Antwortzeit: ${hours} Std.`
}

// ── Task 2: LeadSummaryCard with visual hierarchy ─────────────────────────────

function LeadSummaryCard({ data }: { data: LeadData }) {
  // Primary fields (date, location) get prominent styling
  // Secondary fields (guests, coverage, type, source) get muted styling
  const primaryFields: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    data.date     && { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Datum',    value: data.date },
    data.location && { icon: <MapPin   className="w-3.5 h-3.5" />, label: 'Ort',      value: data.location },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; value: string }>

  const secondaryFields: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    data.guestCount    && { icon: <Users className="w-3 h-3" />, label: 'Gäste',    value: data.guestCount },
    data.coverageHours && { icon: <Clock className="w-3 h-3" />, label: 'Dauer',    value: data.coverageHours },
    data.type          && { icon: <Tag   className="w-3 h-3" />, label: 'Art',       value: data.type },
    data.source        && { icon: <Globe className="w-3 h-3" />, label: 'Quelle',   value: data.source },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; value: string }>

  if (primaryFields.length === 0 && secondaryFields.length === 0) return null

  return (
    <div
      className="mx-6 mt-4 rounded-xl overflow-hidden flex-shrink-0"
      style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
    >
      {/* Card title */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Lead Summary
        </span>
      </div>

      <div className="px-4 pt-3 pb-3 space-y-3">
        {/* Primary: date + location — large, prominent */}
        {primaryFields.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {primaryFields.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 min-w-0">
                <span style={{ color: 'var(--accent, #C9A96E)', flexShrink: 0 }}>{icon}</span>
                <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Secondary: guests/coverage/type/source — smaller, muted */}
        {secondaryFields.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
            {secondaryFields.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-1.5 min-w-0">
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.7 }}>{icon}</span>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Task 1: QuickActionBar with enhanced behavior ─────────────────────────────

function QuickActionBar({ data, onFill }: { data: LeadData; onFill: (text: string) => void }) {
  const actions = [
    {
      label: 'Angebot senden',
      text: `Hallo ${data.name},\n\nvielen Dank für deine Anfrage! Ich freue mich über dein Interesse.\n\nGerne sende ich dir ein individuelles Angebot zu. Kannst du mir noch ein paar Details mitteilen?\n\nBeste Grüße`,
    },
    {
      label: 'Termin vorschlagen',
      text: `Hallo ${data.name},\n\nvielen Dank für deine Nachricht! Ich würde mich gerne mit dir für ein kurzes Kennenlerngespräch verabreden.\n\nWärst du verfügbar für einen kurzen Anruf diese Woche?\n\nBeste Grüße`,
    },
    {
      label: 'Schnell antworten',
      text: `Hallo ${data.name},\n\nvielen Dank für eure Anfrage${data.date ? ` für den ${data.date}` : ''}${data.location ? ` in ${data.location}` : ''}.\n\nIch melde mich schnellstmöglich bei euch.\n\nBeste Grüße`,
    },
  ]

  return (
    <div className="mx-6 mt-3 mb-1 flex items-center gap-2 flex-shrink-0 flex-wrap">
      <Zap className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
      {actions.map(action => (
        <button
          key={action.label}
          onClick={() => onFill(action.text)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97]"
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent, #C9A96E)'
            e.currentTarget.style.color = 'var(--accent, #C9A96E)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-color)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

// ── Task 4: StructuredMessageBubble (collapsible) ─────────────────────────────

const PREVIEW_ROWS = 3

function StructuredMessageBubble({
  pairs,
  leadName,
  createdAt,
}: {
  pairs: Array<{ label: string; value: string }>
  leadName: string
  createdAt: string
}) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = pairs.length > PREVIEW_ROWS
  const visiblePairs = expanded ? pairs : pairs.slice(0, PREVIEW_ROWS)
  // Approx row height for smooth max-height animation
  const rowPx = 26
  const collapsedH = PREVIEW_ROWS * rowPx + 24   // +24 for py-3 padding
  const expandedH  = pairs.length   * rowPx + 24

  return (
    <div className="flex justify-start">
      <div style={{ maxWidth: '80%', minWidth: '260px' }}>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-hover, #f5f5f3)',
            border: '1px solid var(--border-color)',
            borderBottomLeftRadius: '4px',
            opacity: 0.72,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent, #C9A96E)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Original form submission
            </span>
          </div>

          {/* Animated rows */}
          <div
            style={{
              maxHeight: expanded ? `${expandedH}px` : `${collapsedH}px`,
              overflow: 'hidden',
              transition: 'max-height 280ms ease',
            }}
          >
            <div className="px-4 py-3 space-y-1.5">
              {visiblePairs.map(({ label, value }) => {
                const formattedValue = formatValueIfDate(value)
                const isEmail = isEmailLabel(label)
                return (
                  <div key={label} className="flex items-start gap-2">
                    <span
                      className="text-[11px] font-semibold flex-shrink-0"
                      style={{ color: 'var(--text-muted)', minWidth: '90px' }}
                    >
                      {label}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {isEmail ? (
                        <a href={`mailto:${value}`} className="underline" style={{ color: 'var(--accent, #C9A96E)' }}>
                          {value}
                        </a>
                      ) : formattedValue}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Expand / collapse toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full px-4 py-2 text-[11px] font-medium transition-colors active:scale-[0.99]"
              style={{
                borderTop: '1px solid var(--border-color)',
                color: 'var(--accent, #C9A96E)',
                background: 'var(--bg-surface)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)' }}
            >
              {expanded ? 'Weniger anzeigen ↑' : `Details anzeigen (+${pairs.length - PREVIEW_ROWS}) ↓`}
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1 text-left" style={{ color: 'var(--text-muted)' }}>
          {leadName} · {formatTime(createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InboxClient({ conversations, photographerEmail: _photographerEmail, emailTemplates }: Props) {
  const [selectedId, setSelectedId]       = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null,
  )
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({})
  const [replyText, setReplyText]         = useState('')
  const [isSending, setIsSending]         = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  // Task 1: "ready to send" hint above textarea
  const [showReadyHint, setShowReadyHint] = useState(false)
  // Task 7: hover tracking for message bubbles
  const [hoveredMsgId, setHoveredMsgId]   = useState<string | null>(null)

  const templatesRef   = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const replyAreaRef   = useRef<HTMLDivElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const getMessages = useCallback((convId: string): Message[] => {
    const conv = conversations.find(c => c.id === convId)
    const serverMsgs = conv ? getSortedMessages(conv.messages) : []
    const localMsgs  = localMessages[convId] ?? []
    const serverIds  = new Set(serverMsgs.map(m => m.id))
    const newLocal   = localMsgs.filter(m => !serverIds.has(m.id))
    return [...serverMsgs, ...newLocal].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [conversations, localMessages])

  const displayMessages = selected ? getMessages(selected.id) : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages.length, selectedId])

  useEffect(() => {
    setReplyText('')
    setShowTemplates(false)
    setShowReadyHint(false)
    const t = setTimeout(() => textareaRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [selectedId])

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

    setLocalMessages(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), optimisticMsg] }))
    setReplyText('')
    setShowReadyHint(false)
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
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSend() }
  }

  const firstLeadMsg    = displayMessages.find(m => m.sender === 'lead')
  const firstLeadParsed = firstLeadMsg ? parseFormMessage(firstLeadMsg.content) : null
  const leadData: LeadData | null = selected ? extractLeadData(selected.lead_name, firstLeadParsed) : null

  const applyTemplate = (tpl: EmailTemplate) => {
    const body = leadData ? replacePlaceholders(tpl.body, leadData) : tpl.body
    setReplyText(body)
    setShowTemplates(false)
    setShowReadyHint(true)
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(body.length, body.length)
      }
      replyAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  // Task 1: fill quick action with enhanced behavior
  const fillQuickAction = (text: string) => {
    setReplyText(text)
    setShowReadyHint(true)
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(text.length, text.length)
      }
      replyAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  // Task 3: status badge — yellow for New Lead, blue for In Conversation
  const photographerMsgCount = selected
    ? displayMessages.filter(m => m.sender === 'photographer').length
    : 0
  const statusBadge = selected
    ? photographerMsgCount === 0
      ? { label: 'New Lead',        color: '#CA8A04', bg: 'rgba(234,179,8,0.13)' }
      : { label: 'In Conversation', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' }
    : null

  // Task 5: response time label
  const responseLabel = selected ? calcResponseLabel(displayMessages) : ''

  return (
    <div
      className="flex overflow-hidden rounded-xl"
      style={{
        height: 'calc(100vh - 116px)',
        border: '1px solid var(--border-color)',
      }}
    >

      {/* ── Left: Conversation list (independent scroll) ────────────────── */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{
          width: '300px',
          borderRight: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
        }}
      >
        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4" style={{ color: '#10B981' }} />
            <h1 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
            {conversations.length > 0 && (
              <span
                className="ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
              >
                {conversations.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <MessageCircle className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                Submissions from your forms will appear here.
              </p>
            </div>
          )}
          {conversations.map(conv => {
            const allMsgs  = getMessages(conv.id)
            const last     = allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : getLastMessage(conv.messages)
            const isActive = conv.id === selectedId
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className="w-full text-left px-4 py-3.5 transition-all active:scale-[0.99]"
                style={{
                  background:   isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)',
                  borderLeft:   isActive ? '3px solid #10B981' : '3px solid transparent',
                }}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                    style={{ background: isActive ? '#10B981' : 'var(--accent, #C9A96E)' }}
                  >
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
      </div>

      {/* ── Right: Message thread (independent scroll) ──────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0, background: 'var(--bg-surface)' }}>

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageCircle className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>Select a conversation</p>
          </div>
        ) : (
          <>
            {/* ── Thread header ──────────────────────────────────────────── */}
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
                  style={{ background: '#10B981' }}
                >
                  {selected.lead_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      {selected.lead_name}
                    </p>
                    {/* Task 3: yellow / blue badge */}
                    {statusBadge && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusBadge.bg, color: statusBadge.color }}
                      >
                        {statusBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {selected.lead_email}
                    </p>
                    {/* Task 5: response time */}
                    {responseLabel && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <Timer className="w-3 h-3" />
                        {responseLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lead summary card + quick actions ──────────────────────── */}
            {leadData && (
              <>
                <LeadSummaryCard data={leadData} />
                <QuickActionBar data={leadData} onFill={fillQuickAction} />
              </>
            )}

            {/* ── Messages (independent scroll) ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ minHeight: 0 }}>
              {displayMessages.length === 0 && (
                <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
              )}
              {displayMessages.map(msg => {
                const isLead  = msg.sender === 'lead'
                const parsed  = isLead ? parseFormMessage(msg.content) : null
                const isHover = hoveredMsgId === msg.id

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

                // Task 7: hover effect on plain message bubbles
                const leadBg   = isHover ? 'var(--bg-surface, #ebebeb)' : 'var(--bg-hover, #f5f5f3)'
                const sentBg   = 'var(--msg-sent-bg, #1A1A18)'

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    <div className="max-w-[70%]">
                      <div
                        className="px-4 py-4 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap transition-colors duration-150"
                        style={isLead ? {
                          background: leadBg,
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderBottomLeftRadius: '4px',
                        } : {
                          background: sentBg,
                          color: 'var(--msg-sent-color, #FFFFFF)',
                          borderBottomRightRadius: '4px',
                          opacity: msg.id.startsWith('optimistic-') ? 0.7 : 1,
                        }}
                      >
                        {msg.content}
                      </div>
                      <p
                        className={`text-[10px] mt-1 ${isLead ? 'text-left' : 'text-right'}`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {isLead ? selected.lead_name : 'You'} · {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Reply area ──────────────────────────────────────────────── */}
            <div
              ref={replyAreaRef}
              className="px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
            >
              {/* Task 1: "ready to send" hint — fades out once user starts typing */}
              <div
                className="mb-1.5 transition-all duration-300 overflow-hidden"
                style={{
                  maxHeight: showReadyHint ? '20px' : '0px',
                  opacity: showReadyHint ? 1 : 0,
                }}
              >
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Bereit zum Senden 👇
                </p>
              </div>

              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={e => {
                    setReplyText(e.target.value)
                    if (showReadyHint) setShowReadyHint(false)
                  }}
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
                  onFocus={e  => { e.currentTarget.style.borderColor = 'var(--accent, #C9A96E)' }}
                  onBlur={e   => { e.currentTarget.style.borderColor = 'var(--card-border)' }}
                />

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {/* Templates dropdown */}
                  <div className="relative" ref={templatesRef}>
                    <button
                      onClick={() => setShowTemplates(v => !v)}
                      disabled={isSending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all active:scale-[0.97] disabled:opacity-40"
                      style={{
                        background: showTemplates ? 'var(--accent-muted, rgba(201,169,110,0.12))' : 'var(--bg-hover)',
                        border: '1.5px solid var(--card-border)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Templates
                      <ChevronDown
                        className="w-3 h-3"
                        style={{ transform: showTemplates ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                      />
                    </button>

                    {showTemplates && (
                      <div
                        className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden z-50"
                        style={{
                          width: '260px',
                          background: 'var(--dropdown-bg)',
                          border: '1px solid var(--dropdown-border)',
                          boxShadow: 'var(--dropdown-shadow)',
                        }}
                      >
                        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Email Templates
                          </p>
                        </div>
                        {emailTemplates.length === 0 ? (
                          <div className="px-4 py-4 text-center">
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No templates yet.</p>
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
                                className="w-full text-left px-4 py-3 transition-colors active:scale-[0.99]"
                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                              >
                                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{tpl.subject}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Send */}
                  <button
                    onClick={handleSend}
                    disabled={!replyText.trim() || isSending}
                    className="flex items-center justify-center w-full h-10 rounded-xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: replyText.trim() && !isSending ? 'var(--accent, #C9A96E)' : 'var(--bg-hover)',
                      color:      replyText.trim() && !isSending ? '#fff' : 'var(--text-muted)',
                    }}
                    title="Send reply (Cmd+Enter)"
                  >
                    {isSending
                      ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
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
