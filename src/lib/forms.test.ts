import { describe, it, expect } from 'vitest'
import {
  isValidRedirectUrl,
  sanitizeHiddenFieldValue,
  resolveHiddenFieldValues,
  resolveCoreFieldValue,
  getPostSubmitRedirect,
  buildSubmissionMessage,
  type FormField,
} from './forms'

describe('isValidRedirectUrl', () => {
  it('accepts an absolute https:// URL', () => {
    expect(isValidRedirectUrl('https://example.com/danke')).toBe(true)
  })

  it('rejects http:// (non-https) URLs', () => {
    expect(isValidRedirectUrl('http://example.com/danke')).toBe(false)
  })

  it('rejects javascript: URLs', () => {
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects data: URLs', () => {
    expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects relative paths', () => {
    expect(isValidRedirectUrl('/danke')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidRedirectUrl('')).toBe(false)
  })

  it('rejects null and undefined', () => {
    expect(isValidRedirectUrl(null)).toBe(false)
    expect(isValidRedirectUrl(undefined)).toBe(false)
  })

  it('rejects URLs longer than 2000 characters', () => {
    const tooLong = 'https://example.com/' + 'a'.repeat(2000)
    expect(isValidRedirectUrl(tooLong)).toBe(false)
  })

  it('accepts a URL right at the 2000 character limit', () => {
    const base = 'https://example.com/'
    const padded = base + 'a'.repeat(2000 - base.length)
    expect(padded.length).toBe(2000)
    expect(isValidRedirectUrl(padded)).toBe(true)
  })
})

describe('getPostSubmitRedirect', () => {
  it('returns the URL when a valid redirect is configured', () => {
    expect(getPostSubmitRedirect('https://example.com/danke')).toBe('https://example.com/danke')
  })

  it('returns null when no redirect is configured', () => {
    expect(getPostSubmitRedirect(null)).toBeNull()
    expect(getPostSubmitRedirect(undefined)).toBeNull()
  })

  it('falls back to null for an invalid stored URL instead of navigating', () => {
    expect(getPostSubmitRedirect('javascript:alert(1)')).toBeNull()
  })
})

describe('sanitizeHiddenFieldValue', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeHiddenFieldValue('  google-ads  ')).toBe('google-ads')
  })

  it('strips newlines and control characters', () => {
    expect(sanitizeHiddenFieldValue('google\nads\t\r')).toBe('google ads')
  })

  it('strips HTML tags', () => {
    expect(sanitizeHiddenFieldValue('<script>alert(1)</script>')).toBe('alert(1)')
    expect(sanitizeHiddenFieldValue('<b>google</b>-ads')).toBe('google-ads')
    expect(sanitizeHiddenFieldValue('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('neutralizes stray/incomplete angle brackets', () => {
    expect(sanitizeHiddenFieldValue('google-ads<')).toBe('google-ads')
    expect(sanitizeHiddenFieldValue('>google-ads')).toBe('google-ads')
  })

  it('truncates to 100 characters', () => {
    const raw = 'a'.repeat(500)
    const result = sanitizeHiddenFieldValue(raw)
    expect(result.length).toBe(100)
  })
})

describe('resolveHiddenFieldValues', () => {
  const hiddenField: FormField = {
    id: 'source-field',
    label: 'Quelle',
    type: 'hidden',
    queryParam: 'quelle',
  }

  function params(entries: Record<string, string>) {
    return new URLSearchParams(entries)
  }

  it('fills a hidden field from its matching query parameter', () => {
    const resolved = resolveHiddenFieldValues([hiddenField], params({ quelle: 'google-ads' }))
    expect(resolved).toEqual({ 'source-field': 'google-ads' })
  })

  it('omits the field when the query parameter is missing', () => {
    const resolved = resolveHiddenFieldValues([hiddenField], params({}))
    expect(resolved).toEqual({})
  })

  it('falls back to the field id when queryParam is not set', () => {
    const field: FormField = { id: 'utm_source', label: 'UTM Source', type: 'hidden' }
    const resolved = resolveHiddenFieldValues([field], params({ utm_source: 'newsletter' }))
    expect(resolved).toEqual({ utm_source: 'newsletter' })
  })

  it('passes through standard UTM / gclid parameters when configured as hidden fields', () => {
    const fields: FormField[] = [
      { id: 'f1', label: 'UTM Source', type: 'hidden', queryParam: 'utm_source' },
      { id: 'f2', label: 'UTM Medium', type: 'hidden', queryParam: 'utm_medium' },
      { id: 'f3', label: 'UTM Campaign', type: 'hidden', queryParam: 'utm_campaign' },
      { id: 'f4', label: 'Google Click ID', type: 'hidden', queryParam: 'gclid' },
    ]
    const resolved = resolveHiddenFieldValues(
      fields,
      params({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer', gclid: 'abc123' })
    )
    expect(resolved).toEqual({ f1: 'google', f2: 'cpc', f3: 'summer', f4: 'abc123' })
  })

  it('sanitizes the resolved value (trims and truncates)', () => {
    const longValue = 'x'.repeat(300)
    const resolved = resolveHiddenFieldValues([hiddenField], params({ quelle: `  ${longValue}  ` }))
    expect(resolved['source-field'].length).toBe(100)
  })

  it('strips HTML from a value supplied via the URL parameter', () => {
    const resolved = resolveHiddenFieldValues(
      [hiddenField],
      params({ quelle: '<script>alert(1)</script>google-ads' })
    )
    expect(resolved['source-field']).toBe('alert(1)google-ads')
  })

  it('ignores non-hidden fields entirely', () => {
    const textField: FormField = { id: 'name', label: 'Name', type: 'text' }
    const resolved = resolveHiddenFieldValues([textField], params({ name: 'should-not-be-read' }))
    expect(resolved).toEqual({})
  })
})

describe('resolveCoreFieldValue', () => {
  const canonicalFields: FormField[] = [
    { id: 'name', label: 'Name', type: 'text', core: true },
    { id: 'email', label: 'Email', type: 'email', core: true },
  ]

  it('reads name/email directly when the field ids are canonical', () => {
    const values = { name: 'Jane Doe', email: 'jane@example.com' }
    expect(resolveCoreFieldValue(canonicalFields, values, 'name')).toBe('Jane Doe')
    expect(resolveCoreFieldValue(canonicalFields, values, 'email')).toBe('jane@example.com')
  })

  it('falls back to the core-flagged / email-typed field when ids are not canonical (e.g. a buggy duplicate)', () => {
    const malformedFields: FormField[] = [
      { id: 'abc-123', label: 'Name', type: 'text', core: true },
      { id: 'def-456', label: 'Email', type: 'email', core: true },
    ]
    const values = { 'abc-123': 'Jane Doe', 'def-456': 'jane@example.com' }
    expect(resolveCoreFieldValue(malformedFields, values, 'name')).toBe('Jane Doe')
    expect(resolveCoreFieldValue(malformedFields, values, 'email')).toBe('jane@example.com')
  })

  it('returns an empty string when no matching field can be found at all', () => {
    const noCoreFields: FormField[] = [{ id: 'xyz', label: 'Something', type: 'text' }]
    expect(resolveCoreFieldValue(noCoreFields, {}, 'name')).toBe('')
    expect(resolveCoreFieldValue(noCoreFields, {}, 'email')).toBe('')
  })
})

describe('buildSubmissionMessage', () => {
  const fields: FormField[] = [
    { id: 'name', label: 'Name', type: 'text', core: true },
    { id: 'email', label: 'Email', type: 'email', core: true },
    { id: 'message', label: 'Message', type: 'textarea' },
    { id: 'event-date', label: 'Event date', type: 'date' },
    { id: 'source-field', label: 'Quelle', type: 'hidden', queryParam: 'quelle' },
  ]

  it('excludes name and email from the message', () => {
    const message = buildSubmissionMessage(
      fields,
      { name: 'Jane Doe', email: 'jane@example.com', message: 'Hi there' },
      {}
    )
    expect(message).not.toContain('Jane Doe')
    expect(message).not.toContain('jane@example.com')
  })

  it('puts the message field first, followed by other fields', () => {
    const message = buildSubmissionMessage(
      fields,
      { message: 'Hi there', 'event-date': '2026-06-01' },
      {}
    )
    expect(message).toBe('Hi there\nEvent date: 2026-06-01')
  })

  it('includes a hidden field resolved from a URL parameter', () => {
    const message = buildSubmissionMessage(
      fields,
      { message: 'Hi there', 'source-field': 'google-ads' },
      {}
    )
    expect(message).toContain('Quelle: google-ads')
  })

  it('omits the hidden field entirely when no URL parameter was present — the form still works', () => {
    const message = buildSubmissionMessage(
      fields,
      { message: 'Hi there' },
      {}
    )
    expect(message).toBe('Hi there')
    expect(message).not.toContain('Quelle')
  })

  it('joins selected checkbox options with a comma', () => {
    const checkboxFields: FormField[] = [
      ...fields,
      { id: 'interests', label: 'Interests', type: 'checkbox', options: ['Wedding', 'Portrait'] },
    ]
    const message = buildSubmissionMessage(
      checkboxFields,
      {},
      { interests: ['Wedding', 'Portrait'] }
    )
    expect(message).toContain('Interests: Wedding, Portrait')
  })
})
