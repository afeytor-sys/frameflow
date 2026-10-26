import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const PHOTOGRAPHER_ID = 'photographer-1'
const FORM_ID = 'form-1'

let updateCapture: Record<string, unknown> | null = null
let updateResult: { data: unknown; error: unknown }

function makeSupabaseMock() {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: PHOTOGRAPHER_ID } }, error: null }),
    },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          single: async () => ({
            data: { id: FORM_ID, photographer_id: PHOTOGRAPHER_ID },
            error: null,
          }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        updateCapture = patch
        return {
          eq: (_col: string, _val: string) => ({
            select: (_cols: string) => ({
              single: async () => updateResult,
            }),
          }),
        }
      },
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => makeSupabaseMock(),
}))

const { PUT } = await import('./route')

const baseFields = [
  { id: 'name', label: 'Name', type: 'text', core: true },
  { id: 'email', label: 'Email', type: 'email', core: true },
]

function putRequest(body: unknown) {
  return new NextRequest('https://fotonizer.com/api/forms/form-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  updateCapture = null
  updateResult = {
    data: { id: FORM_ID, photographer_id: PHOTOGRAPHER_ID, name: 'Test', fields: baseFields, created_at: '2026-01-01', redirect_url: null },
    error: null,
  }
})

describe('PUT /api/forms/[id] — redirect_url', () => {
  it('persists a valid https:// redirect URL', async () => {
    const res = await PUT(
      putRequest({ fields: baseFields, redirect_url: 'https://example.com/danke' }),
      { params: Promise.resolve({ id: FORM_ID }) }
    )
    expect(res.status).toBe(200)
    expect(updateCapture).toMatchObject({ redirect_url: 'https://example.com/danke' })
  })

  it('rejects an invalid (non-https) redirect URL with 400', async () => {
    const res = await PUT(
      putRequest({ fields: baseFields, redirect_url: 'javascript:alert(1)' }),
      { params: Promise.resolve({ id: FORM_ID }) }
    )
    expect(res.status).toBe(400)
    expect(updateCapture).toBeNull()
  })

  it('rejects a data: redirect URL with 400', async () => {
    const res = await PUT(
      putRequest({ fields: baseFields, redirect_url: 'data:text/html,hi' }),
      { params: Promise.resolve({ id: FORM_ID }) }
    )
    expect(res.status).toBe(400)
    expect(updateCapture).toBeNull()
  })

  it('clears the redirect URL when an empty string is sent', async () => {
    const res = await PUT(
      putRequest({ fields: baseFields, redirect_url: '' }),
      { params: Promise.resolve({ id: FORM_ID }) }
    )
    expect(res.status).toBe(200)
    expect(updateCapture).toMatchObject({ redirect_url: null })
  })

  it('leaves redirect_url untouched when the key is omitted entirely', async () => {
    const res = await PUT(
      putRequest({ fields: baseFields }),
      { params: Promise.resolve({ id: FORM_ID }) }
    )
    expect(res.status).toBe(200)
    expect(updateCapture).not.toHaveProperty('redirect_url')
  })

  it('rejects a hidden field with no queryParam', async () => {
    const fieldsWithHidden = [
      ...baseFields,
      { id: 'source', label: 'Quelle', type: 'hidden' },
    ]
    const res = await PUT(
      putRequest({ fields: fieldsWithHidden }),
      { params: Promise.resolve({ id: FORM_ID }) }
    )
    expect(res.status).toBe(400)
  })
})
