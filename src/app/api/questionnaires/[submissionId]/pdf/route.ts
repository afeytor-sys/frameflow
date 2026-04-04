import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface Question {
  id: string
  label: string
  type: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: submission } = await service
    .from('questionnaire_submissions')
    .select(`
      id, answers, submitted_at,
      questionnaire:questionnaires(id, title, questions, photographer_id),
      project:projects(title, client:clients(full_name))
    `)
    .eq('id', submissionId)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const questionnaire = (Array.isArray(submission.questionnaire)
    ? submission.questionnaire[0]
    : submission.questionnaire) as { id: string; title: string; questions: Question[]; photographer_id: string } | null

  if (questionnaire?.photographer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectRaw = Array.isArray(submission.project) ? submission.project[0] : submission.project
  const project = projectRaw as { title?: string; client?: unknown } | null
  const clientRaw = Array.isArray(project?.client) ? (project?.client as unknown[])[0] : project?.client
  const client = clientRaw as { full_name?: string } | null
  const clientName = client?.full_name || 'Kunde'

  const submittedAt = new Date(submission.submitted_at).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // ─── Build PDF ────────────────────────────────────────────────────────────
  const pdfDoc  = await PDFDocument.create()
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const W = 595  // A4 width
  const H = 842  // A4 height
  const margin = 50
  const contentW = W - margin * 2

  let page = pdfDoc.addPage([W, H])
  let y = H - margin

  // Word-wrap helper
  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      if (current && current.length + word.length + 1 > maxChars) {
        lines.push(current)
        current = word
      } else {
        current = current ? `${current} ${word}` : word
      }
    }
    if (current) lines.push(current)
    return lines.length ? lines : ['']
  }

  const ensurePage = (neededHeight: number) => {
    if (y - neededHeight < margin + 40) {
      page = pdfDoc.addPage([W, H])
      y = H - margin
    }
  }

  const drawText = (text: string, opts: {
    bold?: boolean; size?: number; color?: [number, number, number]; x?: number
  } = {}) => {
    const f    = opts.bold ? boldFont : font
    const size = opts.size ?? 10
    const [r, g, b] = opts.color ?? [0.1, 0.1, 0.1]
    const x = opts.x ?? margin
    ensurePage(size + 8)
    page.drawText(text, { x, y, font: f, size, color: rgb(r, g, b) })
    y -= size + 6
  }

  const drawLine = (color: [number, number, number] = [0.88, 0.88, 0.88]) => {
    ensurePage(20)
    page.drawLine({
      start: { x: margin, y },
      end:   { x: W - margin, y },
      thickness: 0.5,
      color: rgb(...color),
    })
    y -= 14
  }

  // ── Header bar ──────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: H - 54, width: W, height: 54,
    color: rgb(0.067, 0.067, 0.063),   // #111110
  })
  page.drawText('FRAGEBOGEN', {
    x: margin, y: H - 34,
    font: boldFont, size: 16,
    color: rgb(0.97, 0.97, 0.96),
  })
  page.drawText('Fotonizer', {
    x: W - margin - 52, y: H - 34,
    font, size: 10,
    color: rgb(0.77, 0.65, 0.49),  // #C4A47C
  })
  y = H - 54 - 28

  // ── Meta ────────────────────────────────────────────────────────────────
  drawText(`${questionnaire?.title ?? 'Fragebogen'} – ${clientName}`, { bold: true, size: 15 })
  y -= 2
  drawText(`Eingereicht am: ${submittedAt}`, { size: 9, color: [0.48, 0.46, 0.44] })
  y -= 4
  drawLine()

  // ── Questions & answers ────────────────────────────────────────────────
  const questions: Question[] = questionnaire?.questions ?? []
  const answers = submission.answers as Record<string, string>
  const maxLabelChars = Math.floor(contentW / (10 * 0.52))
  const maxAnswerChars = Math.floor(contentW / (9.5 * 0.52))

  questions.forEach((q, idx) => {
    ensurePage(60)

    // Question label
    const labelLines = wrapText(`${idx + 1}. ${q.label}`, maxLabelChars)
    labelLines.forEach(line => drawText(line, { bold: true, size: 10 }))

    // Answer
    const raw = answers[q.id] ?? ''
    const answer = raw.includes('|||')
      ? raw.split('|||').filter(Boolean).join(', ')
      : raw || '—'

    const answerLines = wrapText(answer, maxAnswerChars)
    answerLines.forEach(line => {
      drawText(line, { size: 9.5, color: [0.33, 0.33, 0.33], x: margin + 12 })
    })
    y -= 6

    // Thin separator between questions (not after last)
    if (idx < questions.length - 1) drawLine()
  })

  // ── Footer ──────────────────────────────────────────────────────────────
  const totalPages = pdfDoc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i)
    p.drawText(`Erstellt mit Fotonizer · Seite ${i + 1} von ${totalPages}`, {
      x: margin, y: 24,
      font, size: 8,
      color: rgb(0.7, 0.7, 0.7),
    })
  }

  const pdfBytes = await pdfDoc.save()
  const safeName = clientName.replace(/[^\w\s\-äöüÄÖÜß]/g, '').trim().replace(/\s+/g, '-')
  const filename = `Fragebogen-${safeName}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
