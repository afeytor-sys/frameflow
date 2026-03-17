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

// ─── ENGLISH TEMPLATES ───────────────────────────────────────────────────────

export const EMAIL_TEMPLATES_EN: EmailTemplate[] = [
  {
    id: 'rechnung-standard',
    name: 'Send invoice',
    description: 'Professional email for invoice delivery',
    category: 'rechnung',
    subject: 'Your invoice from {{studio_name}}',
    body: `Hello {{client_name}},

please find your invoice for the project "{{project_title}}" attached.

Please transfer the amount by the specified due date. Feel free to contact me if you have any questions.

You can view your invoice at any time in the client portal:
{{portal_url}}

Thank you for your trust!

Best regards,
{{studio_name}}`,
  },
  {
    id: 'rechnung-erinnerung',
    name: 'Payment reminder',
    description: 'Friendly reminder about an outstanding invoice',
    category: 'rechnung',
    subject: 'Reminder: Outstanding invoice – {{project_title}}',
    body: `Hello {{client_name}},

I would like to kindly remind you that there is still an outstanding invoice for the project "{{project_title}}".

If you have already made the payment, please disregard this message.

Feel free to reach out if you have any questions or issues.

Best regards,
{{studio_name}}`,
  },
  {
    id: 'galerie-bereit',
    name: 'Gallery is ready',
    description: 'Notification when the photo gallery is ready',
    category: 'galerie',
    subject: '🎉 Your photos are ready, {{client_name}}!',
    body: `Hello {{client_name}},

I am happy to let you know that your photos from the project "{{project_title}}" are ready!

You can now view your gallery in the client portal, mark favorites and download the images:
{{portal_url}}

I hope you love the photos as much as I do. Looking forward to your feedback!

Best regards,
{{studio_name}}`,
  },
  {
    id: 'galerie-erinnerung',
    name: 'Gallery reminder',
    description: 'Reminder that the gallery will expire soon',
    category: 'galerie',
    subject: '⏰ Your gallery will expire soon – {{project_title}}',
    body: `Hello {{client_name}},

just a quick reminder: Your photo gallery from the project "{{project_title}}" will expire soon.

Please make sure you have downloaded all desired photos in time:
{{portal_url}}

Feel free to reach out if you have any questions.

Best regards,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-standard',
    name: 'Send questionnaire',
    description: 'Ask the client to fill out the questionnaire',
    category: 'fragebogen',
    subject: '📋 Short questionnaire for your shoot – {{project_title}}',
    body: `Hello {{client_name}},

to prepare your shoot perfectly, I would appreciate it if you could take a moment to fill out the following questionnaire.

It only takes a few minutes and helps me better understand your wishes and ideas:
{{portal_url}}

Thank you in advance!

Best regards,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-erinnerung',
    name: 'Questionnaire reminder',
    description: 'Reminder to fill out the questionnaire',
    category: 'fragebogen',
    subject: 'Reminder: Questionnaire for "{{project_title}}" still open',
    body: `Hello {{client_name}},

I wanted to quickly check if you have had the chance to fill out the questionnaire for our shoot.

Your answers help me a lot with the preparation:
{{portal_url}}

Feel free to reach out if you have any questions!

Best regards,
{{studio_name}}`,
  },
]

// ─── GERMAN TEMPLATES ────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES_DE: EmailTemplate[] = [
  {
    id: 'rechnung-standard',
    name: 'Rechnung senden',
    description: 'Professionelle E-Mail zur Rechnungsübermittlung',
    category: 'rechnung',
    subject: 'Deine Rechnung von {{studio_name}}',
    body: `Hallo {{client_name}},

anbei findest du die Rechnung für das Projekt „{{project_title}}".

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

ich möchte dich freundlich daran erinnern, dass für das Projekt „{{project_title}}" noch eine offene Rechnung besteht.

Falls du die Zahlung bereits getätigt hast, betrachte diese Nachricht bitte als gegenstandslos.

Bei Fragen oder Problemen kannst du dich jederzeit bei mir melden.

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'galerie-bereit',
    name: 'Galerie ist bereit',
    description: 'Benachrichtigung wenn die Fotogalerie fertig ist',
    category: 'galerie',
    subject: '🎉 Deine Fotos sind fertig, {{client_name}}!',
    body: `Hallo {{client_name}},

ich freue mich, dir mitteilen zu können, dass deine Fotos aus dem Projekt „{{project_title}}" fertig sind!

Du kannst deine Galerie jetzt im Kundenportal ansehen, Favoriten markieren und die Bilder herunterladen:
{{portal_url}}

Ich hoffe, du liebst die Fotos genauso sehr wie ich. Ich freue mich auf dein Feedback!

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

nur eine kurze Erinnerung: Deine Fotogalerie aus dem Projekt „{{project_title}}" läuft bald ab.

Bitte stelle sicher, dass du alle gewünschten Fotos rechtzeitig heruntergeladen hast:
{{portal_url}}

Bei Fragen stehe ich dir gerne zur Verfügung.

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

um dein Shooting perfekt vorzubereiten, würde ich mich freuen, wenn du dir kurz Zeit nimmst, den folgenden Fragebogen auszufüllen.

Es dauert nur wenige Minuten und hilft mir, deine Wünsche und Ideen besser zu verstehen:
{{portal_url}}

Vielen Dank im Voraus!

Herzliche Grüße,
{{studio_name}}`,
  },
  {
    id: 'fragebogen-erinnerung',
    name: 'Fragebogen-Erinnerung',
    description: 'Erinnerung, den Fragebogen auszufüllen',
    category: 'fragebogen',
    subject: 'Erinnerung: Fragebogen für „{{project_title}}" noch offen',
    body: `Hallo {{client_name}},

ich wollte kurz nachfragen, ob du die Gelegenheit hattest, den Fragebogen für unser Shooting auszufüllen.

Deine Antworten helfen mir sehr bei der Vorbereitung:
{{portal_url}}

Bei Fragen kannst du dich jederzeit bei mir melden!

Herzliche Grüße,
{{studio_name}}`,
  },
]

// ─── DEFAULT EXPORT (backwards compat) ───────────────────────────────────────
export const EMAIL_TEMPLATES = EMAIL_TEMPLATES_EN

// ─── LOCALE HELPER ───────────────────────────────────────────────────────────
export function getEmailTemplatesForLocale(locale: 'en' | 'de'): EmailTemplate[] {
  return locale === 'de' ? EMAIL_TEMPLATES_DE : EMAIL_TEMPLATES_EN
}

export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id)
}

export function getEmailTemplatesByCategory(category: EmailCategory): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter((t) => t.category === category)
}

// ─── CATEGORY LABELS ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS_EN: Record<EmailCategory | 'general', string> = {
  rechnung:   'Invoice',
  galerie:    'Gallery',
  fragebogen: 'Questionnaire',
  general:    'General',
}

export const CATEGORY_LABELS_DE: Record<EmailCategory | 'general', string> = {
  rechnung:   'Rechnung',
  galerie:    'Galerie',
  fragebogen: 'Fragebogen',
  general:    'Allgemein',
}

// Default (backwards compat)
export const CATEGORY_LABELS = CATEGORY_LABELS_EN

export function getCategoryLabelsForLocale(locale: 'en' | 'de'): Record<EmailCategory | 'general', string> {
  return locale === 'de' ? CATEGORY_LABELS_DE : CATEGORY_LABELS_EN
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
