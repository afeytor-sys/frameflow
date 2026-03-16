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
    description: 'Professionelle E-Mail für den Rechnungsversand',
    category: 'rechnung',
    subject: 'Deine Rechnung von {{studio_name}}',
    body: `Hallo {{client_name}},

anbei findest du deine Rechnung für das Projekt „{{project_title}}".

Bitte überweise den Betrag bis zum angegebenen Fälligkeitsdatum. Bei Fragen stehe ich dir gerne zur Verfügung.

Du kannst deine Rechnung jederzeit im Kundenportal einsehen:
{{portal_url}}

Vielen Dank für dein Vertrauen!

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'rechnung-erinnerung',
    name: 'Zahlungserinnerung',
    description: 'Freundliche Erinnerung an eine offene Rechnung',
    category: 'rechnung',
    subject: 'Erinnerung: Offene Rechnung – {{project_title}}',
    body: `Hallo {{client_name}},

ich möchte dich freundlich daran erinnern, dass noch eine Rechnung für das Projekt „{{project_title}}" offen ist.

Falls du die Zahlung bereits veranlasst hast, betrachte diese Nachricht bitte als gegenstandslos.

Bei Fragen oder Problemen melde dich gerne bei mir.

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'galerie-bereit',
    name: 'Galerie ist bereit',
    description: 'Benachrichtigung wenn die Bildergalerie fertig ist',
    category: 'galerie',
    subject: '🎉 Deine Fotos sind fertig, {{client_name}}!',
    body: `Hallo {{client_name}},

ich freue mich, dir mitteilen zu können, dass deine Fotos aus dem Projekt „{{project_title}}" fertig bearbeitet sind!

Du kannst deine Galerie jetzt im Kundenportal ansehen, Favoriten markieren und die Bilder herunterladen:
{{portal_url}}

Ich hoffe, die Bilder gefallen dir genauso gut wie mir. Ich freue mich auf dein Feedback!

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'galerie-erinnerung',
    name: 'Galerie-Erinnerung',
    description: 'Erinnerung, dass die Galerie bald abläuft',
    category: 'galerie',
    subject: '⏰ Deine Galerie läuft bald ab – {{project_title}}',
    body: `Hallo {{client_name}},

nur eine kurze Erinnerung: Deine Fotogalerie aus dem Projekt „{{project_title}}" läuft in Kürze ab.

Bitte stelle sicher, dass du alle gewünschten Bilder rechtzeitig heruntergeladen hast:
{{portal_url}}

Bei Fragen melde dich gerne bei mir.

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-standard',
    name: 'Fragebogen senden',
    description: 'Bitte den Kunden, den Fragebogen auszufüllen',
    category: 'fragebogen',
    subject: '📋 Kurzer Fragebogen für dein Shooting – {{project_title}}',
    body: `Hallo {{client_name}},

damit ich dein Shooting perfekt vorbereiten kann, würde ich mich freuen, wenn du dir kurz Zeit nimmst, den folgenden Fragebogen auszufüllen.

Das dauert nur wenige Minuten und hilft mir, deine Wünsche und Vorstellungen besser zu verstehen:
{{portal_url}}

Vielen Dank im Voraus!

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-erinnerung',
    name: 'Fragebogen-Erinnerung',
    description: 'Erinnerung, den Fragebogen noch auszufüllen',
    category: 'fragebogen',
    subject: 'Erinnerung: Fragebogen für „{{project_title}}" noch offen',
    body: `Hallo {{client_name}},

ich wollte kurz nachfragen, ob du schon die Möglichkeit hattest, den Fragebogen für unser Shooting auszufüllen.

Deine Antworten helfen mir sehr bei der Vorbereitung:
{{portal_url}}

Falls du Fragen hast, melde dich gerne!

Herzliche Grüße,
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
