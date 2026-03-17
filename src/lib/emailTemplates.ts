export type EmailCategory = 'rechnung' | 'galerie' | 'fragebogen' | 'general'

export interface EmailTemplate {
  id: string
  name: string
  description: string
  category: EmailCategory
  subject: string
  body: string
}

// Available placeholders:
// {{client_name}}    — full name of the client
// {{studio_name}}    — photographer's studio/full name
// {{project_title}}  — project title
// {{portal_url}}     — link to client portal

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'rechnung-standard',
    name: 'Rechnung versenden',
    description: 'Professional email for invoice delivery',
    category: 'rechnung',
    subject: 'Deine Rechnung von {{studio_name}}',
    body: `Hallo {{client_name}},

please find your invoice for the project „{{project_title}}".

Please transfer the amount by the specified due date. Feel free to contact me if you have any questions.

Du kannst deine Rechnung jederzeit im Kundenportal einsehen:
{{portal_url}}

Thank you for your trust!

Best regards,
{{studio_name}}`,
  },
  {
    id: 'rechnung-erinnerung',
    name: 'Zahlungserinnerung',
    description: 'Freundliche Erinnerung an eine offene Rechnung',
    category: 'rechnung',
    subject: 'Erinnerung: Offene Rechnung – {{project_title}}',
    body: `Hallo {{client_name}},

I would like to kindly remind you that there is still an open invoice for the project „{{project_title}}" offen ist.

Falls du die Zahlung bereits veranlasst hast, betrachte diese Nachricht bitte als gegenstandslos.

Bei Fragen oder Problemen melde dich gerne bei mir.

Best regards,
{{studio_name}}`,
  },
  {
    id: 'galerie-bereit',
    name: 'Galerie ist bereit',
    description: 'Benachrichtigung wenn die Bildergalerie fertig ist',
    category: 'galerie',
    subject: '🎉 Deine Fotos sind fertig, {{client_name}}!',
    body: `Hallo {{client_name}},

I am happy to let you know that your photos from the project „{{project_title}}" are ready!

Du kannst deine Galerie jetzt im Kundenportal ansehen, Favoriten markieren und die Bilder herunterladen:
{{portal_url}}

Ich hoffe, die Bilder gefallen dir genauso gut wie mir. Ich freue mich auf dein Feedback!

Best regards,
{{studio_name}}`,
  },
  {
    id: 'galerie-erinnerung',
    name: 'Galerie-Erinnerung',
    description: 'Reminder that the gallery will expire soon',
    category: 'galerie',
    subject: '⏰ Your gallery will expire soon – {{project_title}}',
    body: `Hallo {{client_name}},

just a quick reminder: Your photo gallery from the project „{{project_title}}" will expire soon.

Please make sure you have downloaded all desired photos in time:
{{portal_url}}

Bei Fragen melde dich gerne bei mir.

Best regards,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-standard',
    name: 'Fragebogen senden',
    description: 'Ask the client to fill out the questionnaire',
    category: 'fragebogen',
    subject: '📋 Short questionnaire for your shoot – {{project_title}}',
    body: `Hallo {{client_name}},

to prepare your shoot perfectly, I would appreciate it if you could take a moment to fill out the following questionnaire.

It only takes a few minutes and helps me better understand your wishes and ideas:
{{portal_url}}

Vielen Dank im Voraus!

Best regards,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-erinnerung',
    name: 'Fragebogen-Erinnerung',
    description: 'Reminder to fill out the questionnaire',
    category: 'fragebogen',
    subject: 'Erinnerung: Questionnaire for „{{project_title}}" still open',
    body: `Hallo {{client_name}},

I wanted to quickly check if you have had the chance to fill out the questionnaire for our shoot.

Deine Antworten helfen mir sehr bei der Vorbereitung:
{{portal_url}}

Falls du Fragen hast, melde dich gerne!

Best regards,
{{studio_name}}`,
  },
]

export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id)
}

export function getEmailTemplatesByCategory(category: EmailCategory): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter((t) => t.category === category)
}

export const CATEGORY_LABELS: Record<EmailCategory | 'general', string> = {
  rechnung:   'Rechnung',
  galerie:    'Galerie',
  fragebogen: 'Fragebogen',
  general:    'Allgemein',
}

export const CATEGORY_COLORS: Record<EmailCategory | 'general', { color: string; bg: string; border: string }> = {
  rechnung:   { color: '#F97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)' },
  galerie:    { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)' },
  fragebogen: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)' },
  general:    { color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)' },
}

/** Replace {{placeholders}} in subject/body with actual values */
export function applyPlaceholders(
  text: string,
  vars: {
    client_name?: string
    studio_name?: string
    project_title?: string
    portal_url?: string
    invoice_number?: string
    amount?: string
  }
): string {
  return text
    .replace(/\{\{client_name\}\}/g, vars.client_name || '')
    .replace(/\{\{studio_name\}\}/g, vars.studio_name || '')
    .replace(/\{\{project_title\}\}/g, vars.project_title || '')
    .replace(/\{\{portal_url\}\}/g, vars.portal_url || '')
    .replace(/\{\{invoice_number\}\}/g, vars.invoice_number || '')
    .replace(/\{\{amount\}\}/g, vars.amount || '')
}
