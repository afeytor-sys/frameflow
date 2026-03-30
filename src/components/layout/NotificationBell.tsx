'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title_de: string
  title_en: string
  body_de: string | null
  body_en: string | null
  project_id: string | null
  client_name: string | null
  read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  new_inquiry: '📩',
  contract_signed: '✍️',
  questionnaire_filled: '📋',
  gallery_viewed: '👁️',
  portal_opened: '🔗',
  contract_sent: '📄',
  gallery_delivered: '🖼️',
  reminder_sent: '⏰',
  photo_downloaded: '📥',
  gallery_downloaded: '📦',
  favorite_marked: '❤️',
}

function timeAgo(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (locale === 'de') {
    if (mins < 1) return 'Gerade eben'
    if (mins < 60) return `vor ${mins} Min.`
    if (hours < 24) return `vor ${hours} Std.`
    return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  } else {
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }
}

export default function NotificationBell() {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const unread = notifications.filter(n => !n.read).length

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(o => !o)
    if (!open && unread > 0) {
      setTimeout(markAllRead, 2000)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="header-icon-btn relative w-8 h-8 rounded-xl flex items-center justify-center"
        title={locale === 'de' ? 'Benachrichtigungen' : 'Notifications'}
      >
        <Bell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: '#E84C1A' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="dropdown-glass fixed rounded-2xl overflow-hidden z-[9999]"
            style={{
              top: dropdownPos.top,
              right: dropdownPos.right,
              width: '340px',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {locale === 'de' ? 'Benachrichtigungen' : 'Notifications'}
                </span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(232,76,26,0.12)', color: '#E84C1A' }}>
                    {unread}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] transition-all hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <CheckCheck className="w-3 h-3" />
                  {locale === 'de' ? 'Alle gelesen' : 'Mark all read'}
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {locale === 'de' ? 'Keine Benachrichtigungen' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                notifications.map(n => {
                  const title = locale === 'de' ? n.title_de : n.title_en
                  const body = locale === 'de' ? n.body_de : n.body_en
                  const icon = TYPE_ICONS[n.type] ?? '🔔'

                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 group transition-all hover:opacity-90"
                      style={{
                        background: n.read ? 'transparent' : 'rgba(196,164,124,0.06)',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[16px]"
                        style={{ background: 'var(--bg-hover)' }}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {title}
                          </p>
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {body && (
                          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {body}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {timeAgo(n.created_at, locale)}
                          </span>
                          {n.project_id && (
                            <Link
                              href={`/dashboard/projects/${n.project_id}`}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{ color: 'var(--accent)' }}
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              {locale === 'de' ? 'Projekt' : 'Project'}
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--accent)' }} />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
