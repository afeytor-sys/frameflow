import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// In-memory throttle: prevent duplicate in-app notifications for the same
// photographer + type + gallery within a short window.
// Key: `${photographerId}:${type}:${galleryId}` → timestamp of last insert
const throttleCache = new Map<string, number>()

// Throttle windows (ms)
const THROTTLE_MS: Record<string, number> = {
  photo_downloaded:   5 * 60 * 1000, // 5 min — avoid spam when client downloads many photos
  gallery_viewed:     10 * 60 * 1000, // 10 min — avoid repeated view pings
  gallery_downloaded: 0,              // always notify
  favorite_marked:    0,              // always notify
}

function isThrottled(key: string, windowMs: number): boolean {
  if (windowMs <= 0) return false
  const last = throttleCache.get(key)
  if (!last) return false
  return Date.now() - last < windowMs
}

function setThrottle(key: string): void {
  throttleCache.set(key, Date.now())
  // Clean up old entries every 100 inserts to avoid memory leak
  if (throttleCache.size > 500) {
    const cutoff = Date.now() - 15 * 60 * 1000
    for (const [k, v] of throttleCache.entries()) {
      if (v < cutoff) throttleCache.delete(k)
    }
  }
}

// POST /api/galleries/[galleryId]/notify
// Called from client-side when a client downloads a photo, downloads the gallery, or marks a favorite
// Body: { type: 'photo_downloaded' | 'gallery_downloaded' | 'favorite_marked' | 'gallery_viewed', clientName?: string, photoName?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params
  const body = await request.json().catch(() => ({}))
  const { type, clientName, photoName } = body as {
    type: 'photo_downloaded' | 'gallery_downloaded' | 'favorite_marked' | 'gallery_viewed'
    clientName?: string
    photoName?: string
  }

  if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

  const supabase = createServiceClient()

  // Get gallery → project → photographer
  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, project_id')
    .eq('id', galleryId)
    .single()

  if (!gallery) {
    console.error('[notify] Gallery not found:', galleryId)
    return NextResponse.json({ ok: false })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, photographer_id, client:clients(full_name)')
    .eq('id', gallery.project_id)
    .single()

  if (!project) return NextResponse.json({ ok: false })

  const photographerId = project.photographer_id
  const resolvedClientName = clientName
    || (Array.isArray(project.client) ? project.client[0]?.full_name : (project.client as { full_name: string } | null)?.full_name)
    || 'Client'

  // ── Throttle check ───────────────────────────────────────────────────────
  const throttleKey = `${photographerId}:${type}:${galleryId}`
  const windowMs = THROTTLE_MS[type] ?? 0
  if (isThrottled(throttleKey, windowMs)) {
    return NextResponse.json({ ok: true, throttled: true })
  }

  // Get notification settings
  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('photographer_id', photographerId)
    .single()

  // Get photographer email
  const { data: photographer } = await supabase
    .from('photographers')
    .select('email, full_name, studio_name')
    .eq('id', photographerId)
    .single()

  // ── Notification config ──────────────────────────────────────────────────
  type NotifConfig = {
    inappKey: string
    emailKey: string
    notifType: string
    titleDE: string
    titleEN: string
    bodyDE: string
    bodyEN: string
    emailSubject: string
    emailBody: string
  }

  const configs: Record<string, NotifConfig> = {
    photo_downloaded: {
      inappKey: 'notify_inapp_photo_downloaded',
      emailKey: 'notify_email_photo_downloaded',
      notifType: 'photo_downloaded',
      titleDE: `Foto heruntergeladen: ${resolvedClientName}`,
      titleEN: `Photo downloaded: ${resolvedClientName}`,
      bodyDE: photoName ? `"${photoName}" wurde heruntergeladen.` : `Ein Foto aus "${project.title}" wurde heruntergeladen.`,
      bodyEN: photoName ? `"${photoName}" was downloaded.` : `A photo from "${project.title}" was downloaded.`,
      emailSubject: `📥 Foto heruntergeladen — ${resolvedClientName}`,
      emailBody: `<p>${resolvedClientName} hat ${photoName ? `das Foto <strong>"${photoName}"</strong>` : 'ein Foto'} aus der Galerie <strong>${project.title}</strong> heruntergeladen.</p>`,
    },
    gallery_downloaded: {
      inappKey: 'notify_inapp_gallery_downloaded',
      emailKey: 'notify_email_gallery_downloaded',
      notifType: 'gallery_downloaded',
      titleDE: `Galerie heruntergeladen: ${resolvedClientName}`,
      titleEN: `Gallery downloaded: ${resolvedClientName}`,
      bodyDE: `Die gesamte Galerie "${project.title}" wurde heruntergeladen.`,
      bodyEN: `The full gallery "${project.title}" was downloaded.`,
      emailSubject: `📦 Galerie heruntergeladen — ${resolvedClientName}`,
      emailBody: `<p>${resolvedClientName} hat die gesamte Galerie <strong>${project.title}</strong> heruntergeladen.</p>`,
    },
    favorite_marked: {
      inappKey: 'notify_inapp_favorite_marked',
      emailKey: 'notify_email_favorite_marked',
      notifType: 'favorite_marked',
      titleDE: `Favorit markiert: ${resolvedClientName}`,
      titleEN: `Favorite marked: ${resolvedClientName}`,
      bodyDE: `${resolvedClientName} hat ein Foto in "${project.title}" als Favorit markiert.`,
      bodyEN: `${resolvedClientName} marked a photo in "${project.title}" as favorite.`,
      emailSubject: `❤️ Neuer Favorit — ${resolvedClientName}`,
      emailBody: `<p>${resolvedClientName} hat ein Foto in der Galerie <strong>${project.title}</strong> als Favorit markiert.</p>`,
    },
    gallery_viewed: {
      inappKey: 'notify_inapp_gallery_viewed',
      emailKey: 'notify_email_gallery_viewed',
      notifType: 'gallery_viewed',
      titleDE: `Galerie geöffnet: ${resolvedClientName}`,
      titleEN: `Gallery viewed: ${resolvedClientName}`,
      bodyDE: `${resolvedClientName} hat die Galerie "${project.title}" geöffnet.`,
      bodyEN: `${resolvedClientName} opened the gallery "${project.title}".`,
      emailSubject: `👁️ Galerie geöffnet — ${resolvedClientName}`,
      emailBody: `<p>${resolvedClientName} hat die Galerie <strong>${project.title}</strong> geöffnet.</p>`,
    },
  }

  const cfg = configs[type]
  if (!cfg) return NextResponse.json({ ok: false })

  // Default to true for in-app, false for email (except gallery_downloaded which defaults true)
  const defaultEmail = type === 'gallery_downloaded' ? true : false
  const inappEnabled = settings ? (settings[cfg.inappKey] ?? true) : true
  const emailEnabled = settings ? (settings[cfg.emailKey] ?? defaultEmail) : defaultEmail

  // ── Create in-app notification ───────────────────────────────────────────
  if (inappEnabled) {
    const insertPayload = {
      photographer_id: photographerId,
      type: cfg.notifType,
      title_de: cfg.titleDE,
      title_en: cfg.titleEN,
      body_de: cfg.bodyDE,
      body_en: cfg.bodyEN,
      project_id: project.id,
      client_name: resolvedClientName,
    }
    console.log('[notify] Inserting notification:', JSON.stringify(insertPayload))
    const { error: insertError, data: insertData } = await supabase.from('notifications').insert(insertPayload).select('id').single()
    if (insertError) {
      console.error('[notify] ❌ Failed to insert notification:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        photographerId,
        type: cfg.notifType,
      })
    } else {
      console.log('[notify] ✅ Notification inserted:', insertData?.id)
      // Only set throttle after successful insert
      setThrottle(throttleKey)
    }
  }

  // ── Send email to photographer ───────────────────────────────────────────
  if (emailEnabled && photographer?.email) {
    const studioName = photographer.studio_name || photographer.full_name || 'Fotonizer'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'

    await resend.emails.send({
      from: `Fotonizer <noreply@fotonizer.com>`,
      to: photographer.email,
      subject: cfg.emailSubject,
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
      <h2 style="font-size: 20px; font-weight: 700; color: #1A1A18; margin: 0 0 16px; letter-spacing: -0.02em;">${cfg.emailSubject}</h2>
      ${cfg.emailBody}
      <p style="color: #7A7670; font-size: 14px; margin-top: 8px;">Projekt: <strong style="color: #1A1A18;">${project.title}</strong></p>
      <div style="margin-top: 24px;">
        <a href="${appUrl}/dashboard/projects/${project.id}" style="display: inline-block; background: #1A1A18; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">Projekt öffnen →</a>
      </div>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #F0EDE8;">
      <p style="color: #B0ACA6; font-size: 12px; margin: 0;">Du erhältst diese E-Mail, weil du Benachrichtigungen für ${studioName} aktiviert hast. <a href="${appUrl}/dashboard/settings" style="color: #C4A47C;">Einstellungen ändern</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    }).catch((err) => {
      console.error('[notify] Failed to send email:', err)
    })
  }

  return NextResponse.json({ ok: true })
}
