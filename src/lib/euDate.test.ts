import { describe, it, expect } from 'vitest'
import { formatIsoDateEU, replaceIsoDatesEU } from './euDate'
import { buildSubmissionMessage, type FormField } from './forms'

describe('formatIsoDateEU', () => {
  it('converts ISO to DD.MM.YYYY', () => expect(formatIsoDateEU('2027-05-06')).toBe('06.05.2027'))
  it('leaves non-dates alone', () => expect(formatIsoDateEU('7 Std')).toBe('7 Std'))
})

describe('replaceIsoDatesEU', () => {
  it('replaces bare dates in text', () => {
    expect(replaceIsoDatesEU('2027-05-06\nHochzeit: 2027-06-01')).toBe('06.05.2027\nHochzeit: 01.06.2027')
  })
  it('does not touch timestamps', () => {
    expect(replaceIsoDatesEU('2027-05-06T10:00:00Z')).toBe('2027-05-06T10:00:00Z')
  })
})

describe('buildSubmissionMessage', () => {
  it('formats date fields as DD.MM.YYYY', () => {
    const fields: FormField[] = [{ id: 'wedding', label: 'Hochzeitsdatum', type: 'date' }]
    expect(buildSubmissionMessage(fields, { wedding: '2027-05-06' }, {})).toBe('Hochzeitsdatum: 06.05.2027')
  })
})
