import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch invoice with project and client info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        project:projects!inner(
          id,
          title,
          client_url,
          photographer_id,
          client:clients(full_name, email)
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const project = invoice.project as {
      id: string
      title: string
      client_url: string
      photographer_id: string
      client: { full_name: string; email: string } | { full_name: string; email: string }[]
    }

    if (project.photographer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientRaw = Array.isArray(project.client) ? project.client[0] : project.client
    const clientEmail = clientRaw?.email
    const clientName = clientRaw?.full_name || 'Kunde'

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
    }

    // Fetch photographer info
    const { data: photographer } = await supabase
      .from('photographers')
      .select('full_name, studio_name, email, notification_email')
      .eq('id', user.id)
      .single()

    const studioName = photographer?.studio_name || photographer?.full_name || 'Your photographer'
    const notifEmail = photographer?.notification_email || photographer?.email || undefined
    const portalUrl = project.client_url || `${process.env.NEXT_PUBLIC_SITE_URL}/client`

    const amountFormatted = formatEur(invoice.amount)
    const dueDateFormatted = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
      : null

    const { error: emailError } = await resend.emails.send({
      from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
      replyTo: notifEmail,
      bcc: notifEmail,
      to: clientEmail,
      subject: `Rechnung ${invoice.invoice_number} von ${studioName} — ${amountFormatted}`,
      html: `
<!DOCTYPE html>
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
              <p style="margin:4px 0 0;font-size:13px;color:#7A7670;">Rechnung</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px;">
              <p style="margin:0 0 6px;font-size:15px;color:#7A7670;">Hallo <strong style="color:#111110;">${clientName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#7A7670;line-height:1.6;">
                please find your invoice for <strong style="color:#111110;">${project.title}</strong>.
              </p>

              <!-- Invoice details box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#7A7670;">Rechnungsnummer</td>
                        <td style="padding:6px 0;font-size:13px;color:#111110;font-weight:600;text-align:right;font-family:monospace;">${invoice.invoice_number}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#7A7670;">Projekt</td>
                        <td style="padding:6px 0;font-size:13px;color:#111110;font-weight:600;text-align:right;">${project.title}</td>
                      </tr>
                      ${invoice.description ? `
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#7A7670;">Beschreibung</td>
                        <td style="padding:6px 0;font-size:13px;color:#111110;text-align:right;">${invoice.description}</td>
                      </tr>` : ''}
                      ${dueDateFormatted ? `
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#7A7670;">Due by</td>
                        <td style="padding:6px 0;font-size:13px;color:#C94030;font-weight:600;text-align:right;">${dueDateFormatted}</td>
                      </tr>` : ''}
                      <tr>
                        <td colspan="2" style="padding:12px 0 0;border-top:1px solid #E8E4DC;"></td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;font-weight:700;color:#111110;">Gesamtbetrag</td>
                        <td style="font-size:22px;font-weight:800;color:#C4A47C;text-align:right;letter-spacing:-0.03em;">${amountFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#7A7670;line-height:1.6;">
                Please transfer the amount by the due date. Feel free to reach out if you have any questions.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}"
                       style="display:inline-block;background:#111110;color:#F8F7F4;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:-0.01em;">
                      Rechnung im Portal ansehen →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px 28px;">
              <p style="margin:0 0 6px;font-size:12px;color:#B0ACA6;">
                This invoice was sent by <strong>${studioName}</strong> via Fotonizer.
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
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update invoice status to 'sent'
    await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
