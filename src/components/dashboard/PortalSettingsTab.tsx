'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Eye, EyeOff, MessageCircle, Check, Loader2, FileText, Images,
  Clock, MapPin, Heart, Lightbulb, CloudSun, ExternalLink, Lock,
  Link2, Plus, Trash2, GripVertical,
} from 'lucide-react'
import toast from 'react-hot-toast'

type PortalSections = {
  contract: boolean
  gallery: boolean
  timeline: boolean
  treffpunkt: boolean
  moodboard: boolean
  tips: boolean
  weather: boolean
}

const DEFAULT_SECTIONS: PortalSections = {
  contract: true,
  gallery: true,
  timeline: true,
  treffpunkt: true,
  moodboard: false,
  tips: true,
  weather: true,
}

const SECTION_CONFIG: {
  key: keyof PortalSections
  label: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
}[] = [
  { key: 'contract',   label: 'Vertrag',       description: 'Vertragscard mit Unterschrift-Button',  icon: FileText,  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  { key: 'gallery',    label: 'Galerie',        description: 'Galeriecard mit Foto-Anzahl',           icon: Images,    color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { key: 'timeline',   label: 'Zeitplan',       description: 'Tagesablauf / Timeline-Card',           icon: Clock,     color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  { key: 'treffpunkt', label: 'Treffpunkt',     description: 'Mini-Karte mit Treffpunkt',             icon: MapPin,    color: '#EC4899', bg: 'rgba(236,72,153,0.10)' },
  { key: 'tips',       label: 'Shooting-Tipps', description: 'Tipps zu Outfit, Licht, Vorbereitung',  icon: Lightbulb, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  { key: 'weather',    label: 'Wetter-Widget',  description: 'Wettervorhersage für den Shooting-Tag', icon: CloudSun,  color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' },
  { key: 'moodboard',  label: 'Moodboard',      description: 'Inspirationsboard für den Kunden',      icon: Heart,     color: '#C4A47C', bg: 'rgba(196,164,124,0.12)' },
]

const MESSAGE_PRESETS = [
  { emoji: '✨', label: 'Galerie in Bearbeitung', text: 'Deine Fotos sind in Bearbeitung! Ich gebe mir die größte Mühe, damit alles perfekt wird. Du erhältst eine Nachricht, sobald die Galerie fertig ist.' },
  { emoji: '🎊', label: 'Galerie fertig', text: 'Deine Galerie ist fertig! Ich hoffe, du liebst deine Fotos genauso sehr wie ich. Schau sie dir an und markiere deine Favoriten!' },
  { emoji: '🎬', label: 'Video fertig', text: 'Dein Video ist fertig! Du kannst es jetzt in der Galerie herunterladen. Ich freue mich auf dein Feedback!' },
  { emoji: '📅', label: 'Shooting morgen', text: 'Dein Shooting ist morgen! Denk daran, dich gut auszuruhen und dein Outfit vorzubereiten. Ich freue mich auf euch!' },
  { emoji: '📸', label: 'Shooting heute', text: 'Heute ist euer großer Tag! Ich bin aufgeregt und freue mich riesig auf das Shooting. Bis gleich!' },
]

interface PortalLink {
  label: string
  url: string
}

interface Props {
  projectId: string
  clientToken: string | null
  initialSections: PortalSections | null
  initialMessage: string | null
  initialPassword?: string | null
  initialLinks?: PortalLink[] | null
  // kept for backwards compat but no longer used in UI
  initialStepsOverride?: Record<string, boolean> | null
}

export default function PortalSettingsTab({ projectId, clientToken, initialSections, initialMessage, initialPassword, initialLinks }: Props) {
  const [sections, setSections] = useState<PortalSections>({
    ...DEFAULT_SECTIONS,
    ...(initialSections ?? {}),
  })
  const [message, setMessage] = useState(initialMessage ?? '')
  const [portalPassword, setPortalPassword] = useState(initialPassword ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [links, setLinks] = useState<PortalLink[]>(initialLinks ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  const toggle = (key: keyof PortalSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
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
      })
      .eq('id', projectId)
    setSaving(false)
    if (error) { toast.error('Fehler: ' + error.message); return }
    setSaved(true)
    toast.success('Portal-Einstellungen gespeichert!')
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCount = Object.values(sections).filter(Boolean).length

  return (
    <div className="space-y-5">

      {/* Header info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: 'rgba(196,164,124,0.08)', border: '1px solid rgba(196,164,124,0.20)' }}>
        <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            Kundenportal konfigurieren
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Wähle, welche Bereiche dein Kunde sieht — und schreibe eine persönliche Nachricht oder einen Update.
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
              Portal in neuem Tab öffnen
            </a>
          )}

        </div>
      </div>

      {/* Portal Password — separate card */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <Lock className="w-4 h-4 flex-shrink-0" style={{ color: portalPassword ? '#8B5CF6' : 'var(--text-muted)' }} />
        <span className="text-[13px] font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
          Portal-Passwort
        </span>
        {portalPassword && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
            🔒 {portalPassword}
          </span>
        )}
        <div className="relative flex-1 min-w-0">
          <input
            type={showPassword ? 'text' : 'password'}
            value={portalPassword}
            onChange={e => setPortalPassword(e.target.value)}
            placeholder="Passwort — leer = kein Schutz"
            className="input-base w-full pr-8 text-[12px]"
            style={{ paddingTop: '6px', paddingBottom: '6px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {portalPassword && (
          <button
            onClick={() => setPortalPassword('')}
            className="text-[11px] flex-shrink-0 transition-all hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            × entfernen
          </button>
        )}
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
              Sichtbarkeit
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            {enabledCount} / {SECTION_CONFIG.length} aktiv
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
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isOn ? bg : 'var(--bg-surface)', border: `1px solid ${isOn ? color + '30' : 'var(--border-color)'}` }}>
                  <Icon className="w-4 h-4" style={{ color: isOn ? color : 'var(--text-muted)' }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-[13px] font-bold" style={{ color: isOn ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {label}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {description}
                  </p>
                </div>

                {/* Toggle */}
                <div
                  className="relative flex-shrink-0 rounded-full transition-all duration-200"
                  style={{ width: '40px', height: '22px', background: isOn ? color : 'var(--border-strong)' }}
                >
                  <div
                    className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                    style={{ left: isOn ? '20px' : '3px' }}
                  />
                </div>

                {/* Eye/EyeOff indicator */}
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
            Nachricht an den Kunden
          </span>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          Diese Nachricht erscheint im Portal als persönliche Nachricht von dir. Leer lassen für automatische Nachricht.
        </p>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MESSAGE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => setMessage(preset.text)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              {preset.emoji} {preset.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="z.B. Deine Galerie ist in Bearbeitung! Lieferung ca. 20. März 📸"
          rows={4}
          className="input-base w-full resize-none text-[13px]"
        />

        {message && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(196,164,124,0.08)', border: '1px solid rgba(196,164,124,0.20)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--accent)' }}>
              Vorschau im Portal
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>
        )}

        {message && (
          <button
            onClick={() => setMessage('')}
            className="mt-2 text-[11px] transition-all hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            × Nachricht löschen (automatisch)
          </button>
        )}
      </div>

      {/* Portal Links */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: '#6366F1' }} />
            <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              Links für den Kunden
            </span>
          </div>
          <button
            onClick={addLink}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.10)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Plus className="w-3 h-3" />
            Link hinzufügen
          </button>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          Füge nützliche Links hinzu, die dein Kunde im Portal sehen soll — z.B. Pinterest-Board, WeTransfer, Dropbox, deine Website, etc.
        </p>

        {links.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-6 rounded-xl cursor-pointer transition-all hover:opacity-80"
            style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-color)' }}
            onClick={addLink}
          >
            <Link2 className="w-5 h-5 mb-2 opacity-40" style={{ color: '#6366F1' }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Noch keine Links — klicke um einen hinzuzufügen</p>
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
                  placeholder="Bezeichnung (z.B. Moodboard)"
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
            <><Loader2 className="w-4 h-4 animate-spin" />Speichern...</>
          ) : saved ? (
            <><Check className="w-4 h-4" />Gespeichert!</>
          ) : (
            <><Eye className="w-4 h-4" />Portal speichern</>
          )}
        </button>
      </div>
    </div>
  )
}
