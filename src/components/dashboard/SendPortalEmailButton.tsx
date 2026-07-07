'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import SendEmailModal from './SendEmailModal'
import { useLocale } from '@/hooks/useLocale'

interface PortalSections {
  contract?: boolean
  gallery?: boolean
  timeline?: boolean
  treffpunkt?: boolean
  moodboard?: boolean
  tips?: boolean
  weather?: boolean
  questionnaire?: boolean
  invoice?: boolean
}

interface Props {
  projectId: string
  projectTitle: string
  clientEmail?: string | null
  clientName?: string | null
  studioName?: string | null
  portalUrl: string
  portalPassword?: string | null
  portalSections?: PortalSections | null
}

const SECTION_LABELS_DE: Record<string, string> = {
  contract: 'Vertrag',
  questionnaire: 'Fragebogen',
  invoice: 'Rechnung',
  gallery: 'Galerie',
  timeline: 'Zeitplan',
  treffpunkt: 'Treffpunkt',
  moodboard: 'Moodboard',
  tips: 'Tipps',
  weather: 'Wetter',
}

const SECTION_LABELS_EN: Record<string, string> = {
  contract: 'Contract',
  questionnaire: 'Questionnaire',
  invoice: 'Invoice',
  gallery: 'Gallery',
  timeline: 'Timeline',
  treffpunkt: 'Meeting point',
  moodboard: 'Moodboard',
  tips: 'Tips',
  weather: 'Weather',
}

export default function SendPortalEmailButton({
  projectId, projectTitle, clientEmail, clientName, studioName, portalUrl, portalPassword, portalSections,
}: Props) {
  const locale = useLocale()
  const [template, setTemplate] = useState<{ subject: string; body: string } | null>(null)

  const buildTemplate = () => {
    const SECTION_LABELS = locale === 'de' ? SECTION_LABELS_DE : SECTION_LABELS_EN
    const items = Object.entries(portalSections || {})
      .filter(([, on]) => on)
      .map(([key]) => SECTION_LABELS[key])
      .filter(Boolean)
    if (!items.includes('E-Book')) items.push('E-Book')

    const itemsList = items.map(i => `• ${i}`).join('\n')
    const passwordLine = portalPassword
      ? (locale === 'de' ? `\n🔒 Passwort: ${portalPassword}` : `\n🔒 Password: ${portalPassword}`)
      : ''

    const subject = locale === 'de'
      ? `Dein persönliches Kundenportal – {{project_title}}`
      : `Your personal client portal – {{project_title}}`

    const body = locale === 'de'
      ? `Hallo {{client_name}},

dein persönliches Kundenportal für „{{project_title}}" ist bereit! Hier findest du ab sofort alle wichtigen Infos an einem Ort:

${itemsList}

👉 {{portal_url}}${passwordLine}

Bei Fragen bin ich jederzeit für dich da.

Herzliche Grüße,
{{studio_name}}`
      : `Hello {{client_name}},

your personal client portal for "{{project_title}}" is ready! From now on you'll find everything important in one place:

${itemsList}

👉 {{portal_url}}${passwordLine}

Feel free to reach out if you have any questions.

Best regards,
{{studio_name}}`

    setTemplate({ subject, body })
  }

  return (
    <>
      <button
        onClick={buildTemplate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
        style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <Mail className="w-3.5 h-3.5" />
        {locale === 'de' ? 'Portal senden' : 'Send portal'}
      </button>

      <SendEmailModal
        open={!!template}
        onClose={() => setTemplate(null)}
        projectId={projectId}
        projectTitle={projectTitle}
        clientEmail={clientEmail}
        clientName={clientName}
        studioName={studioName}
        portalUrl={portalUrl}
        initialTemplate={template}
      />
    </>
  )
}
