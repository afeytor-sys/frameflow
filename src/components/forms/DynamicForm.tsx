'use client'

import { useState } from 'react'
import type { FormField } from '@/lib/forms'

interface DynamicFormProps {
  formId: string
  formName: string
  extraFields: FormField[]
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function DynamicForm({ formId, formName, extraFields }: DynamicFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [extraValues, setExtraValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Name is required'
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!message.trim()) newErrors.message = 'Message is required'

    // Validate required extra fields
    for (const field of extraFields) {
      if (field.required && !extraValues[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

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
      {/* Name */}
      <div>
        <label htmlFor="ff-name" className="block text-sm font-semibold mb-1.5"
          style={{ color: 'var(--text-primary, #111)' }}>
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="ff-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'var(--card-bg, #fff)',
            border: errors.name
              ? '1.5px solid #ef4444'
              : '1.5px solid var(--card-border, #e5e7eb)',
            color: 'var(--text-primary, #111)',
          }}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="ff-email" className="block text-sm font-semibold mb-1.5"
          style={{ color: 'var(--text-primary, #111)' }}>
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="ff-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'var(--card-bg, #fff)',
            border: errors.email
              ? '1.5px solid #ef4444'
              : '1.5px solid var(--card-border, #e5e7eb)',
            color: 'var(--text-primary, #111)',
          }}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Dynamic extra fields */}
      {extraFields.map(field => (
        <div key={field.id}>
          <label htmlFor={`ff-${field.id}`} className="block text-sm font-semibold mb-1.5"
            style={{ color: 'var(--text-primary, #111)' }}>
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              id={`ff-${field.id}`}
              rows={3}
              value={extraValues[field.id] ?? ''}
              onChange={e => setExtraValues(prev => ({ ...prev, [field.id]: e.target.value }))}
              placeholder={field.label}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
              style={{
                background: 'var(--card-bg, #fff)',
                border: errors[field.id]
                  ? '1.5px solid #ef4444'
                  : '1.5px solid var(--card-border, #e5e7eb)',
                color: 'var(--text-primary, #111)',
              }}
            />
          ) : field.type === 'select' && field.options ? (
            <select
              id={`ff-${field.id}`}
              value={extraValues[field.id] ?? ''}
              onChange={e => setExtraValues(prev => ({ ...prev, [field.id]: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--card-bg, #fff)',
                border: errors[field.id]
                  ? '1.5px solid #ef4444'
                  : '1.5px solid var(--card-border, #e5e7eb)',
                color: 'var(--text-primary, #111)',
              }}
            >
              <option value="">Select an option</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              id={`ff-${field.id}`}
              type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
              value={extraValues[field.id] ?? ''}
              onChange={e => setExtraValues(prev => ({ ...prev, [field.id]: e.target.value }))}
              placeholder={field.label}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--card-bg, #fff)',
                border: errors[field.id]
                  ? '1.5px solid #ef4444'
                  : '1.5px solid var(--card-border, #e5e7eb)',
                color: 'var(--text-primary, #111)',
              }}
            />
          )}

          {errors[field.id] && (
            <p className="mt-1 text-xs text-red-500">{errors[field.id]}</p>
          )}
        </div>
      ))}

      {/* Message */}
      <div>
        <label htmlFor="ff-message" className="block text-sm font-semibold mb-1.5"
          style={{ color: 'var(--text-primary, #111)' }}>
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="ff-message"
          rows={5}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us about your project, date, location..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
          style={{
            background: 'var(--card-bg, #fff)',
            border: errors.message
              ? '1.5px solid #ef4444'
              : '1.5px solid var(--card-border, #e5e7eb)',
            color: 'var(--text-primary, #111)',
          }}
        />
        {errors.message && (
          <p className="mt-1 text-xs text-red-500">{errors.message}</p>
        )}
      </div>

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
        style={{
          background: 'var(--accent, #C9A96E)',
          color: '#fff',
        }}
      >
        {loading ? (
          <>
            {/* Simple spinner */}
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
