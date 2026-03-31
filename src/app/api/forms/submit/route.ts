import { NextRequest, NextResponse } from 'next/server'
import { getFormById, submitFormInquiry } from '@/lib/forms'
import { triggerInquiryNotifications } from '@/lib/inquiry-notifications'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { formId, name, email, message } = body

    // ── Server-side validation ──────────────────────────────────────────────
    if (!formId || typeof formId !== 'string') {
      return NextResponse.json({ error: 'Missing formId' }, { status: 400 })
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // ── Verify form exists ──────────────────────────────────────────────────
    const form = await getFormById(formId)
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // ── Submit inquiry ──────────────────────────────────────────────────────
    const result = await submitFormInquiry({
      formId,
      photographerId: form.photographer_id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    })

    // ── Notifications (awaited — serverless functions terminate on response) ─
    await triggerInquiryNotifications({
      photographerId: form.photographer_id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    })

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (err) {
    console.error('[forms/submit] Error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
