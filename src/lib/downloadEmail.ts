/**
 * Sends the "your download is ready" email to the client.
 * Called by both the worker (new jobs) and /prepare (reused ready jobs).
 */

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

interface GalleryInfo {
  title: string | null
  project: {
    photographer: {
      studio_name: string | null
      full_name: string | null
      email: string | null
      website: string | null
    } | null
  } | null
}

export async function sendDownloadReadyEmail(
  galleryId: string,
  email: string,
  downloadToken: string,
  partCount: number,
) {
  const service = createServiceClient()

  // Load gallery + photographer info for branding
  const { data: gallery } = await service
    .from('galleries')
    .select(`
      title,
      project:projects(
        photographer:photographers(studio_name, full_name, email, website)
      )
    `)
    .eq('id', galleryId)
    .single() as { data: GalleryInfo | null }

  const project = Array.isArray(gallery?.project) ? gallery?.project[0] : gallery?.project
  const photographerRaw = project?.photographer
  const photographer = Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw

  const studioName = photographer?.studio_name || photographer?.full_name || 'Ihr Fotograf'
  const photographerName = photographer?.full_name || photographer?.studio_name || 'Ihr Fotograf'
  const replyEmail = photographer?.email || undefined
  const galleryTitle = gallery?.title || 'Ihre Galerie'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fotonizer.com'
  const downloadUrl = `${appUrl}/download/${downloadToken}`

  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const partNote = partCount > 1
    ? `<p style="margin:0 0 16px;font-size:13px;color:#7A7670;line-height:1.6;">Deine Fotos wurden in <strong style="color:#111110;">${partCount} ZIP-Dateien</strong> aufgeteilt. Du kannst alle Teile auf der Download-Seite herunterladen.</p>`
    : ''

  console.log(`[downloadEmail] sending to=${email} gallery=${galleryId} token=${downloadToken.slice(0, 8)}...`)
  console.log(`[downloadEmail] from="${studioName}" replyTo=${replyEmail ?? 'none'} partCount=${partCount}`)

  const sendParams: Parameters<typeof resend.emails.send>[0] = {
    from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
    to: email,
    subject: `${photographerName}: Deine Fotos sind bereit`,
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;border:1px solid #E8E4DC;overflow:hidden;">

          <!-- Top accent bar -->
          <tr><td style="height:3px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);"></td></tr>

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#111110;letter-spacing:-0.03em;">${studioName}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#7A7670;">Download steht bereit</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#7A7670;line-height:1.6;">
                Deine Fotos aus <strong style="color:#111110;">${galleryTitle}</strong> stehen jetzt zum Download bereit. Klicke unten, um sie herunterzuladen.
              </p>

              ${partNote}

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}"
                       style="display:inline-block;background:#111110;color:#F8F7F4;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:-0.01em;">
                      Fotos herunterladen →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#7A7670;line-height:1.6;">
                      ⏱ <strong style="color:#111110;">Gültig bis ${expiryDate}</strong> — Der Link läuft nach 7 Tagen ab. Bitte lade deine Fotos rechtzeitig herunter.
                    </p>
                    <p style="margin:0;font-size:12px;color:#7A7670;line-height:1.6;">
                      💬 Bei Fragen antworte einfach auf diese E-Mail.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#B0ACA6;line-height:1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
                <a href="${downloadUrl}" style="color:#C4A47C;word-break:break-all;">${downloadUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px 28px;">
              <p style="margin:0 0 6px;font-size:12px;color:#B0ACA6;">
                Diese E-Mail wurde von <strong>${studioName}</strong> über Fotonizer verschickt.
              </p>
              <p style="margin:0;font-size:12px;color:#B0ACA6;">
                © ${new Date().getFullYear()} Fotonizer · Studio management for photographers
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
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
