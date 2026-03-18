// ── Automated Email Templates (DE / EN) ─────────────────────────────────────
// Used by: portal created, contract sent, gallery delivered, reminders

type Locale = 'de' | 'en'

interface EmailData {
  studioName: string
  clientName: string
  projectTitle: string
  portalUrl: string
  shootDate?: string | null
  locale: Locale
}

// ── Shared HTML wrapper ──────────────────────────────────────────────────────
function emailWrapper(content: string, studioName: string, locale: Locale) {
  const footer = locale === 'de'
    ? `Diese E-Mail wurde von <strong>${studioName}</strong> über Fotonizer gesendet. Antworte direkt auf diese E-Mail, um ${studioName} zu kontaktieren.`
    : `This email was sent by <strong>${studioName}</strong> via Fotonizer. Reply directly to this email to contact ${studioName}.`

  return `<!DOCTYPE html>
<html lang="${locale}">
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
            <td style="padding:28px 40px 20px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#111110;letter-spacing:-0.02em;">${studioName}</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>
          <!-- Body -->
          <tr><td style="padding:28px 40px;">${content}</td></tr>
          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px 28px;">
              <p style="margin:0;font-size:12px;color:#B0ACA6;line-height:1.6;">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 0;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;background:#111110;color:#F8F7F4;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:-0.01em;">${label} →</a>
      </td>
    </tr>
  </table>`
}

// ── 1. Portal Created ────────────────────────────────────────────────────────
export function portalCreatedEmail(data: EmailData) {
  const { studioName, clientName, projectTitle, portalUrl, locale } = data
  const isDE = locale === 'de'

  const subject = isDE
    ? `Dein Fotografie-Portal ist bereit, ${clientName} 🎉`
    : `Your photography portal is ready, ${clientName} 🎉`

  const body = isDE ? `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Hallo ${clientName} 👋</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Dein persönliches Portal für <strong style="color:#111110;">${projectTitle}</strong> ist jetzt bereit.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hier findest du alles rund um dein Shooting — Vertrag, Timeline, Galerie und mehr. Alles an einem Ort.
    </p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#7A7670;">📋 Vertrag ansehen & unterschreiben</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">📅 Shooting-Details & Timeline</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">🖼️ Galerie (sobald verfügbar)</p>
    </div>
    ${ctaButton(portalUrl, 'Portal öffnen')}
  ` : `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Hello ${clientName} 👋</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Your personal portal for <strong style="color:#111110;">${projectTitle}</strong> is now ready.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Here you'll find everything about your shoot — contract, timeline, gallery and more. All in one place.
    </p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#7A7670;">📋 View & sign your contract</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">📅 Shoot details & timeline</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">🖼️ Gallery (once available)</p>
    </div>
    ${ctaButton(portalUrl, 'Open portal')}
  `

  return { subject, html: emailWrapper(body, studioName, locale) }
}

// ── 2. Contract Sent ─────────────────────────────────────────────────────────
export function contractSentEmail(data: EmailData) {
  const { studioName, clientName, projectTitle, portalUrl, locale } = data
  const isDE = locale === 'de'
  const contractUrl = `${portalUrl}/contract`

  const subject = isDE
    ? `Dein Vertrag ist bereit, ${clientName} ✍️`
    : `Your contract is ready to sign, ${clientName} ✍️`

  const body = isDE ? `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Hallo ${clientName} 👋</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Dein Fotografievertrag für <strong style="color:#111110;">${projectTitle}</strong> ist bereit zur Unterschrift.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Bitte lies den Vertrag sorgfältig durch und unterschreibe ihn digital. Es dauert nur wenige Minuten.
    </p>
    ${ctaButton(contractUrl, 'Vertrag unterschreiben')}
    <p style="margin:16px 0 0;font-size:12px;color:#B0ACA6;">
      Oder kopiere diesen Link: <span style="color:#C4A47C;word-break:break-all;">${contractUrl}</span>
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Hello ${clientName} 👋</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Your photography contract for <strong style="color:#111110;">${projectTitle}</strong> is ready to sign.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Please read the contract carefully and sign it digitally. It only takes a few minutes.
    </p>
    ${ctaButton(contractUrl, 'Sign contract')}
    <p style="margin:16px 0 0;font-size:12px;color:#B0ACA6;">
      Or copy this link: <span style="color:#C4A47C;word-break:break-all;">${contractUrl}</span>
    </p>
  `

  return { subject, html: emailWrapper(body, studioName, locale) }
}

// ── 3. Gallery Delivered ─────────────────────────────────────────────────────
export function galleryDeliveredEmail(data: EmailData) {
  const { studioName, clientName, projectTitle, portalUrl, locale } = data
  const isDE = locale === 'de'
  const galleryUrl = `${portalUrl}/gallery`

  const subject = isDE
    ? `Deine Fotos sind fertig, ${clientName} 🎊`
    : `Your photos are ready, ${clientName} 🎊`

  const body = isDE ? `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Deine Galerie ist fertig! 🎊</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hallo ${clientName}, deine Fotos für <strong style="color:#111110;">${projectTitle}</strong> sind jetzt verfügbar!
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Ich hoffe, du liebst deine Fotos genauso sehr wie ich es tue. Schau sie dir an, markiere deine Favoriten und lade sie herunter.
    </p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#7A7670;">❤️ Favoriten markieren</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">⬇️ Fotos herunterladen</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">💬 Kommentare hinterlassen</p>
    </div>
    ${ctaButton(galleryUrl, 'Galerie öffnen')}
  ` : `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Your gallery is ready! 🎊</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hello ${clientName}, your photos for <strong style="color:#111110;">${projectTitle}</strong> are now available!
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      I hope you love your photos as much as I do. Browse them, mark your favorites and download them.
    </p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#7A7670;">❤️ Mark favorites</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">⬇️ Download photos</p>
      <p style="margin:6px 0 0;font-size:13px;color:#7A7670;">💬 Leave comments</p>
    </div>
    ${ctaButton(galleryUrl, 'Open gallery')}
  `

  return { subject, html: emailWrapper(body, studioName, locale) }
}

// ── 4. Shooting Reminder 7 days ──────────────────────────────────────────────
export function reminder7dEmail(data: EmailData) {
  const { studioName, clientName, projectTitle, portalUrl, shootDate, locale } = data
  const isDE = locale === 'de'

  const subject = isDE
    ? `Dein Shooting ist in 7 Tagen! 📸`
    : `Your shoot is in 7 days! 📸`

  const body = isDE ? `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Noch 7 Tage! 🎉</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hallo ${clientName}, dein Shooting für <strong style="color:#111110;">${projectTitle}</strong> ist in einer Woche${shootDate ? ` am <strong style="color:#111110;">${shootDate}</strong>` : ''}.
    </p>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111110;">Tipps zur Vorbereitung:</p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0;font-size:13px;color:#7A7670;">👗 Kleidung vorbereiten — Farben, die sich ergänzen</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">😴 Gut schlafen — du wirst strahlend aussehen</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">📍 Treffpunkt im Portal prüfen</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">❓ Fragen? Antworte einfach auf diese E-Mail</p>
    </div>
    ${ctaButton(portalUrl, 'Portal öffnen')}
  ` : `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">7 days to go! 🎉</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hello ${clientName}, your shoot for <strong style="color:#111110;">${projectTitle}</strong> is in one week${shootDate ? ` on <strong style="color:#111110;">${shootDate}</strong>` : ''}.
    </p>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111110;">Tips to prepare:</p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0;font-size:13px;color:#7A7670;">👗 Prepare your outfits — choose complementary colors</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">😴 Get good sleep — you'll look radiant</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">📍 Check the meeting point in your portal</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">❓ Questions? Just reply to this email</p>
    </div>
    ${ctaButton(portalUrl, 'Open portal')}
  `

  return { subject, html: emailWrapper(body, studioName, locale) }
}

// ── 5. Shooting Reminder 1 day ───────────────────────────────────────────────
export function reminder1dEmail(data: EmailData) {
  const { studioName, clientName, projectTitle, portalUrl, shootDate, locale } = data
  const isDE = locale === 'de'

  const subject = isDE
    ? `Morgen ist dein Shooting! 📸`
    : `Your shoot is tomorrow! 📸`

  const body = isDE ? `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Morgen ist es soweit! 📸</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hallo ${clientName}, morgen${shootDate ? ` am <strong style="color:#111110;">${shootDate}</strong>` : ''} ist dein Shooting für <strong style="color:#111110;">${projectTitle}</strong>!
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Ich freue mich sehr auf unser Shooting! Hier noch einmal alle wichtigen Infos:
    </p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0;font-size:13px;color:#7A7670;">📍 Treffpunkt im Portal ansehen</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">⏰ Pünktlich sein — wir nutzen das beste Licht</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">😊 Entspannt bleiben — ich kümmere mich um alles</p>
    </div>
    ${ctaButton(portalUrl, 'Portal öffnen')}
  ` : `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110;letter-spacing:-0.02em;">Tomorrow is the day! 📸</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      Hello ${clientName}, your shoot for <strong style="color:#111110;">${projectTitle}</strong> is tomorrow${shootDate ? ` on <strong style="color:#111110;">${shootDate}</strong>` : ''}!
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
      I'm so excited for our shoot! Here are all the important details one more time:
    </p>
    <div style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0;font-size:13px;color:#7A7670;">📍 Check the meeting point in your portal</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">⏰ Be on time — we'll use the best light</p>
      <p style="margin:8px 0 0;font-size:13px;color:#7A7670;">😊 Stay relaxed — I'll take care of everything</p>
    </div>
    ${ctaButton(portalUrl, 'Open portal')}
  `

  return { subject, html: emailWrapper(body, studioName, locale) }
}
