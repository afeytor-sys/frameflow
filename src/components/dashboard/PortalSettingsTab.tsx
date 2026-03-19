'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Eye, EyeOff, MessageCircle, Check, Loader2, FileText, Images,
  Clock, MapPin, Heart, Lightbulb, CloudSun, ExternalLink, Lock,
  Link2, Plus, Trash2, GripVertical, ClipboardList, Globe, Bookmark, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocale } from '@/hooks/useLocale'
import { dashboardT } from '@/lib/dashboardTranslations'

type PortalSections = {
  contract: boolean
  gallery: boolean
  timeline: boolean
  treffpunkt: boolean
  moodboard: boolean
  tips: boolean
  weather: boolean
  questionnaire: boolean
}

const DEFAULT_SECTIONS: PortalSections = {
  contract: true,
  gallery: true,
  timeline: true,
  treffpunkt: true,
  moodboard: false,
  tips: true,
  weather: true,
  questionnaire: true,
}

interface PortalLink {
  label: string
  url: string
}

interface MessageTemplate {
  label: string
  text: string
}

interface Props {
  projectId: string
  clientToken: string | null
  initialSections: PortalSections | null
  initialMessage: string | null
  initialPassword?: string | null
  initialLinks?: PortalLink[] | null
  initialStepsOverride?: Record<string, boolean> | null
  initialPortalLocale?: string | null
  initialMessageTemplates?: MessageTemplate[] | null
  photographerId?: string | null
}

export default function PortalSettingsTab({ projectId, clientToken, initialSections, initialMessage, initialPassword, initialLinks, initialPortalLocale, initialMessageTemplates, photographerId }: Props) {
  const locale = useLocale()
  const t = dashboardT(locale)
  const tp = t.portal

  const [sections, setSections] = useState<PortalSections>({
    ...DEFAULT_SECTIONS,
    ...(initialSections ?? {}),
  })
  const [message, setMessage] = useState(initialMessage ?? '')
  const [portalPassword, setPortalPassword] = useState(initialPassword ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [links, setLinks] = useState<PortalLink[]>(initialLinks ?? [])
  const [portalLocale, setPortalLocale] = useState<string>(initialPortalLocale ?? 'de')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Custom message templates ─────────────────────────────────────
  const [myTemplates, setMyTemplates] = useState<MessageTemplate[]>(initialMessageTemplates ?? [])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const supabase = createClient()

  const toggle = (key: keyof PortalSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Save a new custom template ───────────────────────────────────
  const saveTemplate = async () => {
    if (!message.trim() || !photographerId) return
    const name = templateNameInput.trim() || 'Meine Vorlage'
    setSavingTemplate(true)
    const newTemplates = [...myTemplates, { label: name, text: message.trim() }]
    const { error } = await supabase
      .from('photographers')
      .update({ portal_message_templates: newTemplates })
      .eq('id', photographerId)
    setSavingTemplate(false)
    if (error) { toast.error('Fehler beim Speichern'); return }
    setMyTemplates(newTemplates)
    setShowSaveModal(false)
    setTemplateNameInput('')
    toast.success(`Vorlage "${name}" gespeichert!`)
  }

  // ── Delete a custom template ──────────────────────────────────────
  const deleteTemplate = async (index: number) => {
    if (!photographerId) return
    const newTemplates = myTemplates.filter((_, i) => i !== index)
    const { error } = await supabase
      .from('photographers')
      .update({ portal_message_templates: newTemplates })
      .eq('id', photographerId)
    if (error) { toast.error('Fehler beim Löschen'); return }
    setMyTemplates(newTemplates)
  }

  const addLink = () => setLinks(prev => [...prev, { label: '', url: '' }])
  const removeLink = (i: number) => setLinks(prev => prev.filter((_, idx) => idx !== i))
  const updateLink = (i: number, field: keyof PortalLink, value: string) =>
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const handleSave = async () => {
    setSaving(true)
    const cleanLinks = links.filter(l => l.url.trim())
    const { error } = await supabase
      .from('projects')
      .update({
        portal_sections: sections,
        portal_message: message || null,
        portal_password: portalPassword.trim() || null,
        portal_links: cleanLinks,
        portal_locale: portalLocale,
      })
      .eq('id', projectId)
    setSaving(false)
    if (error) { toast.error(tp.toastError(error.message)); return }
    setSaved(true)
    toast.success(tp.toastSaved)
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCount = Object.values(sections).filter(Boolean).length

  // Section config using translations
  const SECTION_CONFIG: {
    key: keyof PortalSections
    label: string
    description: string
    icon: React.ElementType
    color: string
    bg: string
  }[] = [
    { key: 'contract',      label: tp.sections.contract,      description: tp.sections.contractDesc,      icon: FileText,     color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
    { key: 'gallery',       label: tp.sections.gallery,       description: tp.sections.galleryDesc,       icon: Images,       color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
    { key: 'timeline',      label: tp.sections.timeline,      description: tp.sections.timelineDesc,      icon: Clock,        color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
    { key: 'treffpunkt',    label: tp.sections.treffpunkt,    description: tp.sections.treffpunktDesc,    icon: MapPin,       color: '#EC4899', bg: 'rgba(236,72,153,0.10)' },
    { key: 'tips',          label: tp.sections.tips,          description: tp.sections.tipsDesc,          icon: Lightbulb,    color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
    { key: 'weather',       label: tp.sections.weather,       description: tp.sections.weatherDesc,       icon: CloudSun,     color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' },
    { key: 'moodboard',     label: tp.sections.moodboard,     description: tp.sections.moodboardDesc,     icon: Heart,        color: '#C4A47C', bg: 'rgba(196,164,124,0.12)' },
    { key: 'questionnaire', label: tp.sections.questionnaire, description: tp.sections.questionnaireDesc, icon: ClipboardList, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  ]

  return (
    <div className="space-y-5">

      {/* Header info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: 'rgba(196,164,124,0.08)', border: '1px solid rgba(196,164,124,0.20)' }}>
        <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {tp.configureTitle}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {tp.configureDesc}
          </p>
          {clientToken && (
            <a
              href={`/client/${clientToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[12px] font-bold transition-all hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              <ExternalLink className="w-3 h-3" />
              {tp.openPortal}
            </a>
          )}

          {/* Portal Language */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(196,164,124,0.20)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                {locale === 'de' ? 'Portal-Sprache' : 'Portal Language'}
              </span>
            </div>
            <div className="flex gap-2">
              {[
                { code: 'de', label: '🇩🇪 Deutsch' },
                { code: 'en', label: '🇬🇧 English' },
              ].map(({ code, label }) => {
                const isActive = portalLocale === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setPortalLocale(code)}
                    className="flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                    style={{
                      background: isActive ? 'rgba(196,164,124,0.18)' : 'var(--bg-hover)',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid ${isActive ? 'rgba(196,164,124,0.40)' : 'var(--border-color)'}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {locale === 'de'
                ? 'Sprache des Kundenportals. Standard: Deutsch.'
                : 'Language shown to the client in their portal. Default: German.'}
            </p>
          </div>

          {/* Password */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(196,164,124,0.20)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: portalPassword ? '#8B5CF6' : 'var(--text-muted)' }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                {tp.portalPassword}
              </span>
              {portalPassword && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                  🔒 {tp.active}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={portalPassword}
                onChange={e => setPortalPassword(e.target.value)}
                placeholder={tp.passwordPlaceholder}
                className="input-base w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {portalPassword && (
              <button
                onClick={() => setPortalPassword('')}
                className="mt-1.5 text-[11px] transition-all hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                {tp.removePassword}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visibility toggles */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              {tp.visibility}
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            {tp.activeCount(enabledCount, SECTION_CONFIG.length)}
          </span>
        </div>

        <div className="space-y-2">
          {SECTION_CONFIG.map(({ key, label, description, icon: Icon, color, bg }) => {
            const isOn = sections[key]
            return (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer"
                style={{
                  background: isOn ? bg : 'var(--bg-hover)',
                  border: `1px solid ${isOn ? color + '30' : 'var(--border-color)'}`,
                }}
                onClick={() => toggle(key)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isOn ? bg : 'var(--bg-surface)', border: `1px solid ${isOn ? color + '30' : 'var(--border-color)'}` }}>
                  <Icon className="w-4 h-4" style={{ color: isOn ? color : 'var(--text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-[13px] font-bold" style={{ color: isOn ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {label}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {description}
                  </p>
                </div>
                <div
                  className="relative flex-shrink-0 rounded-full transition-all duration-200"
                  style={{ width: '40px', height: '22px', background: isOn ? color : 'var(--border-strong)' }}
                >
                  <div
                    className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                    style={{ left: isOn ? '20px' : '3px' }}
                  />
                </div>
                {isOn
                  ? <Eye className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  : <EyeOff className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Custom message */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
            {tp.messageTitle}
          </span>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {tp.messageDesc}
        </p>

        {/* Presets + custom templates row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Fixed presets */}
          {tp.presets.map(preset => (
            <button
              key={preset.label}
              onClick={() => setMessage(preset.text)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              {preset.emoji} {preset.label}
            </button>
          ))}

          {/* Custom saved templates */}
          {myTemplates.map((tpl, i) => (
            <div key={i} className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(196,164,124,0.35)' }}>
              <button
                onClick={() => setMessage(tpl.text)}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(196,164,124,0.10)', color: 'var(--accent)' }}
              >
                <Bookmark className="w-3 h-3 flex-shrink-0" />
                {tpl.label}
              </button>
              <button
                onClick={() => deleteTemplate(i)}
                className="px-1.5 py-1 transition-all hover:opacity-80"
                style={{ background: 'rgba(196,164,124,0.06)', color: 'var(--text-muted)', borderLeft: '1px solid rgba(196,164,124,0.20)' }}
                title="Vorlage löschen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={tp.messagePlaceholder}
          rows={4}
          className="input-base w-full resize-none text-[13px]"
        />

        {/* Bottom actions row */}
        <div className="flex items-center justify-between mt-2">
          {message ? (
            <button
              onClick={() => setMessage('')}
              className="text-[11px] transition-all hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              {tp.deleteMessage}
            </button>
          ) : <span />}

          {/* Save as template button */}
          {message.trim() && photographerId && (
            <button
              onClick={() => { setTemplateNameInput(''); setShowSaveModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(196,164,124,0.12)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.30)' }}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Als Vorlage speichern
            </button>
          )}
        </div>

        {message && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(196,164,124,0.08)', border: '1px solid rgba(196,164,124,0.20)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--accent)' }}>
              {tp.messagePreview}
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>
        )}
      </div>

      {/* ── Save template modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="px-6 pt-6 pb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(196,164,124,0.12)' }}>
                <Bookmark className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="text-[16px] font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Vorlage speichern
              </h3>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
                Gib dieser Vorlage einen Namen, damit du sie später schnell wiederfindest.
              </p>
              <input
                autoFocus
                value={templateNameInput}
                onChange={e => setTemplateNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTemplate() }}
                placeholder="z.B. Begrüßung Hochzeit, Galerie bereit…"
                className="input-base w-full text-[13px]"
                maxLength={60}
              />
            </div>
            <div className="flex gap-2 px-6 py-4">
              <button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'var(--accent)' }}
              >
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                Speichern
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Links */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: '#6366F1' }} />
            <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              {tp.linksTitle}
            </span>
          </div>
          <button
            onClick={addLink}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.10)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Plus className="w-3 h-3" />
            {tp.addLink}
          </button>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {tp.linksDesc}
        </p>

        {links.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-6 rounded-xl cursor-pointer transition-all hover:opacity-80"
            style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-color)' }}
            onClick={addLink}
          >
            <Link2 className="w-5 h-5 mb-2 opacity-40" style={{ color: '#6366F1' }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{tp.noLinks}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 flex-shrink-0 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={link.label}
                  onChange={e => updateLink(i, 'label', e.target.value)}
                  placeholder={tp.linkLabelPlaceholder}
                  className="input-base text-[12px] flex-shrink-0"
                  style={{ width: '140px' }}
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={e => updateLink(i, 'url', e.target.value)}
                  placeholder="https://..."
                  className="input-base text-[12px] flex-1 min-w-0"
                />
                <button
                  onClick={() => removeLink(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: 'rgba(196,59,44,0.08)', color: '#C43B2C' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60 hover:opacity-90"
          style={{ background: saved ? '#2A9B68' : 'var(--accent)', boxShadow: '0 1px 8px rgba(196,164,124,0.25)' }}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{tp.saving}</>
          ) : saved ? (
            <><Check className="w-4 h-4" />{tp.saved}</>
          ) : (
            <><Eye className="w-4 h-4" />{tp.savePortal}</>
          )}
        </button>
      </div>
    </div>
  )
}
