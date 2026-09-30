import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { galleryExpiringEmail } from '@/lib/automationEmails'

const resend = new Resend(process.env.RESEND_API_KEY)

// Called daily by Vercel Cron: warns the client 7 days before a gallery's
// expires_at, once, then marks expiry_warning_sent_at so it never repeats.
// Also protected by CRON_SECRET header.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const in7daysStart = new Date(today)
  in7daysStart.setUTCDate(in7daysStart.getUTCDate() + 7)
  const in7daysEnd = new Date(in7daysStart)
  in7daysEnd.setUTCDate(in7daysEnd.getUTCDate() + 1)

  const { data: galleries } = await supabase
    .from('galleries')
    .select(`
      id, title, custom_slug, share_token, client_email, expires_at,
      project:projects(id, title, client_url, portal_locale, client:clients(full_name, email)),
      photographer:photographers(id, studio_name, full_name, email, notification_email, locale)
    `)
    .gte('expires_at', in7daysStart.toISOString())
    .lt('expires_at', in7daysEnd.toISOString())
    .is('expiry_warning_sent_at', null)

  let sent = 0
  const errors: string[] = []

  for (const gallery of (galleries ?? [])) {
    try {
      const project = Array.isArray(gallery.project) ? gallery.project[0] : gallery.project
      const photographer = Array.isArray(gallery.photographer) ? gallery.photographer[0] : gallery.photographer
      const client = project ? (Array.isArray(project.client) ? project.client[0] : project.client) : null

      const clientEmail = client?.email || gallery.client_email
      if (!clientEmail || !photographer) continue

      const clientName = client?.full_name || gallery.title
      const locale = (project?.portal_locale || photographer.locale || 'de') as 'de' | 'en'
      const studioName = photographer.studio_name || photographer.full_name || 'Fotonizer'
      const galleryUrl = project?.client_url
        ? `${project.client_url}/gallery`
        : `${appUrl}/gallery/${gallery.custom_slug || gallery.share_token}`

      const expiryDateFormatted = new Date(gallery.expires_at as string).toLocaleDateString(
        locale === 'de' ? 'de-DE' : 'en-US',
        { day: '2-digit', month: 'long', year: 'numeric' }
      )

      const { subject, html } = galleryExpiringEmail({
        studioName,
        clientName,
        galleryTitle: gallery.title,
        galleryUrl,
        expiryDateFormatted,
        locale,
      })

      const notifEmail = photographer.notification_email || photographer.email || undefined
      await resend.emails.send({
        from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
        replyTo: notifEmail,
        bcc: notifEmail,
        to: clientEmail,
        subject,
        html,
      })

      await supabase
        .from('galleries')
        .update({ expiry_warning_sent_at: new Date().toISOString() })
        .eq('id', gallery.id)

      await supabase.from('notifications').insert({
        photographer_id: photographer.id,
        type: 'gallery_expiry_warning_sent',
        title_de: `Ablauf-Erinnerung gesendet: ${gallery.title}`,
        title_en: `Expiry warning sent: ${gallery.title}`,
        body_de: `${clientName} wurde informiert, dass "${gallery.title}" am ${expiryDateFormatted} abläuft.`,
        body_en: `${clientName} was notified that "${gallery.title}" expires on ${expiryDateFormatted}.`,
        client_name: clientName,
      })

      sent++
    } catch (e) {
      errors.push(`gallery ${gallery.id}: ${e}`)
    }
  }

  return NextResponse.json({ success: true, sent, errors: errors.length > 0 ? errors : undefined })
}
