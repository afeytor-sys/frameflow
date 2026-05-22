import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const service = createServiceClient()

  // Generate recovery link via admin API (server-side only, uses service role)
  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
  })

  if (error || !data?.properties?.hashed_token) {
    // Return success regardless to avoid email enumeration
    return NextResponse.json({ ok: true })
  }

  // Build token_hash URL — device-independent, works on any browser
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
  const resetUrl = `${appUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=recovery`

  const html = `<!DOCTYPE html>
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
      .heading   { font-size: 28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F7F5F2;-webkit-text-size-adjust:100%;color-scheme:light;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F7F5F2;">
    <tr>
      <td align="center" class="outer-pad" style="padding:52px 20px 64px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 2px 18px;">
              <p style="margin:0;font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C0B8AE;">Fotonizer</p>
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
                          <h1 class="heading" style="margin:0;font-size:36px;font-weight:800;color:#1C1C1A;letter-spacing:-0.04em;line-height:1.1;">Passwort<br>zurücksetzen.</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding-top:22px;">
                          <p style="margin:0;font-size:15px;color:#7A7468;line-height:1.75;">Klicke auf den Button unten, um ein neues Passwort für dein Fotonizer-Konto zu vergeben. Der Link ist 1 Stunde gültig.</p>
                        </td>
                      </tr>

                      <!-- CTA -->
                      <tr>
                        <td style="padding-top:36px;">
                          <table cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="border-radius:100px;background:#C4A47C;box-shadow:0 6px 20px rgba(196,164,124,0.38);">
                                <a href="${resetUrl}" style="display:inline-block;padding:18px 52px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;line-height:1;white-space:nowrap;">
                                  Neues Passwort vergeben &nbsp;→
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Fallback link -->
                      <tr>
                        <td style="padding-top:24px;">
                          <p style="margin:0;font-size:12px;color:#B0A898;line-height:1.6;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
                            <a href="${resetUrl}" style="color:#C4A47C;word-break:break-all;">${resetUrl}</a>
                          </p>
                        </td>
                      </tr>

                      <!-- Divider -->
                      <tr>
                        <td style="padding-top:40px;">
                          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                            <tr><td style="height:1px;background:#EDE9E3;"></td></tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Note -->
                      <tr>
                        <td style="padding-top:24px;">
                          <p style="margin:0;font-size:13px;color:#C0B8AE;line-height:1.65;">Falls du kein Passwort-Reset angefordert hast, kannst du diese E-Mail ignorieren. Dein Konto ist sicher.</p>
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
              <p style="margin:0;font-size:11px;color:#BDB5AA;line-height:1.7;">Fotonizer · fotonizer.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: 'Fotonizer <noreply@fotonizer.com>',
    to: email.trim().toLowerCase(),
    subject: 'Passwort zurücksetzen — Fotonizer',
    html,
  })

  return NextResponse.json({ ok: true })
}
