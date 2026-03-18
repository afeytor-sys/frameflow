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
        replyTo: photographer?.email || undefined,
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

      await resend.emails.send({
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        replyTo: photographer?.email || undefined,
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
