'use client'

import { useState } from 'react'
import type { FormField } from '@/lib/forms'
import { DEFAULT_FIELDS } from '@/lib/forms'

// ── Inline translations (EN / DE) ─────────────────────────────────────────
const translations = {
  en: {
    subtitle: "Fill out the form below and we'll get back to you shortly.",
    submit: 'Send inquiry',
    sending: 'Sending...',
    successTitle: 'Thanks, your inquiry was sent.',
    successSubtitle: "We'll get back to you as soon as possible.",
    selectPlaceholder: 'Select an option',
    noOptions: 'No options configured for this field.',
    required: (label: string) => `${label} is required`,
    invalidEmail: 'Please enter a valid email address',
    networkError: 'Network error. Please check your connection and try again.',
    serverError: 'Something went wrong. Please try again.',
  },
  de: {
    subtitle: 'Füllen Sie das Formular aus und wir melden uns in Kürze bei Ihnen.',
    submit: 'Anfrage senden',
    sending: 'Wird gesendet...',
    successTitle: 'Danke, Ihre Anfrage wurde gesendet.',
    successSubtitle: 'Wir melden uns so schnell wie möglich bei Ihnen.',
    selectPlaceholder: 'Option auswählen',
    noOptions: 'Keine Optionen für dieses Feld konfiguriert.',
    required: (label: string) => `${label} ist erforderlich`,
    invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    networkError: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    serverError: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
  },
}

function useT() {
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('de')) {
    return translations.de
  }
  return translations.en
}

interface DynamicFormProps {
  formId: string
  formName: string
  /** All form fields including name, email, message. Falls back to DEFAULT_FIELDS if empty. */
  fields: FormField[]
}

const CHOICE_TYPES = ['select', 'radio', 'checkbox'] as const
type ChoiceType = (typeof CHOICE_TYPES)[number]

function isChoiceType(t: string): t is ChoiceType {
  return CHOICE_TYPES.includes(t as ChoiceType)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function DynamicForm({ formId, fields: rawFields }: DynamicFormProps) {
  const t = useT()
  const fields = rawFields && rawFields.length > 0 ? rawFields : DEFAULT_FIELDS

  // Single-value fields: text, email, textarea, date, tel, select, radio
  const [values, setValues] = useState<Record<string, string>>({})
  // Multi-value fields: checkbox only (string[])
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({})

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function setValue(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }))
  }

  function toggleCheckbox(id: string, option: string, checked: boolean) {
    setMultiValues(prev => {
      const current = prev[id] ?? []
      return {
        ...prev,
        [id]: checked ? [...current, option] : current.filter(v => v !== option),
      }
    })
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    for (const field of fields) {
      if (!field.required) continue

      if (field.type === 'checkbox') {
        if (!multiValues[field.id]?.length) {
          newErrors[field.id] = t.required(field.label)
        }
      } else {
        const val = values[field.id]?.trim() ?? ''
        if (!val) {
          newErrors[field.id] = t.required(field.label)
          continue
        }
        if (field.type === 'email' && !isValidEmail(val)) {
          newErrors[field.id] = t.invalidEmail
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return

    // Extract core fields for API
    const name = values['name']?.trim() ?? ''
    const email = values['email']?.trim() ?? ''

    // Build message: use 'message' field if present, otherwise join all non-core values
    const messageParts: string[] = []
    for (const field of fields) {
      if (field.id === 'name' || field.id === 'email') continue
      if (field.type === 'checkbox') {
        const selected = multiValues[field.id] ?? []
        if (selected.length) messageParts.push(`${field.label}: ${selected.join(', ')}`)
      } else {
        const val = values[field.id]?.trim()
        if (val) {
          if (field.id === 'message') {
            messageParts.unshift(val) // message goes first
          } else {
            messageParts.push(`${field.label}: ${val}`)
          }
        }
      }
    }
    const message = messageParts.join('\n')

    setLoading(true)
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error ?? t.serverError)
        return
      }
      setSubmitted(true)
    } catch {
      setServerError(t.networkError)
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
          style={{ background: 'rgba(42,155,104,0.12)', border: '2px solid #2A9B68' }}>
          ✓
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary, #111)' }}>
          {t.successTitle}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary, #666)' }}>
          {t.successSubtitle}
        </p>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {fields.map(field => {
        const err = errors[field.id]
        const hasOptions = field.options && field.options.length > 0
        const borderColor = err ? '#ef4444' : 'var(--card-border, #e5e7eb)'
        const baseInputStyle: React.CSSProperties = {
          background: 'var(--card-bg, #fff)',
          border: `1.5px solid ${borderColor}`,
          color: 'var(--text-primary, #111)',
        }

        return (
          <div key={field.id}>
            <label
              htmlFor={isChoiceType(field.type) ? undefined : `ff-${field.id}`}
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--text-primary, #111)' }}
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {/* ── SELECT ── */}
            {field.type === 'select' && (
              hasOptions ? (
                <select
                  id={`ff-${field.id}`}
                  value={values[field.id] ?? ''}
                  onChange={e => setValue(field.id, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={baseInputStyle}
                >
                  <option value="">{t.selectPlaceholder}</option>
                  {field.options!.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs italic" style={{ color: 'var(--text-muted, #aaa)' }}>
                  {t.noOptions}
                </p>
              )
            )}

            {/* ── RADIO ── */}
            {field.type === 'radio' && (
              hasOptions ? (
                <div className="space-y-2">
                  {field.options!.map(opt => {
                    const selected = values[field.id] === opt
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: `1.5px solid ${selected ? 'var(--accent, #C9A96E)' : borderColor}`,
                          background: selected ? 'rgba(201,169,110,0.07)' : 'var(--card-bg, #fff)',
                        }}
                      >
                        <input
                          type="radio"
                          name={`ff-${field.id}`}
                          value={opt}
                          checked={selected}
                          onChange={() => setValue(field.id, opt)}
                          className="w-4 h-4 flex-shrink-0"
                          style={{ accentColor: 'var(--accent, #C9A96E)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary, #111)' }}>
                          {opt}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: 'var(--text-muted, #aaa)' }}>
                  {t.noOptions}
                </p>
              )
            )}

            {/* ── CHECKBOX ── */}
            {field.type === 'checkbox' && (
              hasOptions ? (
                <div className="space-y-2">
                  {field.options!.map(opt => {
                    const checked = (multiValues[field.id] ?? []).includes(opt)
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: `1.5px solid ${checked ? 'var(--accent, #C9A96E)' : borderColor}`,
                          background: checked ? 'rgba(201,169,110,0.07)' : 'var(--card-bg, #fff)',
                        }}
                      >
                        <input
                          type="checkbox"
                          value={opt}
                          checked={checked}
                          onChange={e => toggleCheckbox(field.id, opt, e.target.checked)}
                          className="w-4 h-4 flex-shrink-0 rounded"
                          style={{ accentColor: 'var(--accent, #C9A96E)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary, #111)' }}>
                          {opt}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: 'var(--text-muted, #aaa)' }}>
                  {t.noOptions}
                </p>
              )
            )}

            {/* ── TEXTAREA ── */}
            {field.type === 'textarea' && (
              <textarea
                id={`ff-${field.id}`}
                rows={field.id === 'message' ? 5 : 3}
                value={values[field.id] ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? field.label}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                style={baseInputStyle}
              />
            )}

            {/* ── TEXT / EMAIL / TEL / DATE ── */}
            {!isChoiceType(field.type) && field.type !== 'textarea' && (
              <input
                id={`ff-${field.id}`}
                type={field.type === 'email' ? 'email'
                  : field.type === 'tel' ? 'tel'
                  : field.type === 'date' ? 'date'
                  : 'text'}
                autoComplete={
                  field.id === 'name' ? 'name'
                  : field.id === 'email' ? 'email'
                  : undefined
                }
                value={values[field.id] ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? field.label}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={baseInputStyle}
              />
            )}

            {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
          </div>
        )
      })}

      {/* Server error */}
      {serverError && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent, #C9A96E)', color: '#fff' }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.sending}
          </>
        ) : (
          t.submit
        )}
      </button>
    </form>
  )
}
