import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
  }

  const service = createServiceClient()

  // generateLink type 'signup' creates the user AND returns a confirmation link.
  // It does NOT trigger Supabase's built-in email — we send our own via Resend.
  const { data, error } = await service.auth.admin.generateLink({
    type: 'signup',
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    // User already exists
    if (error.message?.toLowerCase().includes('already registered') || error.code === 'email_exists') {
      return NextResponse.json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message || 'Fehler beim Erstellen des Kontos.' }, { status: 500 })
  }

  if (!data?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Fehler beim Generieren des Bestätigungslinks.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
  const confirmUrl = `${appUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=signup`

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
              <img src="${appUrl}/logo-dark.jpg" alt="Fotonizer" width="36" height="36"
                   style="display:inline-block;width:36px;height:36px;border-radius:8px;vertical-align:middle;margin-right:10px;" />
              <span style="font-size:16px;font-weight:800;letter-spacing:-0.03em;color:#1C1C1A;vertical-align:middle;">Fotonizer</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 32px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.04);">

              <!-- Gold accent line -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);line-height:3px;font-size:0;">&nbsp;</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="card-pad" style="padding:52px 52px 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <!-- Heading -->
                      <tr>
                        <td>
                          <h1 class="heading" style="margin:0;font-size:36px;font-weight:800;color:#1C1C1A;letter-spacing:-0.04em;line-height:1.1;">
                            Willkommen bei<br>Fotonizer! 👋
                          </h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding-top:22px;">
                          <p style="margin:0;font-size:15px;color:#7A7468;line-height:1.75;">
                            Schön, dass du dabei bist! Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren und loszulegen.
                          </p>
                        </td>
                      </tr>

                      <!-- CTA -->
                      <tr>
                        <td style="padding-top:36px;">
                          <table cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="border-radius:100px;background:#C4A47C;box-shadow:0 6px 20px rgba(196,164,124,0.38);">
                                <a href="${confirmUrl}" style="display:inline-block;padding:18px 52px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;line-height:1;white-space:nowrap;">
                                  E-Mail bestätigen &nbsp;→
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Fallback link -->
                      <tr>
                        <td style="padding-top:28px;">
                          <p style="margin:0;font-size:12px;color:#B0A898;line-height:1.6;">
                            Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
                            <a href="${confirmUrl}" style="color:#C4A47C;word-break:break-all;">${confirmUrl}</a>
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
                          <p style="margin:0;font-size:13px;color:#C0B8AE;line-height:1.65;">
                            ⏱ Dieser Link ist <strong style="color:#9CA3AF;">24 Stunden</strong> gültig.<br>
                            🔒 Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.
                          </p>
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
              <p style="margin:0;font-size:11px;color:#BDB5AA;line-height:1.7;">
                © 2025 Fotonizer · fotonizer.com &nbsp;·&nbsp;
                <a href="${appUrl}/impressum" style="color:#C0B8AE;text-decoration:none;">Impressum</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}/datenschutz" style="color:#C0B8AE;text-decoration:none;">Datenschutz</a>
              </p>
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
    subject: 'E-Mail bestätigen – Fotonizer',
    html,
  })

  return NextResponse.json({ ok: true })
}
