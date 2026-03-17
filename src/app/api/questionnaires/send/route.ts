import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { questionnaireId, projectId, clientEmail, clientName, clientToken, customSubject, customMessage } = await req.json()

    if (!questionnaireId || !clientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch questionnaire
    const { data: q, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('id', questionnaireId)
      .single()

    if (error || !q) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 })
    }

    // Fetch project for portal URL
    const { data: project } = await supabase
      .from('projects')
      .select('client_url, custom_slug, client_token, photographer:photographers(studio_name, full_name)')
      .eq('id', projectId)
      .single()

    const token = (project as { custom_slug?: string; client_token?: string } | null)?.custom_slug
      || (project as { custom_slug?: string; client_token?: string } | null)?.client_token
      || clientToken

    const portalUrl = token
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'}/client/${token}/questionnaire`
      : null

    const photographer = Array.isArray(project?.photographer) ? project.photographer[0] : project?.photographer
    const studioName = (photographer as { studio_name?: string; full_name?: string } | null)?.studio_name
      || (photographer as { studio_name?: string; full_name?: string } | null)?.full_name
      || 'Your photographer'

    // Convert plain text message to HTML paragraphs
    const messageHtml = customMessage
      ? customMessage
          .split('\n')
          .map((line: string) => line.trim() === '' ? '<br>' : `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">${line}</p>`)
          .join('')
      : `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">
          ${studioName} has prepared a questionnaire for you: <strong style="color:#1A1A1A;">${q.title}</strong>
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">
          Bitte nimm dir kurz Zeit, die Fragen zu beantworten — das hilft uns, dein Shooting perfekt vorzubereiten.
        </p>`

    const emailSubject = customSubject || `📋 ${q.title} — von ${studioName}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px 40px;">

    <!-- Logo / Studio -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:8px 18px;border:1px solid #E8E0D8;">
        <div style="width:28px;height:28px;border-radius:50%;background:#C4A47C;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px;">
          ${studioName[0]}
        </div>
        <span style="font-size:14px;font-weight:600;color:#6B5E4E;">${studioName}</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <!-- Top accent -->
      <div style="height:4px;background:linear-gradient(90deg,#8B5CF6,#A78BFA);"></div>

      <div style="padding:36px 32px;">
        <!-- Icon -->
        <div style="width:52px;height:52px;border-radius:14px;background:rgba(139,92,246,0.10);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <span style="font-size:24px;">📋</span>
        </div>

        <!-- Custom message -->
        <div style="margin-bottom:28px;">
          ${messageHtml}
        </div>

        ${portalUrl ? `
        <!-- CTA Button -->
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${portalUrl}"
            style="display:inline-block;background:#8B5CF6;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-0.01em;box-shadow:0 4px 16px rgba(139,92,246,0.30);">
            Fill out questionnaire →
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#9CA3AF;margin:0 0 24px;">
          Or open this link: <a href="${portalUrl}" style="color:#8B5CF6;">${portalUrl}</a>
        </p>
        ` : ''}

        <div style="border-top:1px solid #F3F4F6;padding-top:20px;">
          <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;">
            Bei Fragen antworte einfach auf diese E-Mail.<br>
            <strong style="color:#6B7280;">${studioName}</strong>
          </p>
        </div>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#C4B5A0;margin-top:24px;">
      Powered by Fotonizer
    </p>
  </div>
</body>
</html>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@fotonizer.com',
      to: clientEmail,
      subject: emailSubject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Questionnaire send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
