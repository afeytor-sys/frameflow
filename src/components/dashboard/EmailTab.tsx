'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Plus, Send, Clock, X, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import SendEmailModal from './SendEmailModal'
import toast from 'react-hot-toast'

interface ProjectEmail {
  id: string
  subject: string
  to_email: string
  to_name: string | null
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  scheduled_at: string
  sent_at: string | null
  plain_body: string | null
  created_at: string
}

interface Props {
  projectId: string
  projectTitle: string
  clientEmail?: string | null
  clientName?: string | null
  studioName?: string | null
  portalUrl?: string | null
}

const STATUS_CONFIG = {
  sent:      { label: 'Gesendet',   color: '#3DBA6F', bg: 'rgba(61,186,111,0.10)',  icon: Send },
  pending:   { label: 'Geplant',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', icon: Clock },
  cancelled: { label: 'Abgebrochen',color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: X },
  failed:    { label: 'Fehlgeschlagen', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', icon: AlertCircle },
}

export default function EmailTab({
  projectId,
  projectTitle,
  clientEmail,
  clientName,
  studioName,
  portalUrl,
}: Props) {
  const [emails, setEmails] = useState<ProjectEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('scheduled_emails')
      .select('id, subject, to_email, to_name, status, scheduled_at, sent_at, plain_body, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setEmails(data as ProjectEmail[])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const cancelEmail = async (id: string) => {
    if (!confirm('Email-Planung wirklich abbrechen?')) return
    setCancellingId(id)
    const { error } = await supabase
      .from('scheduled_emails')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Fehler beim Abbrechen')
    } else {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' } : e))
      toast.success('Email abgebrochen')
    }
    setCancellingId(null)
  }

  const handleSent = (email: ProjectEmail) => {
    setEmails(prev => [email, ...prev])
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-5">
      {/* Send Email Modal */}
      <SendEmailModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projectId={projectId}
        projectTitle={projectTitle}
        clientEmail={clientEmail}
        clientName={clientName}
        studioName={studioName}
        portalUrl={portalUrl}
        onSent={handleSent}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.10)' }}>
            <Mail className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <div>
            <h3 className="font-black text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Emails
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {projectTitle}{clientName ? ` · ${clientName}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: '#F97316' }}
        >
          <Plus className="w-4 h-4" />
          Neuer Email
        </button>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-14 rounded-2xl" style={{ border: '2px dashed var(--border-color)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(249,115,22,0.08)' }}>
            <Mail className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <p className="font-bold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Emails</p>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>
            Sende oder plane Emails direkt aus diesem Projekt.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white mx-auto transition-all hover:opacity-90"
            style={{ background: '#F97316' }}
          >
            <Sparkles className="w-4 h-4" />
            Ersten Email senden
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map(email => {
            const st = STATUS_CONFIG[email.status] || STATUS_CONFIG.sent
            const StatusIcon = st.icon
            const isExpanded = expandedId === email.id
            const isPending = email.status === 'pending'

            return (
              <div
                key={email.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
              >
                <div
                  className="flex items-center gap-4 px-4 py-3.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : email.id)}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: st.bg }}>
                    <StatusIcon className="w-4 h-4" style={{ color: st.color, width: 16, height: 16 }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
                      {email.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        An: {email.to_name ? `${email.to_name} <${email.to_email}>` : email.to_email}
                      </span>
                    </div>
                  </div>

                  {/* Date + status */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                      style={{ background: st.bg, color: st.color }}
                    >
                      <StatusIcon style={{ width: 10, height: 10 }} />
                      {st.label}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {isPending
                        ? `Geplant: ${formatDate(email.scheduled_at)}`
                        : email.sent_at
                        ? `Gesendet: ${formatDate(email.sent_at)}`
                        : formatDate(email.created_at)
                      }
                    </span>
                  </div>

                  {/* Cancel button for pending */}
                  {isPending && (
                    <button
                      onClick={e => { e.stopPropagation(); cancelEmail(email.id) }}
                      disabled={cancellingId === email.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.20)' }}
                    >
                      {cancellingId === email.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <X className="w-3 h-3" />
                      }
                      Abbrechen
                    </button>
                  )}
                </div>

                {/* Expanded body preview */}
                {isExpanded && email.plain_body && (
                  <div
                    className="px-4 pb-4 pt-0"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-2 mt-3" style={{ color: 'var(--text-muted)' }}>
                      Nachricht
                    </p>
                    <div
                      className="text-[13px] leading-relaxed whitespace-pre-wrap px-4 py-3 rounded-xl"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                    >
                      {email.plain_body}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
