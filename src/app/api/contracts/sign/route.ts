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
    const { contractId, signedByName, signatureData, token } = await request.json()

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

    const studioName = photographer?.studio_name || photographer?.full_name || 'Studioflow'

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
    drawText('Studioflow', { bold: true, size: 18, color: [0.78, 0.66, 0.51] })
    y -= 4
    drawText(studioName, { bold: true, size: 13 })
    y -= 4
    drawLine()

    // Contract title
    drawText(contract.title, { bold: true, size: 14 })
    y -= 8

    // Contract content
    const plainText = htmlToText(contract.content || '')
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
    drawText('Dieses Dokument wurde digital unterzeichnet über Studioflow (studioflow.app)', {
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
      })
      .eq('id', contractId)

    // ─── Notify photographer via email ───────────────────────────────
    if (photographer?.email) {
      await resend.emails.send({
        from: 'Studioflow <noreply@studioflow.app>',
        to: photographer.email,
        subject: `✅ ${project.client.full_name} hat den Vertrag unterschrieben`,
        html: `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
  <h2 style="color:#1A1A1A;margin:0 0 16px;">Vertrag unterschrieben ✅</h2>
  <p style="color:#6B6B6B;margin:0 0 8px;">
    <strong style="color:#1A1A1A;">${project.client.full_name}</strong> hat den Vertrag 
    für <strong style="color:#1A1A1A;">${project.title}</strong> unterschrieben.
  </p>
  <p style="color:#6B6B6B;margin:0 0 24px;">
    Datum: ${signedAt.toLocaleDateString('de-DE')} ${signedAt.toLocaleTimeString('de-DE')}
  </p>
  ${pdfUrl ? `<a href="${pdfUrl}" style="display:inline-block;background:#1A1A1A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">PDF herunterladen</a>` : ''}
</div>
        `,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true, pdfUrl })
  } catch (error) {
    console.error('Sign contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
