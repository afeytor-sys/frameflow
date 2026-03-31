import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { sendPushToPhotographer } from '@/lib/webpush'

interface InquiryNotificationPayload {
  photographerId: string
  name: string
  email: string
  message: string
}

/**
 * Fire-and-forget: create in-app notification and/or send email
 * based on the photographer's automation_settings.
 * Defaults to both enabled if no settings row exists.
 */
export async function triggerInquiryNotifications(
  payload: InquiryNotificationPayload
): Promise<void> {
  const { photographerId, name, email, message } = payload
  const supabase = createServiceClient()

  // 1. Read notification settings — default both to true if anything fails
  let inAppEnabled = true
  let emailEnabled = true
  try {
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('notify_inapp_new_inquiry, notify_email_new_inquiry')
      .eq('photographer_id', photographerId)
      .maybeSingle()

    if (settings) {
      inAppEnabled = settings.notify_inapp_new_inquiry !== false
      emailEnabled = settings.notify_email_new_inquiry !== false
    }
  } catch {
    // table may not exist yet — keep defaults (both enabled)
  }

  // 2. In-app notification
  if (inAppEnabled) {
    try {
      const { error } = await supabase.from('notifications').insert({
        photographer_id: photographerId,
        type: 'new_inquiry',
        title_en: 'New inquiry',
        title_de: 'Neue Anfrage',
        body_en: `${name} sent you a new message`,
        body_de: `${name} hat dir eine neue Nachricht geschickt`,
      })
      if (error) console.error('[notifications] in-app insert error:', error.message)
    } catch (err) {
      console.error('[notifications] in-app unexpected error:', err)
    }
  }

  // 3. Web push notification
  try {
    await sendPushToPhotographer(photographerId, {
      title: 'Neue Anfrage / New inquiry',
      body: `${name}: ${message.slice(0, 80)}${message.length > 80 ? '…' : ''}`,
      url: '/dashboard/inbox',
    })
  } catch (err) {
    console.error('[notifications] push error:', err)
  }

  // 4. Email notification
  if (emailEnabled) {
    try {
      const { data: photographer } = await supabase
        .from('photographers')
        .select('email')
        .eq('id', photographerId)
        .single()

      if (photographer?.email) {
        await sendInquiryEmail({
          to: photographer.email,
          replyTo: email,
          name,
          email,
          message,
        })
      }
    } catch (err) {
      console.error('[notifications] email error:', err)
    }
  }
}

interface InquiryEmailPayload {
  to: string
  replyTo: string
  name: string
  email: string
  message: string
}

async function sendInquiryEmail(payload: InquiryEmailPayload): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[sendInquiryEmail] RESEND_API_KEY not set — skipping email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.fotonizer.com'
  const resend = new Resend(resendKey)
  const { to, replyTo, name, email, message } = payload

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New inquiry received</title>
</head>
<body style="margin:0;padding:0;background:#F5F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E8E8E4;">

          <!-- Header -->
          <tr>
            <td style="background:#1A1A1A;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.03em;">Fotonizer</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1A1A1A;letter-spacing:-0.02em;">
                New inquiry received 📩
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6B6B6B;">
                Someone submitted your inquiry form.
              </p>

              <!-- Inquiry details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.06em;">Name</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#1A1A1A;">${name}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.06em;">Email</p>
                          <p style="margin:0;font-size:15px;color:#1A1A1A;">
                            <a href="mailto:${email}" style="color:#C8A882;text-decoration:none;">${email}</a>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.06em;">Message</p>
                          <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:#1A1A1A;">
                    <a href="${appUrl}/dashboard/inbox"
                       style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:-0.01em;">
                      Open in Fotonizer →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #E8E8E4;">
              <p style="margin:0;font-size:12px;color:#9B9B9B;">
                You're receiving this because you have email notifications enabled in your Fotonizer settings.
                <a href="${appUrl}/dashboard/settings" style="color:#C8A882;text-decoration:none;">Manage notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const { error } = await resend.emails.send({
    from: 'Fotonizer <info@fotonizer.com>',
    to: payload.to,
    replyTo: payload.replyTo,
    subject: 'New inquiry received 📩',
    html,
  })

  if (error) {
    console.error('[sendInquiryEmail] Resend error:', error)
  }
}
