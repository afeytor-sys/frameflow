'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import {
  Mail, Clock, CheckCircle2, XCircle, AlertCircle,
  CalendarDays, User, ChevronRight, Bell, BellOff,
  Zap, History, Send, Trash2, FileText, ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClientRow { full_name: string; email: string | null }

interface ScheduledEmail {
  id: string
  to_email: string
  to_name: string | null
  subject: string
  type: string
  scheduled_at: string
  sent_at: string | null
  cancelled_at: string | null
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  error_message: string | null
  project_id: string | null
  created_at: string
}

interface UpcomingProject {
  id: string
  title: string
  shoot_date: string
  client_url: string | null
  reminders_disabled: boolean
  reminder_7d_sent: boolean
  reminder_1d_sent: boolean
  client: ClientRow | ClientRow[] | null
}

interface SentProject {
  id: string
  title: string
  shoot_date: string
  reminder_7d_sent: boolean
  reminder_1d_sent: boolean
  client: ClientRow | ClientRow[] | null
}

type AutomationSettings = {
  reminder_7d: boolean | null
  reminder_1d: boolean | null
  notify_email_shoot_reminder_photographer: boolean | null
} | null

interface Props {
  upcomingProjects: UpcomingProject[]
  sentProjects: SentProject[]
  automationSettings: AutomationSettings
  scheduledEmails: ScheduledEmail[]
  todayStr: string
  initialLocale?: 'en' | 'de'
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'Automations',
    subtitle: 'Scheduled emails and reminder history',
    scheduledTitle: 'Scheduled Emails',
    scheduledSubtitle: 'Reminders that will be sent automatically',
    historyTitle: 'Sent History',
    historySubtitle: 'Reminders already sent to clients',
    settingsTitle: 'Automation Settings',
    settingsSubtitle: 'Active automations for your account',
    noScheduled: 'No emails scheduled',
    noScheduledDesc: 'No upcoming shoots in the next 30 days with pending reminders.',
    noHistory: 'No reminders sent yet',
    noHistoryDesc: 'Reminders will appear here once they are sent.',
    daysUntil: (n: number) => n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`,
    reminder7d: '7-day reminder',
    reminder1d: '1-day reminder',
    pending: 'Pending',
    sent: 'Sent',
    disabled: 'Disabled',
    noEmail: 'No email',
    noPortal: 'No portal',
    openProject: 'Open project',
    settingReminder7d: '7-day reminder to client',
    settingReminder1d: '1-day reminder to client',
    settingPhotographer: 'Reminder to photographer',
    active: 'Active',
    inactive: 'Inactive',
    cronInfo: 'Reminders are sent daily at 08:00 AM automatically.',
    shootDate: 'Shoot date',
    client: 'Client',
    status: 'Status',
  },
  de: {
    title: 'Automationen',
    subtitle: 'Geplante E-Mails und Erinnerungsverlauf',
    scheduledTitle: 'Geplante E-Mails',
    scheduledSubtitle: 'Erinnerungen, die automatisch gesendet werden',
    historyTitle: 'Gesendet-Verlauf',
    historySubtitle: 'Bereits an Kunden gesendete Erinnerungen',
    settingsTitle: 'Automations-Einstellungen',
    settingsSubtitle: 'Aktive Automationen für dein Konto',
    noScheduled: 'Keine E-Mails geplant',
    noScheduledDesc: 'Keine bevorstehenden Shootings in den nächsten 30 Tagen mit ausstehenden Erinnerungen.',
    noHistory: 'Noch keine Erinnerungen gesendet',
    noHistoryDesc: 'Erinnerungen erscheinen hier, sobald sie gesendet wurden.',
    daysUntil: (n: number) => n === 0 ? 'Heute' : n === 1 ? 'Morgen' : `In ${n} Tagen`,
    reminder7d: '7-Tage-Erinnerung',
    reminder1d: '1-Tage-Erinnerung',
    pending: 'Ausstehend',
    sent: 'Gesendet',
    disabled: 'Deaktiviert',
    noEmail: 'Keine E-Mail',
    noPortal: 'Kein Portal',
    openProject: 'Projekt öffnen',
    settingReminder7d: '7-Tage-Erinnerung an Kunden',
    settingReminder1d: '1-Tage-Erinnerung an Kunden',
    settingPhotographer: 'Erinnerung an Fotografen',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    cronInfo: 'Erinnerungen werden täglich um 08:00 Uhr automatisch gesendet.',
    shootDate: 'Shooting-Datum',
    client: 'Kunde',
    status: 'Status',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getClient(c: ClientRow | ClientRow[] | null): ClientRow | null {
  if (!c) return null
  return Array.isArray(c) ? c[0] ?? null : c
}

function daysUntil(dateStr: string, todayStr: string): number {
  const shoot = new Date(dateStr)
  const today = new Date(todayStr)
  shoot.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((shoot.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string, locale: 'en' | 'de'): string {
  return new Date(dateStr).toLocaleDateString(
    locale === 'de' ? 'de-DE' : 'en-US',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ label, color, icon: Icon }: { label: string; color: string; icon: React.ElementType }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: color + '18', color }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function SettingRow({ label, active, t }: { label: string; active: boolean; t: typeof T['en'] }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: active ? '#10B98118' : '#6B728018' }}
        >
          {active
            ? <Bell className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
            : <BellOff className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
          }
        </div>
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span
        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: active ? '#10B98118' : '#6B728018',
          color: active ? '#10B981' : '#6B7280',
        }}
      >
        {active ? t.active : t.inactive}
      </span>
    </div>
  )
}

// ─── Type icon helper ─────────────────────────────────────────────────────────
function typeIcon(type: string) {
  switch (type) {
    case 'questionnaire': return <ClipboardList className="w-4 h-4" style={{ color: '#8B5CF6' }} />
    case 'contract':      return <FileText className="w-4 h-4" style={{ color: '#F59E0B' }} />
    case 'invoice':       return <FileText className="w-4 h-4" style={{ color: '#10B981' }} />
    case 'gallery':       return <Mail className="w-4 h-4" style={{ color: '#3B82F6' }} />
    default:              return <Send className="w-4 h-4" style={{ color: '#6B7280' }} />
  }
}

function typeColor(type: string): string {
  switch (type) {
    case 'questionnaire': return '#8B5CF6'
    case 'contract':      return '#F59E0B'
    case 'invoice':       return '#10B981'
    case 'gallery':       return '#3B82F6'
    default:              return '#6B7280'
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AutomationsClient({
  upcomingProjects,
  sentProjects,
  automationSettings,
  scheduledEmails: initialScheduledEmails,
  todayStr,
  initialLocale,
}: Props) {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>(initialScheduledEmails)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const handleCancelScheduled = async (id: string) => {
    if (!confirm('Geplanten Versand wirklich abbrechen?')) return
    setCancelling(id)
    const res = await fetch(`/api/emails/schedule?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setScheduledEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' as const, cancelled_at: new Date().toISOString() } : e))
      toast.success('Geplanter Versand abgebrochen')
    } else {
      toast.error('Fehler beim Abbrechen')
    }
    setCancelling(null)
  }
  const hookLocale = useLocale()
  const locale = initialLocale ?? hookLocale
  const t = T[locale]

  const settings = automationSettings ?? { reminder_7d: true, reminder_1d: true, notify_email_shoot_reminder_photographer: true }
  const r7dEnabled = settings.reminder_7d !== false
  const r1dEnabled = settings.reminder_1d !== false
  const photographerEnabled = settings.notify_email_shoot_reminder_photographer !== false

  // Build scheduled email rows: for each upcoming project, show which reminders are pending
  type ScheduledRow = {
    project: UpcomingProject
    type: '7d' | '1d'
    daysLeft: number
    willSendOn: string
    clientRow: ClientRow | null
    blocked: boolean
  }

  const scheduledRows: ScheduledRow[] = []

  for (const project of upcomingProjects) {
    const days = daysUntil(project.shoot_date, todayStr)
    const clientRow = getClient(project.client)
    const blocked = project.reminders_disabled || !project.client_url || !clientRow?.email

    // 7-day reminder: pending if not sent and shoot is >= 7 days away
    if (!project.reminder_7d_sent && days >= 7) {
      const sendDate = new Date(project.shoot_date)
      sendDate.setDate(sendDate.getDate() - 7)
      scheduledRows.push({
        project,
        type: '7d',
        daysLeft: days,
        willSendOn: sendDate.toISOString().split('T')[0],
        clientRow,
        blocked,
      })
    }

    // 1-day reminder: pending if not sent and shoot is >= 1 day away
    if (!project.reminder_1d_sent && days >= 1) {
      const sendDate = new Date(project.shoot_date)
      sendDate.setDate(sendDate.getDate() - 1)
      scheduledRows.push({
        project,
        type: '1d',
        daysLeft: days,
        willSendOn: sendDate.toISOString().split('T')[0],
        clientRow,
        blocked,
      })
    }
  }

  // Sort by willSendOn ascending
  scheduledRows.sort((a, b) => a.willSendOn.localeCompare(b.willSendOn))

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="font-black"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
        >
          {t.title}
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.subtitle}
        </p>
      </div>

      {/* Cron info banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px]"
        style={{ background: 'rgba(196,164,124,0.10)', border: '1px solid rgba(196,164,124,0.25)', color: '#C4A47C' }}
      >
        <Zap className="w-4 h-4 flex-shrink-0" />
        <span>{t.cronInfo}</span>
      </div>

      {/* ── Manually Scheduled Emails ── */}
      {scheduledEmails.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                <Send className="w-4 h-4" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>
                  {locale === 'de' ? 'Manuell geplante E-Mails' : 'Manually Scheduled Emails'}
                </h2>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {locale === 'de' ? 'Von dir geplante Versendungen (Fragebogen, Vertrag, etc.)' : 'Emails you scheduled manually (questionnaire, contract, etc.)'}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {scheduledEmails.map(email => {
              const isPending = email.status === 'pending'
              const isSent = email.status === 'sent'
              const isCancelled = email.status === 'cancelled'
              const isFailed = email.status === 'failed'
              const color = typeColor(email.type)
              const scheduledDate = new Date(email.scheduled_at)
              const isOverdue = isPending && scheduledDate < new Date()

              return (
                <div key={email.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: color + '18' }}
                    >
                      {typeIcon(email.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Subject */}
                      <p className="font-semibold text-[13.5px] truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {email.subject}
                      </p>

                      {/* To + type */}
                      <div className="flex items-center gap-3 flex-wrap text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {email.to_name ? `${email.to_name} (${email.to_email})` : email.to_email}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize"
                          style={{ background: color + '18', color }}
                        >
                          {email.type}
                        </span>
                      </div>

                      {/* Scheduled date */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          <CalendarDays className="w-3 h-3" />
                          {isPending
                            ? (locale === 'de' ? 'Geplant für: ' : 'Scheduled for: ')
                            : isSent
                            ? (locale === 'de' ? 'Gesendet am: ' : 'Sent on: ')
                            : isCancelled
                            ? (locale === 'de' ? 'Abgebrochen am: ' : 'Cancelled on: ')
                            : (locale === 'de' ? 'Fehlgeschlagen: ' : 'Failed: ')
                          }
                          <strong style={{ color: 'var(--text-secondary)' }}>
                            {new Date(
                              isSent ? (email.sent_at ?? email.scheduled_at) :
                              isCancelled ? (email.cancelled_at ?? email.scheduled_at) :
                              email.scheduled_at
                            ).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
                              weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </strong>
                        </span>
                        {isOverdue && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#EF444418', color: '#EF4444' }}>
                            {locale === 'de' ? 'Überfällig' : 'Overdue'}
                          </span>
                        )}
                      </div>

                      {/* Error message */}
                      {isFailed && email.error_message && (
                        <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#EF4444' }}>
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {email.error_message}
                        </p>
                      )}
                    </div>

                    {/* Status + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {isPending && (
                        <StatusBadge label={locale === 'de' ? 'Ausstehend' : 'Pending'} color="#3B82F6" icon={Clock} />
                      )}
                      {isSent && (
                        <StatusBadge label={locale === 'de' ? 'Gesendet' : 'Sent'} color="#10B981" icon={CheckCircle2} />
                      )}
                      {isCancelled && (
                        <StatusBadge label={locale === 'de' ? 'Abgebrochen' : 'Cancelled'} color="#6B7280" icon={XCircle} />
                      )}
                      {isFailed && (
                        <StatusBadge label={locale === 'de' ? 'Fehlgeschlagen' : 'Failed'} color="#EF4444" icon={AlertCircle} />
                      )}

                      {/* Cancel button — only for pending */}
                      {isPending && (
                        <button
                          onClick={() => handleCancelScheduled(email.id)}
                          disabled={cancelling === email.id}
                          className="flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-50"
                          style={{ color: '#EF4444' }}
                        >
                          {cancelling === email.id
                            ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                          {locale === 'de' ? 'Abbrechen' : 'Cancel'}
                        </button>
                      )}

                      {/* Link to project */}
                      {email.project_id && (
                        <Link
                          href={`/dashboard/projects/${email.project_id}`}
                          className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {locale === 'de' ? 'Projekt' : 'Project'}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Scheduled + History */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Scheduled Emails ── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
          >
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#3B82F618' }}>
                  <Clock className="w-4 h-4" style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>{t.scheduledTitle}</h2>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t.scheduledSubtitle}</p>
                </div>
              </div>
            </div>

            {scheduledRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-surface)' }}>
                  <Mail className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-semibold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>{t.noScheduled}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t.noScheduledDesc}</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {scheduledRows.map((row, i) => {
                  const isBlocked = row.blocked || (row.type === '7d' ? !r7dEnabled : !r1dEnabled)
                  const accentColor = row.type === '7d' ? '#3B82F6' : '#8B5CF6'
                  const daysLeft = row.daysLeft

                  return (
                    <div key={`${row.project.id}-${row.type}-${i}`} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {/* Type badge */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: accentColor + '18' }}
                        >
                          <Mail className="w-4 h-4" style={{ color: accentColor }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
                              {row.project.title}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: accentColor + '18', color: accentColor }}
                            >
                              {row.type === '7d' ? t.reminder7d : t.reminder1d}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            {/* Client */}
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {row.clientRow?.full_name ?? '—'}
                            </span>
                            {/* Shoot date */}
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(row.project.shoot_date, locale)}
                            </span>
                          </div>

                          {/* Send date */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {locale === 'de' ? 'Sendet am:' : 'Sends on:'}{' '}
                              <strong style={{ color: 'var(--text-secondary)' }}>
                                {formatDate(row.willSendOn, locale)}
                              </strong>
                            </span>
                            <span
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{
                                background: daysLeft <= 2 ? '#EF444418' : daysLeft <= 7 ? '#F59E0B18' : '#10B98118',
                                color: daysLeft <= 2 ? '#EF4444' : daysLeft <= 7 ? '#F59E0B' : '#10B981',
                              }}
                            >
                              {t.daysUntil(daysLeft)}
                            </span>
                          </div>

                          {/* Warnings */}
                          {isBlocked && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: '#F59E0B' }}>
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span>
                                {row.project.reminders_disabled
                                  ? (locale === 'de' ? 'Erinnerungen deaktiviert' : 'Reminders disabled')
                                  : !row.project.client_url
                                  ? (locale === 'de' ? 'Kein Portal-Link' : 'No portal link')
                                  : !row.clientRow?.email
                                  ? (locale === 'de' ? 'Keine Kunden-E-Mail' : 'No client email')
                                  : (locale === 'de' ? 'Automation deaktiviert' : 'Automation disabled')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status + link */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {isBlocked
                            ? <StatusBadge label={t.disabled} color="#F59E0B" icon={XCircle} />
                            : <StatusBadge label={t.pending} color="#3B82F6" icon={Clock} />
                          }
                          <Link
                            href={`/dashboard/projects/${row.project.id}`}
                            className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.openProject}
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── History ── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
          >
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#10B98118' }}>
                  <History className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <h2 className="font-bold text-[14.5px]" style={{ color: 'var(--text-primary)' }}>{t.historyTitle}</h2>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t.historySubtitle}</p>
                </div>
              </div>
            </div>

            {sentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-surface)' }}>
                  <History className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-semibold text-[14px] mb-1" style={{ color: 'var(--text-primary)' }}>{t.noHistory}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t.noHistoryDesc}</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {sentProjects.map((project) => {
                  const clientRow = getClient(project.client)
                  return (
                    <div key={project.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: '#10B98118' }}
                        >
                          <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
                              {project.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {clientRow?.full_name ?? '—'}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(project.shoot_date, locale)}
                            </span>
                          </div>

                          {/* Which reminders were sent */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {project.reminder_7d_sent && (
                              <StatusBadge label={t.reminder7d} color="#10B981" icon={CheckCircle2} />
                            )}
                            {project.reminder_1d_sent && (
                              <StatusBadge label={t.reminder1d} color="#10B981" icon={CheckCircle2} />
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="flex items-center gap-1 text-[11px] font-medium flex-shrink-0 transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t.openProject}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings panel */}
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#C4A47C18' }}>
                <Zap className="w-4 h-4" style={{ color: '#C4A47C' }} />
              </div>
              <div>
                <h2 className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>{t.settingsTitle}</h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.settingsSubtitle}</p>
              </div>
            </div>

            <div>
              <SettingRow label={t.settingReminder7d} active={r7dEnabled} t={t} />
              <SettingRow label={t.settingReminder1d} active={r1dEnabled} t={t} />
              <div className="pt-3">
                <SettingRow label={t.settingPhotographer} active={photographerEnabled} t={t} />
              </div>
            </div>

            <Link
              href="/dashboard/settings"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {locale === 'de' ? 'Einstellungen ändern' : 'Change settings'}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Stats card */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
          >
            <h3 className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>
              {locale === 'de' ? 'Übersicht' : 'Overview'}
            </h3>
            <div className="space-y-2.5">
              {[
                {
                  label: locale === 'de' ? 'Geplante E-Mails' : 'Scheduled emails',
                  value: scheduledRows.filter(r => !r.blocked).length,
                  color: '#3B82F6',
                },
                {
                  label: locale === 'de' ? 'Manuell geplant' : 'Manually scheduled',
                  value: scheduledEmails.filter(e => e.status === 'pending').length,
                  color: '#8B5CF6',
                },
                {
                  label: locale === 'de' ? 'Blockiert / Deaktiviert' : 'Blocked / Disabled',
                  value: scheduledRows.filter(r => r.blocked).length,
                  color: '#F59E0B',
                },
                {
                  label: locale === 'de' ? 'Bereits gesendet' : 'Already sent',
                  value: sentProjects.reduce((acc, p) => acc + (p.reminder_7d_sent ? 1 : 0) + (p.reminder_1d_sent ? 1 : 0), 0) + scheduledEmails.filter(e => e.status === 'sent').length,
                  color: '#10B981',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
