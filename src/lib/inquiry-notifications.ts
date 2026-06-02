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
        .select('email, full_name, studio_name')
        .eq('id', photographerId)
        .single()

      if (photographer?.email) {
        await sendInquiryEmail({
          to: photographer.email,
          replyTo: email,
          name,
          email,
          message,
          senderName: photographer.studio_name || photographer.full_name || 'Fotonizer',
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
  senderName: string
}

function parseFormFields(message: string): Array<{ label: string; value: string }> | null {
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const pairs: Array<{ label: string; value: string }> = []
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      const label = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (label && value) pairs.push({ label, value })
    } else {
      return null
    }
  }
  return pairs.length >= 2 ? pairs : null
}

function buildFieldsHtml(name: string, email: string, message: string): string {
  const fields = parseFormFields(message)

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const contactRow = `
    <tr>
      <td style="padding:0 0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-right:12px;vertical-align:top;">
              <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.07em;">Name</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1A1A1A;">${esc(name)}</p>
            </td>
            <td width="50%" style="vertical-align:top;">
              <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.07em;">E-Mail</p>
              <p style="margin:0;font-size:15px;color:#1A1A1A;">
                <a href="mailto:${esc(email)}" style="color:#C4A47C;text-decoration:none;font-weight:500;">${esc(email)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  if (fields) {
    // Format date values (YYYY-MM-DD → German format)
    const formatVal = (v: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        try {
          return new Date(v + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
        } catch { return esc(v) }
      }
      return esc(v)
    }

    const fieldRows = fields.map(({ label, value }, i) => {
      const isLast = i === fields.length - 1
      const isLong = value.length > 60
      return `
    <tr>
      <td style="padding:14px 0;border-top:1px solid #F0EFEC;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.07em;">${esc(label)}</p>
        <p style="margin:0;font-size:${isLong ? '13px' : '14px'};color:#1A1A1A;line-height:1.55;${isLast ? '' : ''}">${formatVal(value)}</p>
      </td>
    </tr>`
    }).join('')

    return `<table width="100%" cellpadding="0" cellspacing="0">${contactRow}${fieldRows}</table>`
  }

  // Fallback: plain message
  return `
  <table width="100%" cellpadding="0" cellspacing="0">
    ${contactRow}
    <tr>
      <td style="padding:14px 0;border-top:1px solid #F0EFEC;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.07em;">Nachricht</p>
        <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>
      </td>
    </tr>
  </table>`
}

async function sendInquiryEmail(payload: InquiryEmailPayload): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[sendInquiryEmail] RESEND_API_KEY not set — skipping email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.fotonizer.com'
  const resend = new Resend(resendKey)
  const { to, replyTo, name, email, message, senderName } = payload
  const fieldsHtml = buildFieldsHtml(name, email, message)

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Neue Anfrage erhalten</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 0; background: #F5F4F1; }
  </style>
</head>
<body style="margin:0;padding:0;background:#F5F4F1;-webkit-text-size-adjust:100%;color-scheme:light;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F5F4F1;padding:48px 16px 64px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

          <!-- Brand line -->
          <tr>
            <td style="padding:0 4px 20px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#9B9B9B;letter-spacing:0.04em;text-transform:uppercase;">Fotonizer</p>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;border:1px solid #E8E6E1;overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#C4A47C 0%,#D4B48C 100%);"></td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:36px 40px 32px;">

                    <!-- Heading -->
                    <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111111;letter-spacing:-0.03em;line-height:1.2;">
                      Neue Anfrage 📩
                    </p>
                    <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.5;">
                      Jemand hat dein Anfrageformular ausgefüllt — antworte so schnell wie möglich.
                    </p>

                    <!-- Fields -->
                    ${fieldsHtml}

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:32px 0 28px;">
                      <tr><td style="height:1px;background:#F0EFEC;"></td></tr>
                    </table>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="border-radius:12px;background:#C4A47C;">
                          <a href="${appUrl}/dashboard/inbox"
                             style="display:inline-block;padding:15px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:-0.01em;line-height:1;">
                            Im Posteingang öffnen →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 4px 0;">
              <p style="margin:0;font-size:12px;color:#AAAAAA;line-height:1.6;">
                Du erhältst diese E-Mail, weil du E-Mail-Benachrichtigungen in deinen
                <a href="${appUrl}/dashboard/settings" style="color:#C4A47C;text-decoration:none;">Fotonizer-Einstellungen</a> aktiviert hast.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  const { error } = await resend.emails.send({
    from: `${senderName} <info@fotonizer.com>`,
    to: payload.to,
    replyTo: payload.replyTo,
    subject: `Neue Anfrage von ${name} · ${dateStr} ${timeStr}`,
    html,
    headers: {
      'X-Entity-Ref-ID': `inquiry-${Date.now()}`,
    },
  })

  if (error) {
    console.error('[sendInquiryEmail] Resend error:', error)
  }
}
