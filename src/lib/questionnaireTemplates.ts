export interface Question {
  id: string
  type: 'text' | 'textarea' | 'choice' | 'yesno' | 'checkbox'
  label: string
  options?: string[] // for 'choice' and 'checkbox' types
  required?: boolean
}

export interface QuestionnaireTemplate {
  key: string
  title: string
  questions: Question[]
}

export const QUESTIONNAIRE_TEMPLATES: QuestionnaireTemplate[] = [
  {
    key: 'hochzeit',
    title: 'Hochzeit — Fragebogen',
    questions: [
      { id: 'q1', type: 'text',     label: 'What is the full name of the couple?', required: true },
      { id: 'q2', type: 'text',     label: 'Wo findet die Trauung statt?', required: true },
      { id: 'q3', type: 'text',     label: 'Wo findet die Feier statt?' },
      { id: 'q4', type: 'text',     label: 'How many guests are expected?' },
      { id: 'q5', type: 'textarea', label: 'Gibt es besondere Momente, die unbedingt fotografiert werden sollen?' },
      { id: 'q6', type: 'textarea', label: 'Do you have any special wishes or ideas for the photos?' },
      { id: 'q7', type: 'textarea', label: 'Gibt es Personen, die unbedingt auf Fotos erscheinen sollen?' },
    ],
  },
  {
    key: 'portrait',
    title: 'Portrait Shooting — Fragebogen',
    questions: [
      { id: 'q1', type: 'text',     label: 'Was ist der Anlass des Shootings?', required: true },
      { id: 'q2', type: 'choice',   label: 'What look/style do you want?', options: ['Natural', 'Editorial', 'Glamour', 'Casual'] },
      { id: 'q3', type: 'textarea', label: 'Hast du Referenzfotos oder Inspirationen?' },
      { id: 'q4', type: 'text',     label: 'What colors will you wear at the shoot?' },
      { id: 'q5', type: 'textarea', label: 'Are there any body parts you would prefer not to show?' },
      { id: 'q6', type: 'textarea', label: 'Special wishes or notes?' },
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
      { id: 'q8', type: 'textarea', label: 'Special wishes or notes?' },
    ],
  },
]
