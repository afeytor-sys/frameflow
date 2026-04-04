/**
 * Sends the "your download is ready" email to the client.
 * Called by both the worker (new jobs) and /prepare (reused ready jobs).
 */

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)


export async function sendDownloadReadyEmail(
  galleryId: string,
  email: string,
  downloadToken: string,
  partCount: number,
) {
  const service = createServiceClient()

  // Identical nested pattern to src/app/download/[token]/page.tsx — confirmed working
  const { data: raw } = await service
    .from('galleries')
    .select(`
      title,
      project:projects(
        photographer:photographers(studio_name, full_name, email)
      )
    `)
    .eq('id', galleryId)
    .single()

  const gallery = raw as {
    title: string | null
    project: { photographer: { studio_name: string | null; full_name: string | null; email: string | null } | null } | null
  } | null

  const project      = Array.isArray(gallery?.project) ? gallery?.project[0] : gallery?.project
  const photographerRaw = project?.photographer
  const photographer = Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw

  const studioName      = photographer?.studio_name || photographer?.full_name || 'Ihr Fotograf'
  const photographerName = photographer?.full_name || photographer?.studio_name || 'Ihr Fotograf'
  const replyEmail      = photographer?.email || undefined
  const galleryTitle    = gallery?.title || 'deine Galerie'
  const galleryName     = galleryTitle

  console.log(`[downloadEmail] studioName="${studioName}" gallery="${galleryName}" photographer=${JSON.stringify(photographer)}`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fotonizer.com'
  const downloadUrl = `${appUrl}/download/${downloadToken}`

  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const partNote = partCount > 1
    ? `<p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.7;">Deine Fotos wurden in <strong style="color:#111;">${partCount} Teile</strong> aufgeteilt — du kannst alle auf der Download-Seite herunterladen.</p>`
    : ''

  // Gallery line shown below title if we have a real name
  const hasRealGalleryName = gallery?.title && gallery.title.trim().length > 0
  const galleryLine = hasRealGalleryName
    ? `<p style="margin:6px 0 0;font-size:13px;color:#aaa;letter-spacing:0.01em;">Galerie: ${galleryName}</p>`
    : ''

  console.log(`[downloadEmail] sending to=${email} gallery=${galleryId} token=${downloadToken.slice(0, 8)}...`)
  console.log(`[downloadEmail] from="${studioName}" replyTo=${replyEmail ?? 'none'} partCount=${partCount}`)

  const sendParams: Parameters<typeof resend.emails.send>[0] = {
    from: `${studioName} <noreply@fotonizer.com>`,
    to: email,
    subject: `Deine Fotos sind fertig ✨`,
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:48px 16px 64px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">

          <!-- Top bar — thin accent -->
          <tr><td style="height:4px;background:#111;"></td></tr>

          <!-- Photographer name — subtle top label -->
          <tr>
            <td style="padding:32px 48px 0;">
              <p style="margin:0;font-size:12px;color:#bbb;letter-spacing:0.08em;text-transform:uppercase;">${studioName}</p>
            </td>
          </tr>

          <!-- Main title -->
          <tr>
            <td style="padding:16px 48px 0;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#111;letter-spacing:-0.02em;line-height:1.2;">Deine Fotos<br>sind fertig ✨</h1>
              ${galleryLine}
            </td>
          </tr>

          <!-- Body text -->
          <tr>
            <td style="padding:28px 48px 0;">
              <p style="margin:0;font-size:16px;color:#555;line-height:1.75;">
                Deine Fotos stehen jetzt für dich bereit.<br>
                Ich wünsche dir ganz viel Freude beim Anschauen ✨
              </p>
            </td>
          </tr>

          ${partNote ? `<tr><td style="padding:20px 48px 0;">${partNote}</td></tr>` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding:36px 48px 0;">
              <a href="${downloadUrl}"
                 style="display:inline-block;background:#111;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:15px 40px;border-radius:999px;letter-spacing:-0.01em;">
                Fotos ansehen
              </a>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding:24px 48px 0;">
              <p style="margin:0;font-size:13px;color:#bbb;line-height:1.6;">
                Der Link ist gültig bis <strong style="color:#888;">${expiryDate}</strong>.<br>
                Bei Fragen antworte einfach auf diese E-Mail.
              </p>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:16px 48px 0;">
              <p style="margin:0;font-size:11px;color:#ccc;line-height:1.6;word-break:break-all;">
                <a href="${downloadUrl}" style="color:#ccc;">${downloadUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:40px 48px 36px;">
              <p style="margin:0;font-size:11px;color:#ccc;">
                Bereitgestellt von deinem Fotografen
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }

  // Only add replyTo if we actually have an address — passing undefined breaks Resend
  if (replyEmail) sendParams.replyTo = replyEmail

  const { data: resendData, error: resendError } = await resend.emails.send(sendParams)

  if (resendError) {
    console.error(`[downloadEmail] Resend API error:`, JSON.stringify(resendError))
    throw new Error(`Resend error: ${JSON.stringify(resendError)}`)
  }

  console.log(`[downloadEmail] sent OK — id=${resendData?.id}`)
}
