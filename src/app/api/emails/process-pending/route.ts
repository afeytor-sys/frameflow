import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// User-authenticated endpoint to manually process their own pending emails.
// Called from the Automations UI "Send now" button.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Optional: process a specific email ID, or all pending for this photographer
  const body = await request.json().catch(() => ({}))
  const emailId: string | null = body.emailId ?? null

  const serviceClient = createServiceClient()
  const now = new Date().toISOString()

  const query = serviceClient
    .from('scheduled_emails')
    .select('*, photographer:photographers(id, studio_name, full_name, email)')
    .eq('photographer_id', user.id)
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  if (emailId) query.eq('id', emailId)

  const { data: emails, error } = await query.limit(20)

  if (error) {
    console.error('process-pending fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const email of (emails ?? [])) {
    try {
      const photographer = Array.isArray(email.photographer)
        ? email.photographer[0]
        : email.photographer

      const fromName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
      const replyTo = photographer?.email || undefined

      await resend.emails.send({
        from: `${fromName} via Fotonizer <noreply@fotonizer.com>`,
        replyTo,
        to: email.to_email,
        subject: email.subject,
        html: email.html_body,
        text: email.plain_body || undefined,
      })

      await serviceClient
        .from('scheduled_emails')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', email.id)

      sent++
    } catch (e) {
      failed++
      const msg = String(e)
      errors.push(`${email.id}: ${msg}`)
      console.error('process-pending send error:', msg)

      try {
        await serviceClient
          .from('scheduled_emails')
          .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
          .eq('id', email.id)
      } catch { /* non-critical */ }
    }
  }

  return NextResponse.json({ success: true, processed: (emails ?? []).length, sent, failed, errors: errors.length ? errors : undefined })
}
