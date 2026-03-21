import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { reminder7dEmail, reminder1dEmail } from '@/lib/automationEmails'

const resend = new Resend(process.env.RESEND_API_KEY)

// Called daily by Vercel Cron: vercel.json → { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 8 * * *" }] }
// Also protected by CRON_SECRET header
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const in7days = new Date(today)
  in7days.setDate(in7days.getDate() + 7)

  const in1day = new Date(today)
  in1day.setDate(in1day.getDate() + 1)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  // Fetch projects with shoot_date in 7 days (reminder not yet sent, reminders not disabled)
  const { data: projects7d } = await supabase
    .from('projects')
    .select(`
      id, title, shoot_date, client_url, portal_locale, reminders_disabled, reminder_7d_sent,
      client:clients(full_name, email),
      photographer:photographers(id, studio_name, full_name, email, locale)
    `)
    .eq('shoot_date', fmt(in7days))
    .eq('reminder_7d_sent', false)
    .eq('reminders_disabled', false)
    .not('client_url', 'is', null)

  // Fetch projects with shoot_date in 1 day
  const { data: projects1d } = await supabase
    .from('projects')
    .select(`
      id, title, shoot_date, client_url, portal_locale, reminders_disabled, reminder_1d_sent,
      client:clients(full_name, email),
      photographer:photographers(id, studio_name, full_name, email, locale)
    `)
    .eq('shoot_date', fmt(in1day))
    .eq('reminder_1d_sent', false)
    .eq('reminders_disabled', false)
    .not('client_url', 'is', null)

  let sent7d = 0
  let sent1d = 0
  const errors: string[] = []

  // ── Process 7-day reminders ──────────────────────────────────────────────
  for (const project of (projects7d ?? [])) {
    try {
      const photographer = Array.isArray(project.photographer) ? project.photographer[0] : project.photographer
      const client = Array.isArray(project.client) ? project.client[0] : project.client

      if (!client?.email) continue

      // Check automation settings
      const { data: settings } = await supabase
        .from('automation_settings')
        .select('reminder_7d')
        .eq('photographer_id', photographer.id)
        .single()

      // Default true if no settings row yet
      if (settings && settings.reminder_7d === false) continue

      const locale = (project.portal_locale || photographer?.locale || 'de') as 'de' | 'en'
      const studioName = photographer?.studio_name || photographer?.full_name || 'Your photographer'
      const notifEmail7d = (photographer as any)?.notification_email || photographer?.email || undefined
      const shootDateFormatted = new Date(project.shoot_date).toLocaleDateString(
        locale === 'de' ? 'de-DE' : 'en-US',
        { weekday: 'long', day: 'numeric', month: 'long' }
      )

      const { subject, html } = reminder7dEmail({
        studioName,
        clientName: client.full_name,
        projectTitle: project.title,
        portalUrl: project.client_url,
        shootDate: shootDateFormatted,
        locale,
      })

      await resend.emails.send({
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        replyTo: notifEmail7d,
        bcc: notifEmail7d,
        to: client.email,
        subject,
        html,
      })

      // Mark as sent
      await supabase
        .from('projects')
        .update({ reminder_7d_sent: true })
        .eq('id', project.id)

      // Create in-app notification for photographer
      await supabase.from('notifications').insert({
        photographer_id: photographer.id,
        type: 'reminder_sent',
        title_de: `Erinnerung gesendet: ${client.full_name}`,
        title_en: `Reminder sent: ${client.full_name}`,
        body_de: `7-Tage-Erinnerung für ${project.title} wurde gesendet.`,
        body_en: `7-day reminder for ${project.title} was sent.`,
        project_id: project.id,
        client_name: client.full_name,
      })

      sent7d++
    } catch (e) {
      errors.push(`7d project ${project.id}: ${e}`)
    }
  }

  // ── Process 1-day reminders ──────────────────────────────────────────────
  for (const project of (projects1d ?? [])) {
    try {
      const photographer = Array.isArray(project.photographer) ? project.photographer[0] : project.photographer
      const client = Array.isArray(project.client) ? project.client[0] : project.client

      if (!client?.email) continue

      const { data: settings } = await supabase
        .from('automation_settings')
        .select('reminder_1d')
        .eq('photographer_id', photographer.id)
        .single()

      if (settings && settings.reminder_1d === false) continue

      const locale = (project.portal_locale || photographer?.locale || 'de') as 'de' | 'en'
      const studioName = photographer?.studio_name || photographer?.full_name || 'Your photographer'
      const shootDateFormatted = new Date(project.shoot_date).toLocaleDateString(
        locale === 'de' ? 'de-DE' : 'en-US',
        { weekday: 'long', day: 'numeric', month: 'long' }
      )

      const { subject, html } = reminder1dEmail({
        studioName,
        clientName: client.full_name,
        projectTitle: project.title,
        portalUrl: project.client_url,
        shootDate: shootDateFormatted,
        locale,
      })

      const notifEmail1d = (photographer as any)?.notification_email || photographer?.email || undefined
      await resend.emails.send({
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        replyTo: notifEmail1d,
        bcc: notifEmail1d,
        to: client.email,
        subject,
        html,
      })

      await supabase
        .from('projects')
        .update({ reminder_1d_sent: true })
        .eq('id', project.id)

      await supabase.from('notifications').insert({
        photographer_id: photographer.id,
        type: 'reminder_sent',
        title_de: `Erinnerung gesendet: ${client.full_name}`,
        title_en: `Reminder sent: ${client.full_name}`,
        body_de: `1-Tage-Erinnerung für ${project.title} wurde gesendet.`,
        body_en: `1-day reminder for ${project.title} was sent.`,
        project_id: project.id,
        client_name: client.full_name,
      })

      // ── Email reminder to photographer (if enabled) ──────────────
      const { data: notifSettings } = await supabase
        .from('automation_settings')
        .select('notify_email_shoot_reminder_photographer')
        .eq('photographer_id', photographer.id)
        .single()

      const sendToPhotographer = notifSettings?.notify_email_shoot_reminder_photographer ?? true

      if (sendToPhotographer && photographer?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'
        const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
        await resend.emails.send({
          from: `Fotonizer <noreply@fotonizer.com>`,
          to: photographer.email,
          subject: `📅 Morgen: Shooting mit ${client.full_name}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F7F4; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08);">
    <div style="background: #1A1A18; padding: 24px 32px;">
      <p style="color: #C4A47C; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 0;">Fotonizer</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #1A1A18; margin: 0 0 8px; letter-spacing: -0.02em;">📅 Shooting morgen</h2>
      <p style="color: #7A7670; font-size: 14px; margin: 0 0 20px;">Erinnerung für dich, ${studioName}</p>
      <div style="background: #F8F7F4; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #7A7670;">Kunde</p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #1A1A18;">${client.full_name}</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #7A7670;">Projekt</p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #1A1A18;">${project.title}</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #7A7670;">Datum</p>
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #C4A47C;">${shootDateFormatted}</p>
      </div>
      <a href="${appUrl}/dashboard/projects/${project.id}" style="display: inline-block; background: #1A1A18; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">Projekt öffnen →</a>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #F0EDE8;">
      <p style="color: #B0ACA6; font-size: 12px; margin: 0;">Du erhältst diese E-Mail als Shooting-Erinnerung. <a href="${appUrl}/dashboard/settings" style="color: #C4A47C;">Einstellungen ändern</a></p>
    </div>
  </div>
</body>
</html>`.trim(),
        }).catch(() => {})
      }

      sent1d++
    } catch (e) {
      errors.push(`1d project ${project.id}: ${e}`)
    }
  }

  return NextResponse.json({
    success: true,
    sent7d,
    sent1d,
    errors: errors.length > 0 ? errors : undefined,
  })
}
