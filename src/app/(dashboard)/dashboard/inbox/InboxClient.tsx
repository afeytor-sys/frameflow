'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Inbox, Send } from 'lucide-react'
import toast from 'react-hot-toast'

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

interface Props {
  conversations: Conversation[]
  photographerEmail: string | null
}

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

export default function InboxClient({ conversations, photographerEmail }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null
  )

  // Local messages state for optimistic updates — keyed by conversation id
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({})

  // Reply state
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Refs for scroll-to-bottom
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  // Merge server messages with local optimistic messages
  const getMessages = useCallback((convId: string): Message[] => {
    const conv = conversations.find(c => c.id === convId)
    const serverMsgs = conv ? getSortedMessages(conv.messages) : []
    const localMsgs = localMessages[convId] ?? []
    // Merge: local messages that aren't already in server (by id)
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

  // Clear reply text when switching conversations
  useEffect(() => {
    setReplyText('')
  }, [selectedId])

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
        // Rollback optimistic message
        setLocalMessages(prev => ({
          ...prev,
          [selected.id]: (prev[selected.id] ?? []).filter(m => m.id !== optimisticId),
        }))
        setReplyText(content) // restore text
        toast.error(data.error ?? 'Failed to send reply')
        return
      }

      // Replace optimistic message with real one from server
      if (data.message) {
        setLocalMessages(prev => ({
          ...prev,
          [selected.id]: [
            ...(prev[selected.id] ?? []).filter(m => m.id !== optimisticId),
            data.message,
          ],
        }))
      }

      // Warn if email failed but message was saved
      if (data.emailSent === false) {
        toast('Message saved, but email could not be sent.', { icon: '⚠️' })
      }
    } catch {
      // Rollback
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
    // Cmd+Enter or Ctrl+Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

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
              {/* Avatar + name row */}
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
              {/* Last message preview */}
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
            <div className="px-6 py-4 flex-shrink-0 flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                style={{ background: '#10B981' }}>
                {selected.lead_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                  {selected.lead_name}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {selected.lead_email}
                </p>
              </div>
              <div className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {new Date(selected.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {displayMessages.length === 0 && (
                <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
              )}
              {displayMessages.map(msg => {
                const isLead = msg.sender === 'lead'
                return (
                  <div key={msg.id} className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%]">
                      <div
                        className="px-4 py-3 rounded-2xl text-[13px] leading-relaxed"
                        style={isLead ? {
                          background: 'var(--bg-hover, #f5f5f3)',
                          color: 'var(--text-primary)',
                          borderBottomLeftRadius: '4px',
                        } : {
                          background: 'var(--accent, #C9A96E)',
                          color: '#fff',
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
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent, #C9A96E)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!replyText.trim() || isSending}
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
