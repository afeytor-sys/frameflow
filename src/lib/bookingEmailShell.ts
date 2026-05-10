export function bookingEmailShell(opts: {
  studioName: string
  heading: string
  subheading: string
  body: string
  ctaUrl: string
  ctaLabel: string
  infoRows: Array<{ label: string; value: string }>
  extraBlock?: string
  footerLine: string
}): string {
  const infoRowsHtml = opts.infoRows.map(r => `
    <tr>
      <td style="padding-bottom:16px;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#C0B8AE;">${r.label}</p>
        <p style="margin:5px 0 0;font-size:14px;font-weight:600;color:#1C1C1A;">${r.value}</p>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 0; background: #F7F5F2; }
    @media only screen and (max-width: 640px) {
      .outer-pad { padding: 24px 12px 48px !important; }
      .card-pad  { padding: 40px 28px 36px !important; }
      .heading   { font-size: 30px !important; line-height: 1.1 !important; }
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
              <p style="margin:0;font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C0B8AE;">${opts.studioName}</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 32px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.04);">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="card-pad" style="padding:52px 52px 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <!-- Heading -->
                      <tr>
                        <td>
                          <h1 class="heading" style="margin:0;font-size:38px;font-weight:800;color:#1C1C1A;letter-spacing:-0.04em;line-height:1.08;">${opts.heading}</h1>
                        </td>
                      </tr>

                      <!-- Subheading -->
                      <tr>
                        <td style="padding-top:22px;">
                          <p style="margin:0;font-size:15px;font-weight:500;color:#7A7468;line-height:1.75;">${opts.subheading}</p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding-top:10px;">
                          <p style="margin:0;font-size:15px;color:#9A9188;line-height:1.75;">${opts.body}</p>
                        </td>
                      </tr>

                      <!-- CTA -->
                      <tr>
                        <td style="padding-top:36px;">
                          <table cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="border-radius:100px;background:#C4A47C;box-shadow:0 6px 20px rgba(196,164,124,0.38);">
                                <a href="${opts.ctaUrl}" style="display:inline-block;padding:18px 52px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;line-height:1;white-space:nowrap;">
                                  ${opts.ctaLabel} &nbsp;→
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      ${opts.extraBlock ? `<tr><td style="padding-top:24px;">${opts.extraBlock}</td></tr>` : ''}

                      <!-- Divider -->
                      <tr>
                        <td style="padding:40px 0 0;">
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
                                  ${infoRowsHtml}
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
              <p style="margin:0;font-size:11px;color:#BDB5AA;line-height:1.7;">${opts.footerLine}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body></html>`
}
