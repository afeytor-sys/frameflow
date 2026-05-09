/**
 * Sends the "your download is ready" email to the client.
 * Called by both the CF Worker (new jobs) and /prepare (reused ready jobs).
 */

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

const CF_DOMAIN = 'https://photos.fotonizer.com'

function buildCoverUrl(storageUrl: string): string {
  if (!storageUrl) return ''
  try {
    let path = ''
    if (storageUrl.includes('photos.fotonizer.com')) {
      const stripped = storageUrl.replace(/\/cdn-cgi\/image\/[^/]+/, '')
      path = new URL(stripped).pathname
    } else if (storageUrl.includes('.r2.dev')) {
      path = new URL(storageUrl).pathname
    } else {
      return storageUrl
    }
    return `${CF_DOMAIN}/cdn-cgi/image/width=1240,quality=85,format=auto,fit=cover${path}`
  } catch {
    return storageUrl
  }
}

export async function sendDownloadReadyEmail(
  galleryId: string,
  email: string,
  downloadToken: string,
  partCount: number,
) {
  const service = createServiceClient()

  const { data: raw } = await service
    .from('galleries')
    .select(`
      title,
      cover_photo_id,
      project:projects(
        portal_locale,
        photographer:photographers(studio_name, full_name, email, locale)
      )
    `)
    .eq('id', galleryId)
    .single()

  const gallery = raw as {
    title: string | null
    cover_photo_id: string | null
    project: {
      portal_locale: string | null
      photographer: { studio_name: string | null; full_name: string | null; email: string | null; locale: string | null } | null
    } | null
  } | null

  const project       = Array.isArray(gallery?.project) ? gallery?.project[0] : gallery?.project
  const photographerRaw = project?.photographer
  const photographer  = Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw

  const effectiveLocale = project?.portal_locale || photographer?.locale || 'de'
  const locale          = effectiveLocale === 'en' ? 'en' : 'de'
  const studioName      = photographer?.studio_name || photographer?.full_name || (locale === 'en' ? 'Your Photographer' : 'Dein Fotograf')
  const replyEmail      = photographer?.email || undefined
  const galleryTitle    = gallery?.title || ''

  // Fetch cover photo URL
  let coverImageUrl = ''
  if (gallery?.cover_photo_id) {
    const { data: coverPhoto } = await service
      .from('photos')
      .select('storage_url')
      .eq('id', gallery.cover_photo_id)
      .single()
    if (coverPhoto?.storage_url) {
      coverImageUrl = buildCoverUrl(coverPhoto.storage_url as string)
    }
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fotonizer.com'
  const downloadUrl = `${appUrl}/download/${downloadToken}`
  const expiryDate  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const t = locale === 'en' ? {
    subject:       'Your photos are ready ✨',
    preheader:     'Your memories are ready to be relived.',
    heading:       'Your photos<br>are ready.',
    subheading:    'Beautifully edited and carefully selected — just for you.',
    body:          'We hope every image brings you as much joy as it brought us to create it.',
    cta:           'Open Gallery',
    galleryLabel:  'Gallery',
    validLabel:    'Link valid until',
    partsNote:     partCount > 1 ? `Your photos are split into <strong style="color:#1C1C1A;">${partCount} parts</strong> — download all of them on the gallery page.` : '',
    footerLine:    `Delivered by ${studioName}`,
    fallbackText:  "If the button doesn't work, copy this link:",
  } : {
    subject:       'Deine Fotos sind fertig ✨',
    preheader:     'Deine Erinnerungen warten auf dich.',
    heading:       'Deine Fotos<br>sind fertig.',
    subheading:    'Mit viel Liebe bearbeitet und sorgfältig ausgewählt — nur für dich.',
    body:          'Wir wünschen dir ganz viel Freude beim Anschauen deiner Galerie.',
    cta:           'Galerie öffnen',
    galleryLabel:  'Galerie',
    validLabel:    'Link gültig bis',
    partsNote:     partCount > 1 ? `Deine Fotos wurden in <strong style="color:#1C1C1A;">${partCount} Teile</strong> aufgeteilt — du kannst alle auf der Download-Seite herunterladen.` : '',
    footerLine:    `Bereitgestellt von ${studioName}`,
    fallbackText:  'Falls der Button nicht funktioniert, kopiere diesen Link:',
  }

  // Cover image block — full-width cinematic image, or warm gradient fallback
  const heroBlock = coverImageUrl
    ? `<tr>
        <td style="padding:0;line-height:0;font-size:0;">
          <!--[if mso]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:620px;height:360px;">
            <v:fill type="frame" src="${coverImageUrl}" color="#E8E4DC"/>
            <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0"><![endif]-->
          <img src="${coverImageUrl}" width="620" alt="${galleryTitle}"
               style="display:block;width:100%;max-width:620px;height:auto;min-height:280px;object-fit:cover;border:0;line-height:0;" />
          <!--[if mso]></v:textbox></v:rect><![endif]-->
        </td>
      </tr>`
    : `<tr>
        <td style="padding:0;height:260px;background:linear-gradient(135deg,#EDE9E0 0%,#D8CFBF 55%,#C4B49A 100%);line-height:0;font-size:0;">
          <table width="100%" height="260" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" valign="middle">
                <p style="margin:0;font-size:40px;opacity:0.45;line-height:1;">✦</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`

  const galleryNameBlock = galleryTitle
    ? `<p style="margin:14px 0 0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#B5ADA3;">${galleryTitle}</p>`
    : ''

  const partsBlock = t.partsNote
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
        <tr>
          <td style="background:#F5F2EE;border-radius:12px;padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#7A7468;line-height:1.6;">${t.partsNote}</p>
          </td>
        </tr>
      </table>`
    : ''

  console.log(`[downloadEmail] PREPARE to=${email} gallery=${galleryId} token=${downloadToken.slice(0, 8)}... locale=${locale} cover=${!!coverImageUrl}`)
  console.log(`[downloadEmail] from="${studioName}" replyTo=${replyEmail ?? 'none'} partCount=${partCount}`)

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${t.subject}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 0; background: #F7F5F2; }
    @media only screen and (max-width: 640px) {
      .outer-pad { padding: 24px 12px 48px !important; }
      .card-pad  { padding: 40px 28px 36px !important; }
      .heading   { font-size: 34px !important; line-height: 1.1 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F7F5F2;-webkit-text-size-adjust:100%;color-scheme:light;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F7F5F2;">
    <tr>
      <td align="center" class="outer-pad" style="padding:52px 20px 64px;">

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;">

          <!-- Studio label -->
          <tr>
            <td style="padding:0 2px 18px;">
              <p style="margin:0;font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C0B8AE;">${studioName}</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 32px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.04);">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                <!-- Hero image / gradient -->
                ${heroBlock}

                <!-- Body -->
                <tr>
                  <td class="card-pad" style="padding:52px 52px 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <!-- Heading -->
                      <tr>
                        <td>
                          <h1 class="heading" style="margin:0;font-size:42px;font-weight:800;color:#1C1C1A;letter-spacing:-0.04em;line-height:1.08;">${t.heading}</h1>
                          ${galleryNameBlock}
                        </td>
                      </tr>

                      <!-- Subheading -->
                      <tr>
                        <td style="padding-top:22px;">
                          <p style="margin:0;font-size:15px;font-weight:500;color:#7A7468;line-height:1.75;">${t.subheading}</p>
                        </td>
                      </tr>

                      <!-- Body text -->
                      <tr>
                        <td style="padding-top:10px;">
                          <p style="margin:0;font-size:15px;color:#9A9188;line-height:1.75;">${t.body}</p>
                        </td>
                      </tr>

                      <!-- CTA -->
                      <tr>
                        <td style="padding-top:40px;">
                          <table cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="border-radius:100px;background:#C4A47C;box-shadow:0 6px 20px rgba(196,164,124,0.38);">
                                <a href="${downloadUrl}"
                                   style="display:inline-block;padding:18px 52px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;line-height:1;white-space:nowrap;">
                                  ${t.cta} &nbsp;→
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Parts note -->
                      ${partsBlock ? `<tr><td>${partsBlock}</td></tr>` : ''}

                      <!-- Divider -->
                      <tr>
                        <td style="padding:44px 0 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                            <tr><td style="height:1px;background:#EDE9E3;"></td></tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Info card -->
                      <tr>
                        <td style="padding-top:28px;">
                          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FAF8F5;border-radius:14px;">
                            <tr>
                              <td style="padding:22px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                                  ${galleryTitle ? `<tr>
                                    <td style="padding-bottom:16px;">
                                      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#C0B8AE;">${t.galleryLabel}</p>
                                      <p style="margin:5px 0 0;font-size:14px;font-weight:600;color:#1C1C1A;">${galleryTitle}</p>
                                    </td>
                                  </tr>` : ''}
                                  <tr>
                                    <td>
                                      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#C0B8AE;">${t.validLabel}</p>
                                      <p style="margin:5px 0 0;font-size:14px;font-weight:600;color:#1C1C1A;">${expiryDate}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
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
            <td style="padding:24px 2px 0;">
              <p style="margin:0;font-size:11px;color:#BDB5AA;line-height:1.7;">${t.footerLine}</p>
              <p style="margin:6px 0 0;font-size:10.5px;color:#D0C9C0;line-height:1.5;">${t.fallbackText}</p>
              <p style="margin:4px 0 0;font-size:10.5px;line-height:1.5;word-break:break-all;">
                <a href="${downloadUrl}" style="color:#C4A47C;text-decoration:none;">${downloadUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`

  const sendParams: Parameters<typeof resend.emails.send>[0] = {
    from: `${studioName} <noreply@fotonizer.com>`,
    to: email,
    subject: t.subject,
    html,
  }

  if (replyEmail) sendParams.replyTo = replyEmail

  console.log(`[downloadEmail] calling resend.emails.send...`)
  const { data: resendData, error: resendError } = await resend.emails.send(sendParams)
  console.log(`[downloadEmail] EMAIL RESULT data=${JSON.stringify(resendData)} error=${JSON.stringify(resendError)}`)

  if (resendError) {
    console.error(`[downloadEmail] EMAIL ERROR:`, JSON.stringify(resendError))
    throw new Error(`Resend error: ${JSON.stringify(resendError)}`)
  }

  console.log(`[downloadEmail] sent OK — id=${resendData?.id}`)
}
