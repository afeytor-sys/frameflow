import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export async function POST(request: NextRequest) {
  try {
    const { token, selections, client_name, client_email } = await request.json()

    if (!token || !selections || !client_name || !client_email) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch quote with sections + items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        sections:quote_sections(
          *,
          items:quote_items(*)
        )
      `)
      .eq('client_token', token)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
    }

    if (quote.status === 'expired') {
      return NextResponse.json({ error: 'Angebot abgelaufen' }, { status: 400 })
    }

    if (quote.valid_until) {
      const expiry = new Date(quote.valid_until)
      expiry.setHours(23, 59, 59, 999)
      if (expiry < new Date()) {
        return NextResponse.json({ error: 'Angebot abgelaufen' }, { status: 400 })
      }
    }

    // Build ordered item list (section.position → item.position)
    interface ItemLookup {
      title: string
      unit_price: number
      sectionPos: number
      itemPos: number
    }
    const itemMap = new Map<string, ItemLookup>()
    for (const section of (quote.sections || []).sort((a: {position:number}, b: {position:number}) => a.position - b.position)) {
      for (const item of (section.items || []).sort((a: {position:number}, b: {position:number}) => a.position - b.position)) {
        itemMap.set(item.id, { title: item.title, unit_price: item.unit_price, sectionPos: section.position, itemPos: item.position })
      }
    }

    // Calculate totals — preserve section+item order
    let subtotal = 0
    const lineItems: { title: string; qty: number; unit_price: number; total: number }[] = []

    const orderedSelections = Object.entries(selections as Record<string, number>)
      .filter(([, qty]) => qty > 0)
      .sort(([aId], [bId]) => {
        const a = itemMap.get(aId)
        const b = itemMap.get(bId)
        if (!a || !b) return 0
        if (a.sectionPos !== b.sectionPos) return a.sectionPos - b.sectionPos
        return a.itemPos - b.itemPos
      })

    for (const [itemId, qty] of orderedSelections) {
      const item = itemMap.get(itemId)
      if (!item) continue
      const lineTotal = item.unit_price * qty
      subtotal += lineTotal
      lineItems.push({ title: item.title, qty, unit_price: item.unit_price, total: lineTotal })
    }

    const taxAmount = quote.tax_status === 'kleinunternehmer'
      ? 0
      : Math.round(subtotal * quote.tax_rate / 100)
    const totalAmount = subtotal + taxAmount

    // Insert quote response
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null

    const { error: insertError } = await supabase
      .from('quote_responses')
      .insert({
        quote_id: quote.id,
        client_name,
        client_email,
        selections,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        ip_address: ip,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
    }

    // Update quote status
    if (quote.status !== 'accepted') {
      await supabase
        .from('quotes')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', quote.id)
    }

    // Notify photographer
    const { data: photographer } = await supabase
      .from('photographers')
      .select('full_name, studio_name, email, notification_email, tax_status, website, phone, logo_url')
      .eq('id', quote.photographer_id)
      .single()

    const notifEmail = photographer?.notification_email || photographer?.email
    const studioName = photographer?.studio_name || photographer?.full_name || 'Studio'
    const displayName = [photographer?.studio_name, photographer?.full_name].filter(Boolean).join(' · ') || 'Studio'

    if (notifEmail && resend) {
      const itemRowsHtml = lineItems.map(it => `
        <tr>
          <td style="padding:7px 0;font-size:13px;color:#111110;border-top:1px solid #E8E4DC;">${it.title}</td>
          <td style="padding:7px 0;font-size:13px;color:#7A7670;text-align:center;border-top:1px solid #E8E4DC;">${it.qty}×</td>
          <td style="padding:7px 0;font-size:13px;font-weight:700;color:#111110;text-align:right;border-top:1px solid #E8E4DC;">${formatEur(it.total)}</td>
        </tr>`).join('')

      const totalRowHtml = quote.tax_status === 'kleinunternehmer'
        ? `<tr>
            <td colspan="2" style="padding:10px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#7A7670;border-top:2px solid #E8E4DC;">Gesamt</td>
            <td style="padding:10px 0 4px;font-size:15px;font-weight:800;text-align:right;color:#C4A47C;border-top:2px solid #E8E4DC;">${formatEur(totalAmount)}</td>
          </tr>`
        : `<tr>
            <td colspan="2" style="padding:8px 0 2px;font-size:12px;text-align:right;color:#7A7670;border-top:2px solid #E8E4DC;">Netto</td>
            <td style="padding:8px 0 2px;font-size:12px;text-align:right;color:#111110;border-top:2px solid #E8E4DC;">${formatEur(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:2px 0;font-size:12px;text-align:right;color:#7A7670;">MwSt ${quote.tax_rate}%</td>
            <td style="padding:2px 0;font-size:12px;text-align:right;color:#111110;">${formatEur(taxAmount)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:8px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#111110;border-top:1px solid #E8E4DC;">Gesamt</td>
            <td style="padding:8px 0 4px;font-size:15px;font-weight:800;text-align:right;color:#C4A47C;">${formatEur(totalAmount)}</td>
          </tr>`

      await resend.emails.send({
        from: `Fotonizer <noreply@fotonizer.com>`,
        to: notifEmail,
        subject: `Angebot angenommen: „${quote.title}" — ${formatEur(totalAmount)}`,
        html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;border:1px solid #E8E4DC;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);"></td></tr>
        <tr>
          <td style="padding:28px 36px 20px;">
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111110;letter-spacing:-0.03em;">Angebot angenommen</p>
            <p style="margin:0;font-size:13px;color:#7A7670;">${studioName}</p>
          </td>
        </tr>
        <tr><td style="padding:0 36px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>
        <tr>
          <td style="padding:24px 36px;">
            <p style="margin:0 0 16px;font-size:15px;color:#7A7670;line-height:1.6;">
              <strong style="color:#111110;">${client_name}</strong> hat dein Angebot
              <strong style="color:#111110;"> „${quote.title}"</strong> angenommen.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
              <tr>
                <td style="font-size:12px;color:#B0ACA6;padding-bottom:4px;">E-Mail</td>
                <td style="font-size:12px;color:#111110;font-weight:600;text-align:right;padding-bottom:4px;">${client_email}</td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;padding-bottom:6px;">Position</td>
                      <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;padding-bottom:6px;text-align:center;width:14%;">Menge</td>
                      <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;padding-bottom:6px;text-align:right;width:18%;">Gesamt</td>
                    </tr>
                    ${itemRowsHtml}
                    ${totalRowHtml}
                  </table>
                </td>
              </tr>
              ${quote.tax_status === 'kleinunternehmer'
                ? '<tr><td style="padding:2px 16px 14px;font-size:11px;color:#B0ACA6;">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</td></tr>'
                : '<tr><td style="height:14px;"></td></tr>'}
            </table>
            <p style="margin:0;font-size:13px;color:#7A7670;line-height:1.6;">
              Du kannst das Angebot in deinem Dashboard in eine Rechnung umwandeln.
            </p>
          </td>
        </tr>
        <tr><td style="padding:0 36px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>
        <tr>
          <td align="center" style="padding:18px 36px 24px;">
            <p style="margin:0;font-size:12px;color:#B0ACA6;">
              © ${new Date().getFullYear()} Fotonizer · Studio management for photographers
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }).catch(err => console.error('Notification email error:', err))
    }

    // Confirm to client — clean PDF-style layout
    if (resend) {
      const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

      const clientItemRows = lineItems.map((it, idx) => `
        <tr>
          <td style="padding:10px 0;font-size:13px;color:#6B7280;border-top:1px solid #F0EDE8;width:5%;">${idx + 1}</td>
          <td style="padding:10px 12px;font-size:13px;color:#111110;border-top:1px solid #F0EDE8;">${it.title}</td>
          <td style="padding:10px 0;font-size:13px;color:#6B7280;text-align:center;border-top:1px solid #F0EDE8;width:10%;">${it.qty}</td>
          <td style="padding:10px 0;font-size:13px;color:#6B7280;text-align:right;border-top:1px solid #F0EDE8;width:16%;">${formatEur(it.unit_price)}</td>
          <td style="padding:10px 0;font-size:13px;font-weight:700;color:#111110;text-align:right;border-top:1px solid #F0EDE8;width:16%;">${formatEur(it.total)}</td>
        </tr>`).join('')

      const clientTotalRows = quote.tax_status === 'kleinunternehmer'
        ? `<tr>
            <td colspan="4" style="padding:12px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#6B7280;border-top:2px solid #E8E4DC;">Gesamt</td>
            <td style="padding:12px 0 4px;font-size:16px;font-weight:800;text-align:right;color:#C4A47C;border-top:2px solid #E8E4DC;">${formatEur(totalAmount)}</td>
          </tr>`
        : `<tr>
            <td colspan="4" style="padding:10px 0 2px;font-size:12px;text-align:right;color:#6B7280;border-top:2px solid #E8E4DC;">Nettobetrag</td>
            <td style="padding:10px 0 2px;font-size:12px;text-align:right;color:#111110;border-top:2px solid #E8E4DC;">${formatEur(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding:2px 0;font-size:12px;text-align:right;color:#6B7280;">MwSt ${quote.tax_rate}%</td>
            <td style="padding:2px 0;font-size:12px;text-align:right;color:#111110;">${formatEur(taxAmount)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding:10px 0 4px;font-size:13px;font-weight:700;text-align:right;color:#111110;border-top:1px solid #E8E4DC;">Gesamtbetrag</td>
            <td style="padding:10px 0 4px;font-size:16px;font-weight:800;text-align:right;color:#C4A47C;">${formatEur(totalAmount)}</td>
          </tr>`

      await resend.emails.send({
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        to: client_email,
        replyTo: photographer?.email || undefined,
        subject: `Angebotsbestätigung: ${quote.title}`,
        html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Angebotsbestätigung</title>
</head>
<body style="margin:0;padding:0;background:#F4F3F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F3F0;">
<tr><td align="center" style="padding:40px 16px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#FFFFFF;border-radius:4px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

    <!-- Gold top bar -->
    <tr><td style="height:4px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);"></td></tr>

    <!-- Studio header -->
    <tr><td style="padding:32px 40px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;">
          ${photographer?.logo_url ? `<img src="${photographer.logo_url}" alt="${displayName}" style="height:40px;width:auto;object-fit:contain;display:block;margin-bottom:10px;">` : ''}
          <p style="margin:0;font-size:20px;font-weight:800;color:#111110;letter-spacing:-0.02em;">${displayName}</p>
          ${photographer?.email ? `<p style="margin:2px 0 0;font-size:12px;color:#7A7670;">${photographer.email}</p>` : ''}
          ${photographer?.website ? `<p style="margin:2px 0 0;font-size:12px;color:#7A7670;">${photographer.website}</p>` : ''}
          ${photographer?.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#7A7670;">${photographer.phone}</p>` : ''}
        </td>
        <td style="vertical-align:top;text-align:right;">
          <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;">Angebotsbestätigung</p>
          <p style="margin:0;font-size:13px;color:#111110;">${dateStr}</p>
        </td>
      </tr></table>
    </td></tr>

    <!-- Divider -->
    <tr><td style="height:1px;background:#E8E4DC;margin:0 40px;"></td></tr>

    <!-- Client info -->
    <tr><td style="padding:20px 40px;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;">Kunde</p>
      <p style="margin:0;font-size:14px;font-weight:700;color:#111110;">${client_name}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#7A7670;">${client_email}</p>
    </td></tr>

    <!-- Quote title -->
    <tr><td style="padding:0 40px 16px;">
      <p style="margin:0;font-size:17px;font-weight:800;color:#111110;letter-spacing:-0.02em;">${quote.title}</p>
    </td></tr>

    <!-- Items table -->
    <tr><td style="padding:0 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E8E4DC;border-radius:8px;overflow:hidden;">
        <tr style="background:#F8F7F4;">
          <td style="padding:9px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;width:5%;">Nr.</td>
          <td style="padding:9px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;">Beschreibung</td>
          <td style="padding:9px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;text-align:center;width:10%;">Anz.</td>
          <td style="padding:9px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;text-align:right;width:16%;">Einzelpr.</td>
          <td style="padding:9px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B0ACA6;text-align:right;width:16%;">Gesamt</td>
        </tr>
        ${clientItemRows}
        ${clientTotalRows}
        ${quote.tax_status === 'kleinunternehmer'
          ? '<tr><td colspan="5" style="padding:6px 12px 12px;font-size:11px;color:#B0ACA6;">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</td></tr>'
          : '<tr><td colspan="5" style="height:12px;"></td></tr>'}
      </table>
    </td></tr>

    <!-- Next steps -->
    <tr><td style="padding:24px 40px 20px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111110;">Was passiert als nächstes?</p>
      <p style="margin:0;font-size:13px;color:#7A7670;line-height:1.65;">
        ${displayName} wurde benachrichtigt und wird sich in Kürze bei dir melden.
        ${photographer?.email ? `Bei Fragen erreichst du uns unter <a href="mailto:${photographer.email}" style="color:#C4A47C;text-decoration:none;">${photographer.email}</a>.` : ''}
      </p>
    </td></tr>

    <!-- Divider -->
    <tr><td style="height:1px;background:#E8E4DC;"></td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding:16px 40px 20px;">
      <p style="margin:0;font-size:11px;color:#B0ACA6;">
        Erstellt mit <a href="https://fotonizer.com" style="color:#C4A47C;text-decoration:none;">Fotonizer</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`,
      }).catch(err => console.error('Client confirmation email error:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Quote submit error:', error)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
