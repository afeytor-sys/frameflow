import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const {
      toEmail,
      toName,
      subject,
      body,
      projectId,
      scheduledAt, // ISO string — if provided, schedule; otherwise send now
    } = await request.json()

    if (!toEmail || !subject || !body) {
      return NextResponse.json({ error: 'toEmail, subject and body are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch photographer info for sender name + notification email
    const { data: photographer } = await supabase
      .from('photographers')
      .select('full_name, studio_name, email, notification_email')
      .eq('id', user.id)
      .single()

    const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
    // Use notification_email for BCC/replyTo, fallback to account email
    const notifEmail = photographer?.notification_email || photographer?.email || undefined

    const now = new Date()
    const sendAt = scheduledAt ? new Date(scheduledAt) : null
    const isScheduled = sendAt && sendAt > now

    // Convert plain text body to HTML (preserve line breaks)
    const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;border:1px solid #E8E4DC;overflow:hidden;">
          <tr><td style="height:3px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);"></td></tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#111110;letter-spacing:-0.03em;">${studioName}</p>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>
          <tr>
            <td style="padding:28px 40px;">
              <div style="font-size:15px;color:#3A3835;line-height:1.7;white-space:pre-wrap;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>
          <tr>
            <td align="center" style="padding:20px 40px 28px;">
              <p style="margin:0;font-size:12px;color:#B0ACA6;">
                Sent by <strong>${studioName}</strong> via Fotonizer · © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    if (isScheduled) {
      // Just save to DB — cron will send it
      const { data, error } = await supabase
        .from('scheduled_emails')
        .insert({
          photographer_id: user.id,
          project_id: projectId || null,
          to_email: toEmail,
          to_name: toName || null,
          subject,
          html_body: htmlBody,
          plain_body: body,
          type: 'custom',
          scheduled_at: sendAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('DB insert error:', error)
        return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
      }

      return NextResponse.json({ success: true, scheduled: true, email: data })
    }

    // Send immediately via Resend
    const { error: resendError } = await resend.emails.send({
      from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
      replyTo: notifEmail,
      bcc: notifEmail,
      to: toEmail,
      subject,
      html: htmlBody,
    })

    if (resendError) {
      console.error('Resend error:', resendError)
      // Still save to DB as failed
      await supabase.from('scheduled_emails').insert({
        photographer_id: user.id,
        project_id: projectId || null,
        to_email: toEmail,
        to_name: toName || null,
        subject,
        html_body: htmlBody,
        plain_body: body,
        type: 'custom',
        scheduled_at: now.toISOString(),
        sent_at: now.toISOString(),
        status: 'failed',
        error_message: resendError.message,
      })
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Save to DB as sent
    const { data } = await supabase
      .from('scheduled_emails')
      .insert({
        photographer_id: user.id,
        project_id: projectId || null,
        to_email: toEmail,
        to_name: toName || null,
        subject,
        html_body: htmlBody,
        plain_body: body,
        type: 'custom',
        scheduled_at: now.toISOString(),
        sent_at: now.toISOString(),
        status: 'sent',
      })
      .select()
      .single()

    return NextResponse.json({ success: true, scheduled: false, email: data })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
