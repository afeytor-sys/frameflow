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

    // Build item lookup map
    interface ItemLookup {
      title: string
      unit_price: number
    }
    const itemMap = new Map<string, ItemLookup>()
    for (const section of quote.sections || []) {
      for (const item of section.items || []) {
        itemMap.set(item.id, { title: item.title, unit_price: item.unit_price })
      }
    }

    // Calculate totals
    let subtotal = 0
    const lineItems: { title: string; qty: number; unit_price: number; total: number }[] = []

    for (const [itemId, qty] of Object.entries(selections as Record<string, number>)) {
      if (!qty || qty <= 0) continue
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
      .select('full_name, studio_name, email, notification_email, tax_status')
      .eq('id', quote.photographer_id)
      .single()

    const notifEmail = photographer?.notification_email || photographer?.email
    const studioName = photographer?.studio_name || photographer?.full_name || 'Studio'

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

    // Confirm to client
    if (resend) {
      const clientItemRows = lineItems.map(it => `
        <tr>
          <td style="padding:9px 0;font-size:13px;color:#111110;border-top:1px solid #E8E4DC;">${it.title}</td>
          <td style="padding:9px 0;font-size:13px;color:#7A7670;text-align:center;border-top:1px solid #E8E4DC;">${it.qty}×</td>
          <td style="padding:9px 0;font-size:13px;font-weight:700;color:#111110;text-align:right;border-top:1px solid #E8E4DC;">${formatEur(it.total)}</td>
        </tr>`).join('')

      const clientTotalRow = quote.tax_status === 'kleinunternehmer'
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
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        to: client_email,
        replyTo: photographer?.email || undefined,
        subject: `Deine Angebotsbestätigung: ${quote.title}`,
        html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

        <!-- Header card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#111110;border-radius:20px;overflow:hidden;margin-bottom:12px;">
            <tr><td style="height:3px;background:linear-gradient(90deg,#C4A47C,#E8C99A,#C4A47C);"></td></tr>
            <tr>
              <td style="padding:32px 36px 28px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#C4A47C;">Angebotsbestätigung</p>
                <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.03em;">${quote.title}</p>
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.55);">${studioName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 28px;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right:32px;">
                      <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);">Kunde</p>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#FFFFFF;">${client_name}</p>
                    </td>
                    <td>
                      <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);">Datum</p>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#FFFFFF;">${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Items card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#FFFFFF;border-radius:20px;border:1px solid #E8E4DC;overflow:hidden;margin-bottom:12px;">
            <tr>
              <td style="padding:20px 28px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;padding-bottom:8px;">Position</td>
                    <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;padding-bottom:8px;text-align:center;width:12%;">Anz.</td>
                    <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B0ACA6;padding-bottom:8px;text-align:right;width:20%;">Gesamt</td>
                  </tr>
                  ${clientItemRows}
                  ${clientTotalRow}
                </table>
              </td>
            </tr>
            ${quote.tax_status === 'kleinunternehmer'
              ? '<tr><td style="padding:4px 28px 16px;font-size:11px;color:#B0ACA6;">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</td></tr>'
              : '<tr><td style="height:16px;"></td></tr>'}
          </table>
        </td></tr>

        <!-- Info card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#FFFFFF;border-radius:20px;border:1px solid #E8E4DC;overflow:hidden;margin-bottom:12px;">
            <tr>
              <td style="padding:20px 28px;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111110;">Was passiert als nächstes?</p>
                <p style="margin:0;font-size:13px;color:#7A7670;line-height:1.7;">
                  ${studioName} wurde benachrichtigt und wird sich in Kürze bei dir melden,
                  um die weiteren Details zu besprechen.
                </p>
                ${photographer?.email ? `<p style="margin:12px 0 0;font-size:13px;color:#7A7670;">Bei Fragen erreichst du uns unter <a href="mailto:${photographer.email}" style="color:#C4A47C;text-decoration:none;font-weight:600;">${photographer.email}</a></p>` : ''}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:16px 0 8px;">
          <p style="margin:0;font-size:11px;color:#B0ACA6;">
            Erstellt mit <a href="https://fotonizer.com" style="color:#C4A47C;text-decoration:none;">Fotonizer</a>
            · Studio management for photographers
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
