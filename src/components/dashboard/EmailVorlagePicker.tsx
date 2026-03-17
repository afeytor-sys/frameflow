'use client'

/**
 * EmailVorlagePicker
 *
 * A reusable modal/dropdown that lets the photographer pick an email template
 * (built-in or user-saved) and applies it to subject + body fields.
 *
 * Usage:
 *   <EmailVorlagePicker
 *     category="fragebogen"          // filter shown templates
 *     onSelect={(subject, body) => { setSubject(subject); setBody(body) }}
 *     vars={{ client_name, studio_name, project_title, portal_url }}
 *   />
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  EMAIL_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  applyPlaceholders,
  type EmailCategory,
} from '@/lib/emailTemplates'
import { Mail, ChevronRight, X, Sparkles, BookMarked, ExternalLink } from 'lucide-react'

interface UserTemplate {
  id: string
  name: string
  description: string | null
  category: EmailCategory
  subject: string
  body: string
}

interface Props {
  /** Filter templates by category. If omitted, shows all. */
  category?: EmailCategory
  /** Called when user selects a template — receives already-interpolated subject + body */
  onSelect: (subject: string, body: string) => void
  /** Placeholder values to interpolate into the template */
  vars?: {
    client_name?: string
    studio_name?: string
    project_title?: string
    portal_url?: string
    invoice_number?: string
    amount?: string
  }
  /** Optional: button label override */
  label?: string
}

export default function EmailVorlagePicker({ category, onSelect, vars = {}, label }: Props) {
  const [open, setOpen] = useState(false)
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [previewTpl, setPreviewTpl] = useState<{
    name: string; subject: string; body: string; category: EmailCategory
  } | null>(null)

  // Load user templates when modal opens
  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const query = supabase
        .from('email_templates')
        .select('id, name, description, category, subject, body')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false })
      if (category) query.eq('category', category)
      const { data } = await query
      setUserTemplates((data as UserTemplate[]) || [])
      setLoading(false)
    }
    load()
  }, [open, category])

  const builtinTemplates = category
    ? EMAIL_TEMPLATES.filter(t => t.category === category)
    : EMAIL_TEMPLATES

  const apply = (subject: string, body: string) => {
    const s = applyPlaceholders(subject, vars)
    const b = applyPlaceholders(body, vars)
    onSelect(s, b)
    setOpen(false)
    setPreviewTpl(null)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90"
        style={{
          background: 'rgba(249,115,22,0.10)',
          color: '#F97316',
          border: '1px solid rgba(249,115,22,0.25)',
        }}
        title="Select email template"
      >
        <Mail className="w-3.5 h-3.5" />
        {label || 'Select template'}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{
              maxHeight: 'min(88vh, 680px)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--card-shadow-hover)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(249,115,22,0.12)' }}
                >
                  <Mail className="w-4 h-4" style={{ color: '#F97316' }} />
                </div>
                <div>
                  <h3 className="font-black text-[15px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Select email template
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {category ? `Kategorie: ${CATEGORY_LABELS[category]}` : 'Alle Kategorien'}
                    {' · '}
                    <a
                      href="/dashboard/email-vorlagen"
                      target="_blank"
                      className="inline-flex items-center gap-0.5 hover:underline"
                      style={{ color: '#F97316' }}
                    >
                      Vorlagen verwalten
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <span className="w-5 h-5 border-2 border-current/20 border-t-current rounded-full animate-spin" style={{ color: '#F97316' }} />
                </div>
              )}

              {/* User templates */}
              {!loading && userTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookMarked className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                      My templates
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {userTemplates.map(tpl => {
                      const cc = CATEGORY_COLORS[tpl.category]
                      return (
                        <TemplateRow
                          key={tpl.id}
                          name={tpl.name}
                          description={tpl.description}
                          subject={tpl.subject}
                          category={tpl.category}
                          cc={cc}
                          onPreview={() => setPreviewTpl(tpl)}
                          onApply={() => apply(tpl.subject, tpl.body)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Built-in templates */}
              {!loading && builtinTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                      Default templates
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {builtinTemplates.map(tpl => {
                      const cc = CATEGORY_COLORS[tpl.category]
                      return (
                        <TemplateRow
                          key={tpl.id}
                          name={tpl.name}
                          description={tpl.description}
                          subject={tpl.subject}
                          category={tpl.category}
                          cc={cc}
                          onPreview={() => setPreviewTpl(tpl)}
                          onApply={() => apply(tpl.subject, tpl.body)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {!loading && userTemplates.length === 0 && builtinTemplates.length === 0 && (
                <div className="text-center py-10">
                  <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: '#F97316' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Keine Vorlagen gefunden</p>
                  <a
                    href="/dashboard/email-vorlagen"
                    target="_blank"
                    className="text-xs mt-1 inline-block hover:underline"
                    style={{ color: '#F97316' }}
                  >
                    Vorlagen erstellen →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview sub-modal */}
      {previewTpl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPreviewTpl(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{
              maxHeight: 'min(88vh, 600px)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--card-shadow-hover)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="font-black text-[15px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {previewTpl.name}
                </h3>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
                  style={{
                    background: CATEGORY_COLORS[previewTpl.category].bg,
                    color: CATEGORY_COLORS[previewTpl.category].color,
                    border: `1px solid ${CATEGORY_COLORS[previewTpl.category].border}`,
                  }}
                >
                  {CATEGORY_LABELS[previewTpl.category]}
                </span>
              </div>
              <button
                onClick={() => setPreviewTpl(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Betreff</p>
                <div
                  className="px-3 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  {applyPlaceholders(previewTpl.subject, vars)}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Nachricht (Preview)</p>
                <div
                  className="px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                >
                  {applyPlaceholders(previewTpl.body, vars)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setPreviewTpl(null)}
                className="text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Back
              </button>
              <button
                onClick={() => apply(previewTpl.subject, previewTpl.body)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#F97316' }}
              >
                <Mail className="w-4 h-4" />
                Diese Vorlage verwenden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────
function TemplateRow({
  name, description, subject, category, cc, onPreview, onApply,
}: {
  name: string
  description: string | null
  subject: string
  category: EmailCategory
  cc: { color: string; bg: string; border: string }
  onPreview: () => void
  onApply: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all"
      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cc.color + '40' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: cc.bg, border: `1px solid ${cc.border}` }}
      >
        <Mail className="w-4 h-4" style={{ color: cc.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
          {subject.replace(/\{\{[^}]+\}\}/g, '…')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onPreview}
          className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Preview
        </button>
        <button
          onClick={onApply}
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
          style={{ background: cc.bg, color: cc.color, border: `1px solid ${cc.border}` }}
        >
          Verwenden
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
