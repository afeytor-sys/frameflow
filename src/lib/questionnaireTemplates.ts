export interface Question {
  id: string
  type: 'text' | 'textarea' | 'choice' | 'yesno' | 'checkbox'
  label: string
  options?: string[]
  required?: boolean
}

export interface QuestionnaireTemplate {
  key: string
  title: string
  questions: Question[]
}

// ─── English templates ────────────────────────────────────────────────────────
export const QUESTIONNAIRE_TEMPLATES_EN: QuestionnaireTemplate[] = [
  {
    key: 'hochzeit',
    title: 'Wedding Questionnaire',
    questions: [
      { id: 'q1', type: 'text',     label: 'What is the full name of the couple?', required: true },
      { id: 'q2', type: 'text',     label: 'Where will the ceremony take place?', required: true },
      { id: 'q3', type: 'text',     label: 'Where will the reception take place?' },
      { id: 'q4', type: 'text',     label: 'How many guests are expected?' },
      { id: 'q5', type: 'textarea', label: 'Are there any special moments that must be photographed?' },
      { id: 'q6', type: 'textarea', label: 'Do you have any special wishes or ideas for the photos?' },
      { id: 'q7', type: 'textarea', label: 'Are there specific people who must appear in the photos?' },
    ],
  },
  {
    key: 'portrait',
    title: 'Portrait Shooting Questionnaire',
    questions: [
      { id: 'q1', type: 'text',     label: 'What is the occasion for the shoot?', required: true },
      { id: 'q2', type: 'choice',   label: 'What look/style do you want?', options: ['Natural', 'Editorial', 'Glamour', 'Casual'] },
      { id: 'q3', type: 'textarea', label: 'Do you have reference photos or inspirations?' },
      { id: 'q4', type: 'text',     label: 'What colors will you wear at the shoot?' },
      { id: 'q5', type: 'textarea', label: 'Are there any body parts you would prefer not to show?' },
      { id: 'q6', type: 'textarea', label: 'Special wishes or notes?' },
    ],
  },
  {
    key: 'event',
    title: 'Event Questionnaire',
    questions: [
      { id: 'q1', type: 'text',     label: 'Name and type of the event', required: true },
      { id: 'q2', type: 'text',     label: 'Date and time of the event', required: true },
      { id: 'q3', type: 'text',     label: 'Address / location of the event', required: true },
      { id: 'q4', type: 'text',     label: 'How many people are expected?' },
      { id: 'q5', type: 'textarea', label: 'What are the most important moments to be photographed?' },
      { id: 'q6', type: 'textarea', label: 'Is there a schedule or program?' },
      { id: 'q7', type: 'textarea', label: 'Are there specific people or groups that must be photographed?' },
      { id: 'q8', type: 'textarea', label: 'Special wishes or notes?' },
    ],
  },
]

// ─── German templates ─────────────────────────────────────────────────────────
export const QUESTIONNAIRE_TEMPLATES_DE: QuestionnaireTemplate[] = [
  {
    key: 'hochzeit',
    title: 'Hochzeit — Fragebogen',
    questions: [
      { id: 'q1', type: 'text',     label: 'Wie lautet der vollständige Name des Paares?', required: true },
      { id: 'q2', type: 'text',     label: 'Wo findet die Trauung statt?', required: true },
      { id: 'q3', type: 'text',     label: 'Wo findet die Feier statt?' },
      { id: 'q4', type: 'text',     label: 'Wie viele Gäste werden erwartet?' },
      { id: 'q5', type: 'textarea', label: 'Gibt es besondere Momente, die unbedingt fotografiert werden sollen?' },
      { id: 'q6', type: 'textarea', label: 'Habt ihr besondere Wünsche oder Ideen für die Fotos?' },
      { id: 'q7', type: 'textarea', label: 'Gibt es Personen, die unbedingt auf Fotos erscheinen sollen?' },
    ],
  },
  {
    key: 'portrait',
    title: 'Portrait-Shooting — Fragebogen',
    questions: [
      { id: 'q1', type: 'text',     label: 'Was ist der Anlass des Shootings?', required: true },
      { id: 'q2', type: 'choice',   label: 'Welchen Look/Stil möchtest du?', options: ['Natürlich', 'Editorial', 'Glamour', 'Casual'] },
      { id: 'q3', type: 'textarea', label: 'Hast du Referenzfotos oder Inspirationen?' },
      { id: 'q4', type: 'text',     label: 'Welche Farben wirst du beim Shooting tragen?' },
      { id: 'q5', type: 'textarea', label: 'Gibt es Körperstellen, die du lieber nicht zeigen möchtest?' },
      { id: 'q6', type: 'textarea', label: 'Besondere Wünsche oder Anmerkungen?' },
    ],
  },
  {
    key: 'event',
    title: 'Event — Fragebogen',
    questions: [
      { id: 'q1', type: 'text',     label: 'Name und Art des Events', required: true },
      { id: 'q2', type: 'text',     label: 'Datum und Uhrzeit des Events', required: true },
      { id: 'q3', type: 'text',     label: 'Adresse / Location des Events', required: true },
      { id: 'q4', type: 'text',     label: 'Wie viele Personen werden erwartet?' },
      { id: 'q5', type: 'textarea', label: 'Was sind die wichtigsten Momente, die fotografiert werden sollen?' },
      { id: 'q6', type: 'textarea', label: 'Gibt es einen Ablaufplan oder Programmpunkte?' },
      { id: 'q7', type: 'textarea', label: 'Gibt es besondere Personen oder Gruppen, die unbedingt fotografiert werden sollen?' },
      { id: 'q8', type: 'textarea', label: 'Besondere Wünsche oder Anmerkungen?' },
    ],
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────
export function getQuestionnaireTemplatesForLocale(locale: 'en' | 'de'): QuestionnaireTemplate[] {
  return locale === 'de' ? QUESTIONNAIRE_TEMPLATES_DE : QUESTIONNAIRE_TEMPLATES_EN
}

// Keep backward compat
export const QUESTIONNAIRE_TEMPLATES = QUESTIONNAIRE_TEMPLATES_DE
