import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Validate body ───────────────────────────────────────────────────────
    const body = await req.json()
    const { conversationId, content } = body

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const trimmedContent = content.trim()
    const service = createServiceClient()

    // ── Security: verify conversation belongs to this photographer ──────────
    const { data: conversation, error: convError } = await service
      .from('conversations')
      .select('id, photographer_id, lead_email, lead_name')
      .eq('id', conversationId)
      .eq('photographer_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // ── Insert message ──────────────────────────────────────────────────────
    const { data: message, error: msgError } = await service
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'photographer',
        content: trimmedContent,
      })
      .select('id, sender, content, created_at, opened_at, open_count')
      .single()

    if (msgError || !message) {
      console.error('[inbox/reply] Insert error:', msgError?.message)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // ── Send email to client (non-blocking) ─────────────────────────────────
    let emailSent = true
    try {
      // Get photographer email
      const { data: photographer } = await service
        .from('photographers')
        .select('email, notification_email, full_name, studio_name')
        .eq('id', user.id)
        .single()

      // Get original lead message for context
      const { data: originalMessages } = await service
        .from('messages')
        .select('content, sender')
        .eq('conversation_id', conversationId)
        .eq('sender', 'lead')
        .order('created_at', { ascending: true })
        .limit(1)

      const originalMessage = originalMessages?.[0]?.content ?? null
      const photographerEmail = photographer?.notification_email || photographer?.email || null
      const senderName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.fotonizer.com'

      const resendKey = process.env.RESEND_API_KEY
      if (resendKey && photographerEmail) {
        const resend = new Resend(resendKey)

        const escapedContent = trimmedContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />')

        const escapedOriginal = originalMessage
          ? originalMessage
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br />')
          : null

        const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Re: your inquiry</title>
  <style>:root { color-scheme: light; } body { color-scheme: light; }</style>
</head>
<body style="margin:0;padding:0;background:#F2F1EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color-scheme:light;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F1EE;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E0DC;">

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:14px;color:#3A3A38;line-height:1.6;">
                Hallo ${conversation.lead_name},<br />
                du hast eine neue Antwort auf deine Anfrage erhalten.
              </p>

              <!-- Reply content — plain, like a normal email -->
              <div style="font-size:15px;color:#1A1A18;line-height:1.75;white-space:pre-wrap;">${escapedContent}</div>
            </td>
          </tr>

          ${escapedOriginal ? `
          <!-- Original message -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #D8D5D0;">
                <tr>
                  <td style="padding:10px 16px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9A9590;text-transform:uppercase;letter-spacing:0.07em;">Deine ursprüngliche Nachricht</p>
                    <p style="margin:0;font-size:13px;color:#6B6860;line-height:1.6;">${escapedOriginal}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px;border-top:1px solid #EDECE8;">
              <p style="margin:0;font-size:12px;color:#9A9590;">
                Antworte einfach auf diese E-Mail — deine Nachricht geht direkt an ${senderName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

        // Inject tracking pixel so photographer knows when client opens the email
        const htmlWithPixel = html +
          `\n<img src="${appUrl}/track/open/msg/${message.id}" width="1" height="1" style="display:none" alt="" />`

        const { error: emailError } = await resend.emails.send({
          from: `${senderName} <info@fotonizer.com>`,
          to: conversation.lead_email,
          replyTo: photographerEmail ?? undefined,
          bcc: photographerEmail ?? undefined,
          subject: 'Re: your inquiry',
          html: htmlWithPixel,
        })

        if (emailError) {
          console.error('[inbox/reply] Resend error:', emailError)
          emailSent = false
        }
      }
    } catch (emailErr) {
      console.error('[inbox/reply] Email send failed:', emailErr)
      emailSent = false
    }

    return NextResponse.json({
      message,
      emailSent,
    }, { status: 201 })

  } catch (err) {
    console.error('[inbox/reply] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
