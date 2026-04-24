import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  await params

  const body = await request.json().catch(() => ({}))
  const { clientEmail, clientName, galleryUrl, password, galleryTitle, studioName, coverPhotoUrl, customMessage } = body as {
    clientEmail: string
    clientName?: string
    galleryUrl: string
    password?: string | null
    galleryTitle?: string
    studioName?: string
    coverPhotoUrl?: string
    customMessage?: string
  }

  if (!clientEmail || !galleryUrl) {
    return NextResponse.json({ error: 'Missing clientEmail or galleryUrl' }, { status: 400 })
  }

  const name = clientName || 'Kunde'
  const title = galleryTitle || 'Deine Galerie'
  const studio = studioName || 'Dein Fotograf'

  // Build cover image URL via Cloudflare Image Resizing for email-safe dimensions
  const heroBlock = coverPhotoUrl
    ? (() => {
        const cfUrl = coverPhotoUrl.startsWith('https://photos.')
          ? coverPhotoUrl.replace(
              'https://photos.fotonizer.com/',
              'https://photos.fotonizer.com/cdn-cgi/image/width=600,height=280,quality=80,format=jpeg,fit=cover/',
            )
          : coverPhotoUrl
        return `
      <div style="width: 100%; height: 280px; overflow: hidden; border-radius: 0;">
        <img src="${cfUrl}" alt="${title}" width="600" height="280"
          style="width: 100%; height: 280px; object-fit: cover; display: block; border: 0;" />
      </div>`
      })()
    : ''

  const passwordBlock = password
    ? `
      <div style="margin-top: 24px; padding: 18px 22px; background: #F8F7F4; border-radius: 14px; border: 1px solid #E8E4DC;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9A9590;">🔒 Passwort</p>
        <p style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.2em; color: #1A1A18; font-family: 'Courier New', monospace;">${password}</p>
      </div>`
    : ''

  // If user wrote a custom message, use it as-is (they already wrote their own greeting).
  // If not, generate a default greeting+message.
  const messageHtml = customMessage
    ? customMessage.replace(/\n/g, '<br>')
    : `Hallo ${name},<br><br>Deine Galerie ist fertig! Klicke auf den Button unten, um deine Fotos anzusehen.`

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #EFECEA; margin: 0; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto;">

    <!-- Card -->
    <div style="background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.10);">

      <!-- Cover photo hero -->
      ${heroBlock}

      <!-- Body -->
      <div style="padding: 36px 40px 32px;">

        <!-- Studio badge -->
        <p style="margin: 0 0 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #C4A47C;">${studio}</p>

        <!-- Title -->
        <h1 style="margin: 0 0 6px; font-size: 26px; font-weight: 800; color: #1A1A18; letter-spacing: -0.03em; line-height: 1.2;">${title}</h1>

        <!-- Message -->
        <p style="margin: 16px 0 28px; font-size: 15px; color: #5A5650; line-height: 1.7;">${messageHtml}</p>

        <!-- CTA -->
        <a href="${galleryUrl}"
          style="display: inline-block; background: #1A1A18; color: #ffffff; text-decoration: none; padding: 15px 32px; border-radius: 14px; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">
          Galerie öffnen &rarr;
        </a>

        <!-- Password -->
        ${passwordBlock}

        <!-- URL fallback -->
        <div style="margin-top: 28px; padding-top: 22px; border-top: 1px solid #F0EDE8;">
          <p style="margin: 0 0 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #B0ACA6;">Link</p>
          <a href="${galleryUrl}" style="font-size: 12px; color: #C4A47C; word-break: break-all; text-decoration: none;">${galleryUrl}</a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #B0ACA6; font-size: 11px; margin-top: 20px; line-height: 1.5;">
      Diese E-Mail wurde von <strong>${studio}</strong> über Fotonizer gesendet.
    </p>
  </div>
</body>
</html>
  `.trim()

  try {
    await resend.emails.send({
      from: `${studio} <noreply@fotonizer.com>`,
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
