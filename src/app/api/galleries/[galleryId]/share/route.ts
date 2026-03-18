import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/galleries/[galleryId]/share
// Sends the gallery link + password to the client via email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  await params // galleryId not needed for sending, but required by Next.js route

  const body = await request.json().catch(() => ({}))
  const { clientEmail, clientName, galleryUrl, password, galleryTitle, studioName } = body as {
    clientEmail: string
    clientName?: string
    galleryUrl: string
    password?: string | null
    galleryTitle?: string
    studioName?: string
  }

  if (!clientEmail || !galleryUrl) {
    return NextResponse.json({ error: 'Missing clientEmail or galleryUrl' }, { status: 400 })
  }

  const name = clientName || 'Kunde'
  const title = galleryTitle || 'Deine Galerie'
  const studio = studioName || 'Dein Fotograf'

  const passwordBlock = password
    ? `
      <div style="margin-top: 20px; padding: 16px 20px; background: #F8F7F4; border-radius: 12px; border: 1px solid #E8E4DC;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9A9590;">🔒 Passwort</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.15em; color: #1A1A18; font-family: monospace;">${password}</p>
      </div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: #1A1A18; padding: 28px 36px;">
      <p style="color: #C4A47C; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0;">${studio}</p>
    </div>

    <!-- Body -->
    <div style="padding: 36px;">
      <h1 style="font-size: 24px; font-weight: 800; color: #1A1A18; margin: 0 0 8px; letter-spacing: -0.03em;">📸 ${title}</h1>
      <p style="font-size: 15px; color: #5A5650; margin: 0 0 24px; line-height: 1.6;">
        Hallo ${name},<br><br>
        deine Galerie ist bereit! Klicke auf den Button unten, um deine Fotos anzusehen.
      </p>

      <!-- CTA Button -->
      <a href="${galleryUrl}"
        style="display: inline-block; background: #1A1A18; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">
        Galerie öffnen →
      </a>

      <!-- Password block (if any) -->
      ${passwordBlock}

      <!-- URL fallback -->
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #F0EDE8;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9A9590;">Link</p>
        <a href="${galleryUrl}" style="font-size: 12px; color: #C4A47C; word-break: break-all;">${galleryUrl}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 36px 24px; border-top: 1px solid #F0EDE8;">
      <p style="color: #B0ACA6; font-size: 12px; margin: 0; line-height: 1.5;">
        Diese E-Mail wurde von ${studio} über Frameflow gesendet.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    await resend.emails.send({
      from: 'Frameflow <noreply@fotonizer.com>',
      to: clientEmail,
      subject: `📸 ${title} — deine Fotos sind bereit!`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Gallery share email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
