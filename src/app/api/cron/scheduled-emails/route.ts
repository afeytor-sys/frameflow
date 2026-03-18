import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Called every hour by Vercel Cron
// Finds all pending scheduled emails where scheduled_at <= now() and sends them
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Fetch all pending emails that are due
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select(`
      *,
      photographer:photographers(id, studio_name, full_name, email)
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(50) // process max 50 per run to avoid timeouts

  if (error) {
    console.error('Error fetching scheduled emails:', error)
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

      // Mark as sent
      await supabase
        .from('scheduled_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', email.id)

      // Create in-app notification for photographer (non-critical)
      if (photographer?.id) {
        try {
          await supabase.from('notifications').insert({
            photographer_id: photographer.id,
            type: 'email_sent',
            title_de: `E-Mail gesendet: ${email.subject}`,
            title_en: `Email sent: ${email.subject}`,
            body_de: `Geplante E-Mail an ${email.to_email} wurde gesendet.`,
            body_en: `Scheduled email to ${email.to_email} was sent.`,
            project_id: email.project_id || null,
          })
        } catch { /* non-critical */ }
      }

      sent++
    } catch (e) {
      failed++
      const errMsg = `Email ${email.id}: ${e}`
      errors.push(errMsg)
      console.error(errMsg)

      // Mark as failed (non-critical)
      try {
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: String(e),
            updated_at: new Date().toISOString(),
          })
          .eq('id', email.id)
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({
    success: true,
    processed: (emails ?? []).length,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  })
}
