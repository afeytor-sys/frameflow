'use client'

import { useState } from 'react'
import type { FormField } from '@/lib/forms'
import { DEFAULT_FIELDS } from '@/lib/forms'

interface DynamicFormProps {
  formId: string
  formName: string
  /** All form fields including name, email, message. Falls back to DEFAULT_FIELDS if empty. */
  fields: FormField[]
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function DynamicForm({ formId, fields: rawFields }: DynamicFormProps) {
  // Use DEFAULT_FIELDS if no custom fields configured
  const fields = rawFields && rawFields.length > 0 ? rawFields : DEFAULT_FIELDS

  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function setValue(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }))
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    for (const field of fields) {
      const val = values[field.id]?.trim() ?? ''

      if (field.required && !val) {
        newErrors[field.id] = `${field.label} is required`
        continue
      }

      // Email format check for any email-type field
      if (field.type === 'email' && val && !isValidEmail(val)) {
        newErrors[field.id] = 'Please enter a valid email address'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

    // Extract the 3 core fields the API expects
    const name = values['name']?.trim() ?? ''
    const email = values['email']?.trim() ?? ''
    // Use 'message' field if present, otherwise join all non-core values
    const message = values['message']?.trim()
      ?? Object.entries(values)
        .filter(([k]) => k !== 'name' && k !== 'email')
        .map(([k, v]) => {
          const f = fields.find(f => f.id === k)
          return f ? `${f.label}: ${v}` : v
        })
        .join('\n')

    setLoading(true)
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, name, email, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setServerError('Network error. Please check your connection and try again.')
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
          Thanks, your inquiry was sent.
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary, #666)' }}>
          We'll get back to you as soon as possible.
        </p>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {fields.map(field => {
        const val = values[field.id] ?? ''
        const err = errors[field.id]
        const inputStyle = {
          background: 'var(--card-bg, #fff)',
          border: err ? '1.5px solid #ef4444' : '1.5px solid var(--card-border, #e5e7eb)',
          color: 'var(--text-primary, #111)',
        }

        return (
          <div key={field.id}>
            <label
              htmlFor={`ff-${field.id}`}
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--text-primary, #111)' }}
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={`ff-${field.id}`}
                rows={field.id === 'message' ? 5 : 3}
                value={val}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? field.label}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                style={inputStyle}
              />
            ) : (
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
                value={val}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? field.label}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
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
            Sending...
          </>
        ) : (
          'Send inquiry'
        )}
      </button>
    </form>
  )
}
