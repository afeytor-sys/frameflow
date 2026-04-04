import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { questionnaireId, projectId } = await req.json()
    if (!questionnaireId || !projectId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const [{ data: questionnaire }, { data: project }, { data: latestSubmission }] = await Promise.all([
      supabase.from('questionnaires').select('title, questions').eq('id', questionnaireId).single(),
      supabase
        .from('projects')
        .select(`
          id,
          photographer:photographers(email, full_name, studio_name),
          client:clients(full_name, email)
        `)
        .eq('id', projectId)
        .single(),
      supabase
        .from('questionnaire_submissions')
        .select('answers')
        .eq('questionnaire_id', questionnaireId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const photographerRaw = Array.isArray(project?.photographer) ? project?.photographer[0] : project?.photographer
    const photographer = photographerRaw as { email?: string | null; full_name?: string | null; studio_name?: string | null } | null
    const clientRaw = Array.isArray(project?.client) ? project?.client[0] : project?.client
    const client = clientRaw as { full_name?: string | null; email?: string | null } | null

    const photographerEmail = photographer?.email
    if (!photographerEmail) {
      console.log(`[notify-submitted] no photographer email for project ${projectId} — skipping`)
      return NextResponse.json({ ok: true, skipped: 'no photographer email' })
    }

    const clientName  = client?.full_name  || 'Dein Kunde'
    const clientEmail = client?.email      || ''
    const questionnaireTitle = questionnaire?.title || 'Fragebogen'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
    const dashboardUrl = `${appUrl}/dashboard/questionnaires/${questionnaireId}`

    // Build answer preview — first 5 questions with non-empty answers
    interface QuestionItem { id: string; label: string }
    const questions: QuestionItem[] = Array.isArray(questionnaire?.questions) ? questionnaire.questions as QuestionItem[] : []
    const submissionAnswers = (latestSubmission?.answers ?? {}) as Record<string, string>
    const previewRows = questions
      .slice(0, 10)
      .map(q => ({ label: q.label, answer: (submissionAnswers[q.id] ?? '').replace(/\|\|\|/g, ', ') }))
      .filter(r => r.answer.trim())
      .slice(0, 5)

    const previewHtml = previewRows.length > 0 ? `
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#7A7670;text-transform:uppercase;letter-spacing:0.06em;">
        Vorschau der Antworten
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;margin-bottom:24px;">
        <tr><td style="padding:12px 20px;">
          ${previewRows.map((r, i) => `
            <div style="padding-bottom:${i < previewRows.length - 1 ? '10px;border-bottom:1px solid #E8E4DC;margin-bottom:10px' : '0'};">
              <p style="margin:0 0 2px;font-size:11px;color:#9A9690;">${r.label}</p>
              <p style="margin:0;font-size:13px;color:#111110;font-weight:600;">${r.answer.length > 120 ? r.answer.slice(0, 120) + '…' : r.answer}</p>
            </div>
          `).join('')}
        </td></tr>
      </table>` : ''

    const { error: resendError } = await resend.emails.send({
      from: `Fotonizer <noreply@fotonizer.com>`,
      to: photographerEmail,
      subject: `Neuer Fragebogen von ${clientName}`,
      html: `<!DOCTYPE html>
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
          <tr><td style="height:3px;background:linear-gradient(90deg,#8B5CF6,#A78BFA,#8B5CF6);"></td></tr>

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#111110;letter-spacing:-0.03em;">Fotonizer</p>
              <p style="margin:4px 0 0;font-size:13px;color:#7A7670;">Neuer Fragebogen eingegangen</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#7A7670;line-height:1.6;">
                Du hast einen neuen ausgefüllten Fragebogen erhalten.
              </p>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F7F4;border-radius:12px;border:1px solid #E8E4DC;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#7A7670;line-height:1.6;">
                      <strong style="color:#111110;">Fragebogen:</strong> ${questionnaireTitle}
                    </p>
                    <p style="margin:0 0 8px;font-size:13px;color:#7A7670;line-height:1.6;">
                      <strong style="color:#111110;">Name:</strong> ${clientName}
                    </p>
                    ${clientEmail ? `<p style="margin:0;font-size:13px;color:#7A7670;line-height:1.6;">
                      <strong style="color:#111110;">E-Mail:</strong> ${clientEmail}
                    </p>` : ''}
                  </td>
                </tr>
              </table>

              ${previewHtml}

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:#111110;color:#F8F7F4;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:-0.01em;">
                      Antworten ansehen →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#B0ACA6;line-height:1.6;text-align:center;">
                Du kannst die Antworten auch direkt im Dashboard herunterladen.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4DC;"></div></td></tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px 28px;">
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
</html>`,
    })

    if (resendError) {
      console.error('[notify-submitted] Resend error:', JSON.stringify(resendError))
      return NextResponse.json({ error: 'Email failed' }, { status: 500 })
    }

    console.log(`[notify-submitted] email sent to ${photographerEmail} for questionnaire ${questionnaireId}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notify-submitted]', err)
    // Return 200 so the client doesn't surface errors to the submitting user
    return NextResponse.json({ ok: true })
  }
}
