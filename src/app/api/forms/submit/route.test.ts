import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const PHOTOGRAPHER_ID = 'photographer-1'
const FORM_ID = 'form-1'

let currentForm: { id: string; photographer_id: string; redirect_url: string | null } | null

vi.mock('@/lib/forms', () => ({
  getFormById: vi.fn(async () => currentForm),
  submitFormInquiry: vi.fn(async () => ({ leadId: 'lead-1', conversationId: 'conv-1' })),
}))

vi.mock('@/lib/inquiry-notifications', () => ({
  triggerInquiryNotifications: vi.fn(async () => undefined),
}))

const { POST } = await import('./route')

function submitRequest(body: unknown) {
  return new NextRequest('https://fotonizer.com/api/forms/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  currentForm = { id: FORM_ID, photographer_id: PHOTOGRAPHER_ID, redirect_url: null }
})

describe('POST /api/forms/submit', () => {
  it('saves the inquiry when the form has no redirect URL configured', async () => {
    const res = await POST(
      submitRequest({ formId: FORM_ID, name: 'Jane Doe', email: 'jane@example.com', message: 'Hi there' })
    )
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
  })

  it('saves the inquiry the same way when the form has a redirect URL configured', async () => {
    currentForm = { id: FORM_ID, photographer_id: PHOTOGRAPHER_ID, redirect_url: 'https://example.com/danke' }
    const res = await POST(
      submitRequest({ formId: FORM_ID, name: 'Jane Doe', email: 'jane@example.com', message: 'Hi there' })
    )
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    // The redirect target is never echoed back with personal data attached —
    // the client already knows it from the page load, not from this response.
    expect(data.redirect_url).toBeUndefined()
  })

  it('rejects a submission with an invalid email', async () => {
    const res = await POST(
      submitRequest({ formId: FORM_ID, name: 'Jane Doe', email: 'not-an-email', message: 'Hi there' })
    )
    expect(res.status).toBe(400)
  })

  it('rejects a submission for a form that does not exist', async () => {
    currentForm = null
    const res = await POST(
      submitRequest({ formId: 'missing-form', name: 'Jane Doe', email: 'jane@example.com', message: 'Hi there' })
    )
    expect(res.status).toBe(404)
  })
})
