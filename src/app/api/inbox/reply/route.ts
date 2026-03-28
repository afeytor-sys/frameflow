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
      .select('id, sender, content, created_at')
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
        .select('email')
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
      const photographerEmail = photographer?.email ?? null
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Re: your inquiry</title>
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
              <p style="margin:0 0 6px;font-size:13px;color:#6B6B6B;">
                Hello ${conversation.lead_name},
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6B6B6B;">
                You have a new reply to your inquiry.
              </p>

              <!-- Reply card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:12px;margin-bottom:${escapedOriginal ? '24px' : '0'};">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.7;">${escapedContent}</p>
                  </td>
                </tr>
              </table>

              ${escapedOriginal ? `
              <!-- Original message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #E8E8E4;margin-top:0;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.06em;">
                      Your original message
                    </p>
                    <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.6;">${escapedOriginal}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #E8E8E4;">
              <p style="margin:0;font-size:12px;color:#9B9B9B;">
                To reply, simply respond to this email — your message will go directly to the photographer.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

        const { error: emailError } = await resend.emails.send({
          from: 'Fotonizer <info@fotonizer.com>',
          to: conversation.lead_email,
          replyTo: photographerEmail,
          subject: 'Re: your inquiry',
          html,
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
