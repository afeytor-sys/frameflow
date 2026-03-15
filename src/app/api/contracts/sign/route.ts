import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Strip HTML tags for plain text in PDF
function htmlToText(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Wrap text to fit within a given width
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (para.trim() === '') {
      lines.push('')
      continue
    }
    const words = para.split(' ')
    let currentLine = ''
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim()
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)
  }
  return lines
}

export async function POST(request: NextRequest) {
  try {
    const { contractId, signedByName, signatureData, token, clientFields } = await request.json()

    if (!contractId || !signedByName || !signatureData || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch contract + project + client + photographer
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        project:projects!inner(
          id,
          title,
          photographer_id,
          client_token,
          client:clients(full_name, email)
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const project = contract.project as {
      id: string
      title: string
      photographer_id: string
      client_token: string
      client: { full_name: string; email: string }
    }

    // Verify token matches
    if (project.client_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Already signed?
    if (contract.status === 'signed') {
      return NextResponse.json({ pdfUrl: contract.pdf_url })
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    const signedAt = new Date()

    // Fetch photographer info
    const { data: photographer } = await supabase
      .from('photographers')
      .select('full_name, studio_name, email')
      .eq('id', project.photographer_id)
      .single()

    const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'

    // ─── Generate PDF ───────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 595  // A4
    const pageHeight = 842
    const margin = 50
    const contentWidth = pageWidth - margin * 2
    const fontSize = 10
    const lineHeight = 16
    const maxCharsPerLine = Math.floor(contentWidth / (fontSize * 0.55))

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    const drawText = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
      const f = opts.bold ? boldFont : font
      const size = opts.size || fontSize
      const [r, g, b] = opts.color || [0.1, 0.1, 0.1]
      if (y < margin + 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(text, { x: margin, y, font: f, size, color: rgb(r, g, b) })
      y -= size + 6
    }

    const drawLine = () => {
      if (y < margin + 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      })
      y -= 12
    }

    // Header
    drawText('Fotonizer', { bold: true, size: 18, color: [0.78, 0.66, 0.51] })
    y -= 4
    drawText(studioName, { bold: true, size: 13 })
    y -= 4
    drawLine()

    // Contract title
    drawText(contract.title, { bold: true, size: 14 })
    y -= 8

    // Apply client fields to contract content before converting to text
    let contractContent = contract.content || ''
    if (clientFields && typeof clientFields === 'object') {
      for (const [key, value] of Object.entries(clientFields)) {
        const val = String(value || '')
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Replace TipTap span wrapper first
        contractContent = contractContent.replace(
          new RegExp(`<span[^>]*class="contract-variable"[^>]*>\\{\\{${escapedKey}\\}\\}<\\/span>`, 'g'),
          val
        )
        // Replace plain {{key}} fallback
        contractContent = contractContent.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), val)
      }
    }

    // Contract content
    const plainText = htmlToText(contractContent)
    const lines = wrapText(plainText, maxCharsPerLine)
    for (const line of lines) {
      if (y < margin + 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      if (line === '') {
        y -= lineHeight / 2
      } else {
        page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0.1, 0.1, 0.1) })
        y -= lineHeight
      }
    }

    // Signature section
    y -= 20
    drawLine()
    drawText('DIGITALE UNTERSCHRIFT', { bold: true, size: 9, color: [0.42, 0.42, 0.42] })
    y -= 4

    // Embed signature image
    try {
      const base64Data = signatureData.replace(/^data:image\/png;base64,/, '')
      const sigBytes = Buffer.from(base64Data, 'base64')
      const sigImage = await pdfDoc.embedPng(sigBytes)
      const sigDims = sigImage.scale(0.4)

      if (y < margin + sigDims.height + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }

      page.drawImage(sigImage, {
        x: margin,
        y: y - sigDims.height,
        width: sigDims.width,
        height: sigDims.height,
      })
      y -= sigDims.height + 8
    } catch {
      // If signature image fails, just note it
      drawText('[Unterschrift gespeichert]', { color: [0.42, 0.42, 0.42] })
    }

    drawText(`Unterschrieben von: ${signedByName}`, { bold: true })
    drawText(`Datum: ${signedAt.toLocaleDateString('de-DE')} ${signedAt.toLocaleTimeString('de-DE')}`)
    drawText(`IP-Adresse: ${ipAddress}`)
    y -= 8
    drawLine()
    drawText('Dieses Dokument wurde digital unterzeichnet über Fotonizer (fotonizer.com)', {
      size: 8,
      color: [0.6, 0.6, 0.6],
    })
    drawText('Die Unterschrift ist rechtsgültig gemäß eIDAS-Verordnung (EU) Nr. 910/2014.', {
      size: 8,
      color: [0.6, 0.6, 0.6],
    })

    const pdfBytes = await pdfDoc.save()

    // ─── Upload PDF to Supabase Storage ─────────────────────────────
    const fileName = `contracts/${contractId}/signed-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    let pdfUrl: string | null = null
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
      pdfUrl = urlData.publicUrl
    }

    // ─── Update contract in DB ───────────────────────────────────────
    await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: signedAt.toISOString(),
        signed_by_name: signedByName,
        signature_data: signatureData,
        ip_address: ipAddress,
        pdf_url: pdfUrl,
        ...(clientFields && Object.keys(clientFields).length > 0 ? { client_fields: clientFields } : {}),
      })
      .eq('id', contractId)

    // ─── Notify photographer via email ───────────────────────────────
    if (photographer?.email) {
      const dateStr = signedAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
      const timeStr = signedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

      await resend.emails.send({
        from: 'Fotonizer <noreply@fotonizer.com>',
        to: photographer.email,
        subject: `${project.client.full_name} hat den Vertrag unterschrieben`,
        html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vertrag unterschrieben</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F4F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1A1A1A;border-radius:14px;padding:10px 20px;">
                    <span style="font-size:20px;font-weight:800;letter-spacing:-0.04em;color:#C4A47C;">Fotonizer</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Green top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#2ECC71,#27AE60);padding:28px 32px;text-align:center;">
                    <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:56px;">✍️</div>
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.03em;">Vertrag unterschrieben!</h1>
                    <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Dein Kunde hat den Vertrag digital unterzeichnet</p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px;">

                    <!-- Details card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px 24px;">

                          <!-- Row: Kunde -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                            <tr>
                              <td style="width:20px;vertical-align:top;padding-top:2px;">
                                <span style="font-size:14px;">👤</span>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9CA3AF;">Kunde</p>
                                <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#1A1A1A;">${project.client.full_name}</p>
                              </td>
                            </tr>
                          </table>

                          <!-- Row: Projekt -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                            <tr>
                              <td style="width:20px;vertical-align:top;padding-top:2px;">
                                <span style="font-size:14px;">📁</span>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9CA3AF;">Projekt</p>
                                <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#1A1A1A;">${project.title}</p>
                              </td>
                            </tr>
                          </table>

                          <!-- Row: Datum -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                            <tr>
                              <td style="width:20px;vertical-align:top;padding-top:2px;">
                                <span style="font-size:14px;">📅</span>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9CA3AF;">Datum &amp; Uhrzeit</p>
                                <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#1A1A1A;">${dateStr} um ${timeStr} Uhr</p>
                              </td>
                            </tr>
                          </table>

                          <!-- Row: Vertrag -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:20px;vertical-align:top;padding-top:2px;">
                                <span style="font-size:14px;">📄</span>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9CA3AF;">Vertrag</p>
                                <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#1A1A1A;">${contract.title}</p>
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>

                    <!-- CTA buttons -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${pdfUrl ? `
                        <td style="padding-right:8px;">
                          <a href="${pdfUrl}" style="display:block;background:#1A1A1A;color:#FFFFFF;text-align:center;padding:14px 20px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;">
                            ⬇️ PDF herunterladen
                          </a>
                        </td>
                        ` : ''}
                        <td>
                          <a href="https://fotonizer.com/dashboard/contracts" style="display:block;background:#F5F4F0;color:#1A1A1A;text-align:center;padding:14px 20px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;border:1px solid #E8E8E4;">
                            📋 Zum Dashboard
                          </a>
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
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                Diese E-Mail wurde automatisch von <strong style="color:#C4A47C;">Fotonizer</strong> gesendet.
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#B0B0B0;">
                Die digitale Unterschrift ist rechtsgültig gemäß eIDAS-Verordnung (EU) Nr. 910/2014.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true, pdfUrl })
  } catch (error) {
    console.error('Sign contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
