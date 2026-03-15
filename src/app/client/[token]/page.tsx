import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, daysUntil } from '@/lib/utils'
import {
  FileText, Images, Clock, CheckCircle2, ChevronRight, PenLine,
  Calendar, Sparkles, Camera, Sun, Shirt, MapPin, MessageCircle,
  ArrowRight, Star, Heart
} from 'lucide-react'
import WeatherWidget from '@/components/client-portal/WeatherWidget'
import MoodBoard from '@/components/client-portal/MoodBoard'

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both custom slugs (e.g. "elisa") and raw client_token UUIDs
  let { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email), photographer:photographers(studio_name, full_name, logo_url, plan)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('*, client:clients(full_name, email), photographer:photographers(studio_name, full_name, logo_url, plan)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  if (!project) notFound()

  const client = project.client as { full_name: string; email?: string }
  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as {
    studio_name: string | null; full_name: string; logo_url: string | null; plan: string
  } | null

  const [
    { data: contracts },
    { data: gallery },
    { data: timeline },
  ] = await Promise.all([
    supabase.from('contracts').select('id, title, status').eq('project_id', project.id),
    supabase.from('galleries').select('id, status, view_count, download_count').eq('project_id', project.id).eq('status', 'active').single(),
    supabase.from('timelines').select('id, events').eq('project_id', project.id).single(),
  ])

  let photoCount = 0
  if (gallery) {
    const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true }).eq('gallery_id', gallery.id)
    photoCount = count || 0
  }

  const days = project.shoot_date ? daysUntil(project.shoot_date) : null
  const meetingPoint: string | null = (project as { meeting_point?: string | null }).meeting_point ?? null

  // Portal visibility settings (default all true if not set)
  const rawSections = (project as { portal_sections?: Record<string, boolean> | null }).portal_sections
  const show = {
    contract:   rawSections?.contract   !== false,
    gallery:    rawSections?.gallery    !== false,
    timeline:   rawSections?.timeline   !== false,
    treffpunkt: rawSections?.treffpunkt !== false,
    moodboard:  rawSections?.moodboard  !== false,
    tips:       rawSections?.tips       !== false,
    weather:    rawSections?.weather    !== false,
  }
  const customMessage: string | null = (project as { portal_message?: string | null }).portal_message ?? null

  // Build Google Maps URL from meeting_point (link, coordinates, or address)
  function getMapsUrl(mp: string): string {
    if (mp.startsWith('http')) return mp
    return `https://maps.google.com/?q=${encodeURIComponent(mp)}`
  }
  // Build embed URL for iframe preview
  function getEmbedUrl(mp: string): string {
    const q = mp.startsWith('http')
      ? (() => { try { const u = new URL(mp); return u.searchParams.get('q') || mp } catch { return mp } })()
      : mp
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=16`
  }
  const isDelivered = project.status === 'delivered' || project.status === 'completed'
  const isPostShooting = project.status === 'editing' || isDelivered
  const firstName = client.full_name.split(' ')[0]
  const latestContract = contracts?.[0]
  const contractSigned = latestContract?.status === 'signed'
  const timelineEvents = (timeline?.events as { id: string; time: string; title: string; phase: string }[]) || []
  const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'

  // Projekt Überblick steps
  const projectSteps = [
    {
      key: 'booking',
      label: 'Booking bestätigt',
      done: true,
      icon: '📅',
    },
    {
      key: 'contract',
      label: 'Vertrag unterschrieben',
      done: contractSigned,
      icon: '✍️',
    },
    {
      key: 'shooting',
      label: 'Shooting Tag',
      done: isPostShooting || (days !== null && days < 0),
      icon: '📸',
    },
    {
      key: 'gallery',
      label: 'Galerie Lieferung',
      done: !!gallery,
      icon: '🖼️',
    },
  ]
  const currentStepIdx = projectSteps.filter(s => s.done).length - 1

  // Nächste Schritte
  const nextSteps = [
    {
      key: 'contract',
      label: 'Vertrag unterschreiben',
      done: contractSigned,
      show: !!latestContract,
      href: `/client/${token}/contract`,
      cta: 'Jetzt unterschreiben',
    },
    {
      key: 'moodboard',
      label: 'Moodboard erstellen',
      done: false,
      show: !isPostShooting,
      href: undefined,
      cta: 'Inspirationen hinzufügen',
    },
    {
      key: 'prepare',
      label: 'Shooting vorbereiten',
      done: isPostShooting,
      show: days !== null && days <= 14 && days >= 0,
      href: undefined,
      cta: 'Tipps ansehen',
    },
    {
      key: 'gallery',
      label: 'Galerie ansehen',
      done: false,
      show: !!gallery,
      href: `/client/${token}/gallery`,
      cta: 'Fotos ansehen',
    },
  ].filter(s => s.show)

  // Projekt Timeline events (derived from data)
  const allTimelineEvents = [
    { label: 'Booking bestätigt', done: true, show: true, date: project.created_at ? new Date(project.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : null },
    { label: 'Vertrag gesendet', done: latestContract?.status === 'sent' || latestContract?.status === 'viewed' || contractSigned, show: !!latestContract, date: null },
    { label: 'Vertrag unterschrieben', done: contractSigned, show: !!latestContract, date: null },
    { label: 'Shooting geplant', done: !!project.shoot_date, show: true, date: project.shoot_date ? formatDate(project.shoot_date, 'de') : null },
    { label: 'Shooting stattgefunden', done: isPostShooting || (days !== null && days < 0), show: !!project.shoot_date, date: null },
    { label: 'Galerie verfügbar', done: !!gallery, show: true, date: null },
  ]
  const derivedTimeline = allTimelineEvents.filter(e => e.show)

  // Nachrichten message based on status
  let photographerMessage = {
    emoji: '👋',
    title: `Willkommen in deinem Portal, ${firstName}!`,
    text: `Schön, dass du da bist! Hier findest du alles rund um dein Shooting. Bei Fragen bin ich immer für dich da.`,
  }
  if (days !== null && days <= 7 && days >= 0 && !isPostShooting) {
    photographerMessage = {
      emoji: '🎉',
      title: 'Euer Shooting rückt näher!',
      text: `Noch ${days === 0 ? 'heute' : `${days} ${days === 1 ? 'Tag' : 'Tage'}`} bis zu eurem großen Tag! Vergesst nicht, euer Moodboard zu erstellen und euch vorzubereiten.`,
    }
  } else if (project.status === 'editing') {
    photographerMessage = {
      emoji: '✨',
      title: 'Wir bearbeiten eure Fotos!',
      text: 'Das Shooting war wunderschön! Ich bin gerade dabei, eure Bilder zu bearbeiten. Ihr werdet benachrichtigt, sobald die Galerie fertig ist.',
    }
  } else if (isDelivered && gallery) {
    photographerMessage = {
      emoji: '🎊',
      title: 'Eure Galerie ist fertig!',
      text: 'Ich hoffe, ihr liebt eure Fotos genauso sehr wie ich es tue! Schaut euch die Galerie an und markiert eure Favoriten.',
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto px-5 py-10 space-y-5">

        {/* Studio branding */}
        <div className="flex items-center gap-2 animate-in">
          {photographer?.logo_url ? (
            <img src={photographer.logo_url} alt={studioName} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[19px] font-bold text-white"
              style={{ background: 'var(--accent)' }}>
              {studioName[0]}
            </div>
          )}
          <span className="text-[18px] font-semibold" style={{ color: 'var(--text-muted)' }}>{studioName}</span>
        </div>

        {/* ── GREETING + COUNTDOWN ── */}
        <div className="animate-in-delay-1">
          <h1 className="font-black mb-3" style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', letterSpacing: '-0.035em', lineHeight: 1.05, color: 'var(--text-primary)' }}>
            Hallo, {firstName} 👋
          </h1>

          {/* Shoot date pill */}
          {project.shoot_date && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[19px] font-semibold mb-3"
              style={{
                background: isDelivered ? 'rgba(42,155,104,0.10)' : days === 0 ? 'rgba(196,59,44,0.08)' : 'var(--accent-muted)',
                color: isDelivered ? '#2A9B68' : days === 0 ? '#C43B2C' : 'var(--accent)',
              }}>
              <Calendar className="w-3.5 h-3.5" />
              {isDelivered ? 'Deine Fotos sind fertig! 🎉'
                : days === 0 ? 'Dein Shooting ist heute! 📸'
                : days !== null && days < 0 ? `Shooting war am ${formatDate(project.shoot_date, 'de')}`
                : `Shooting in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`}
            </div>
          )}

          <p className="text-[17px]" style={{ color: 'var(--text-secondary)' }}>
            {project.title}
            {project.shoot_date && (
              <span style={{ color: 'var(--text-muted)' }}> · {formatDate(project.shoot_date, 'de')}</span>
            )}
          </p>

          {/* Weather */}
          {show.weather && project.shoot_date && !isDelivered && days !== null && days >= 0 && days <= 30 && (
            <div className="mt-4">
              <WeatherWidget date={project.shoot_date} location={project.location || 'Deutschland'} />
            </div>
          )}
        </div>

        {/* ── PROJEKT ÜBERBLICK (Stepper) ── */}
        <div className="rounded-2xl p-5 animate-in-delay-1"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Projekt Überblick
            </h2>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-4 top-5 bottom-5 w-0.5" style={{ background: 'var(--border-color)' }} />

            <div className="space-y-3">
              {projectSteps.map((step, i) => {
                const isActive = i === currentStepIdx + 1 && !step.done
                const isPast = step.done
                return (
                  <div key={step.key} className="flex items-center gap-3 relative">
                    {/* Dot */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-[17px]"
                      style={{
                        background: isPast ? 'rgba(42,155,104,0.12)' : isActive ? 'var(--accent-muted)' : 'var(--bg-hover)',
                        border: isPast ? '2px solid #2A9B68' : isActive ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                      }}>
                      {isPast ? '✓' : step.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[19px] font-semibold" style={{
                        color: isPast ? '#2A9B68' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>
                        {step.label}
                      </p>
                      {isActive && (
                        <p className="text-[17px] mt-0.5" style={{ color: 'var(--accent)' }}>Aktueller Schritt</p>
                      )}
                    </div>
                    {isPast && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2A9B68' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── NÄCHSTE SCHRITTE ── */}
        {nextSteps.length > 0 && (
          <div className="rounded-2xl p-5 animate-in-delay-1"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Nächste Schritte
              </h2>
            </div>
            <div className="space-y-2.5">
              {nextSteps.map(step => (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: step.done ? 'rgba(42,155,104,0.12)' : 'var(--accent-muted)',
                      border: step.done ? '1.5px solid #2A9B68' : '1.5px solid var(--accent)',
                    }}>
                    {step.done && <span className="text-[19px]" style={{ color: '#2A9B68' }}>✓</span>}
                  </div>
                  <p className="flex-1 text-[19px] font-medium" style={{
                    color: step.done ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}>
                    {step.label}
                  </p>
                  {!step.done && step.href && (
                    <Link href={step.href}
                      className="text-[17px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {step.cta} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NACHRICHTEN VOM FOTOGRAFEN ── */}
        <div className="rounded-2xl p-5 animate-in-delay-1"
          style={{
            background: 'linear-gradient(135deg, var(--accent-muted) 0%, var(--card-bg) 100%)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[18px]"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {photographerMessage.emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <p className="text-[19px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--accent)' }}>
                  Nachricht von {studioName}
                </p>
              </div>
              <p className="font-bold text-[17px] mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {customMessage ? `Nachricht von ${studioName}` : photographerMessage.title}
              </p>
              <p className="text-[19px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {customMessage ?? photographerMessage.text}
              </p>
            </div>
          </div>
        </div>

        {/* ── CONTRACT CARD ── */}
        {show.contract && latestContract && (
          <Link href={`/client/${token}/contract`}
            className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-1 hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{
              background: contractSigned
                ? 'linear-gradient(90deg, #2A9B68, #3DBA6F)'
                : 'linear-gradient(90deg, var(--accent), #D4B48C)',
            }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: contractSigned ? 'rgba(42,155,104,0.10)' : 'var(--accent-muted)' }}>
                    {contractSigned
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: '#2A9B68' }} />
                      : <PenLine className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
                  </div>
                  <div>
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Vertrag</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {contractSigned ? 'Unterschrieben ✓'
                        : latestContract.status === 'viewed' ? 'Angesehen — bitte unterschreiben'
                        : 'Bereit zur Unterschrift'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!contractSigned && (
                    <span className="text-[17px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      Ausstehend
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              {!contractSigned && (
                <>
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {['draft', 'sent', 'viewed', 'signed'].map((s, i) => {
                        const statuses = ['draft', 'sent', 'viewed', 'signed']
                        const currentIdx = statuses.indexOf(latestContract.status)
                        return (
                          <div key={s} className="flex-1 h-1 rounded-full transition-all"
                            style={{ background: i <= currentIdx ? 'var(--accent)' : 'var(--border-color)' }} />
                        )
                      })}
                    </div>
                    <p className="text-[17px]" style={{ color: 'var(--text-muted)' }}>
                      {latestContract.status === 'draft' ? 'Entwurf' : latestContract.status === 'sent' ? 'Gesendet' : 'Angesehen'}
                    </p>
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-1.5 text-[15.5px] font-bold" style={{ color: 'var(--accent)' }}>
                      <PenLine className="w-3.5 h-3.5" />
                      Jetzt unterschreiben
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Link>
        )}

        {/* ── GALLERY CARD ── */}
        {show.gallery && gallery && (
          <Link href={`/client/${token}/gallery`}
            className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-2 hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), #E8C89C)' }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-muted)' }}>
                    <Images className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Galerie</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {photoCount > 0 ? `${photoCount} ${photoCount === 1 ? 'Foto' : 'Fotos'} bereit` : 'Galerie verfügbar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {photoCount > 0 && (
                    <span className="text-[17px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {photoCount} Fotos
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-1.5 text-[15.5px] font-bold" style={{ color: 'var(--accent)' }}>
                  <Heart className="w-3.5 h-3.5" />
                  Fotos ansehen & Favoriten markieren
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {(gallery.view_count > 0 || gallery.download_count > 0) && (
                <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  {gallery.view_count > 0 && <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>👁 {gallery.view_count} Aufrufe</span>}
                  {gallery.download_count > 0 && <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>⬇️ {gallery.download_count} Downloads</span>}
                </div>
              )}
            </div>
          </Link>
        )}

        {/* ── TREFFPUNKT MAP CARD ── */}
        {show.treffpunkt && meetingPoint && (
          <div className="rounded-2xl overflow-hidden animate-in-delay-2"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #EC4899, #F472B6)' }} />
            <div className="p-5 pb-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(236,72,153,0.10)' }}>
                    <MapPin className="w-4.5 h-4.5" style={{ color: '#EC4899', width: '18px', height: '18px' }} />
                  </div>
                  <div>
                    <p className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Treffpunkt</p>
                    <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Euer genauer Treffpunkt</p>
                  </div>
                </div>
                <a
                  href={getMapsUrl(meetingPoint)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: 'rgba(236,72,153,0.10)', color: '#EC4899' }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  In Maps öffnen
                </a>
              </div>
            </div>
            {/* Map embed */}
            <div className="relative overflow-hidden" style={{ height: '200px' }}>
              <iframe
                src={getEmbedUrl(meetingPoint)}
                width="100%"
                height="200"
                style={{ border: 0, display: 'block' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Treffpunkt Karte"
              />
            </div>
            <div className="px-5 py-3">
              <a
                href={getMapsUrl(meetingPoint)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[14px] font-bold transition-all hover:opacity-80"
                style={{ color: '#EC4899' }}
              >
                <MapPin className="w-3.5 h-3.5" />
                Route in Google Maps anzeigen →
              </a>
            </div>
          </div>
        )}

        {/* ── TIMELINE CARD ── */}
        {show.timeline && timelineEvents.length > 0 && (
          <Link href={`/client/${token}/timeline`}
            className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-3 hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6B7280, #9CA3AF)' }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(107,114,128,0.10)' }}>
                    <Clock className="w-5 h-5" style={{ color: '#6B7280' }} />
                  </div>
                  <div>
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Zeitplan</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {timelineEvents.length} {timelineEvents.length === 1 ? 'Eintrag' : 'Einträge'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0 mt-3" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </Link>
        )}

        {/* ── PROJEKT TIMELINE (inline) ── */}
        <div className="rounded-2xl p-5 animate-in-delay-2"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Projekt Timeline
            </h2>
          </div>
          <div className="relative pl-5">
            <div className="absolute left-1.5 top-1 bottom-1 w-0.5" style={{ background: 'var(--border-color)' }} />
            <div className="space-y-4">
              {derivedTimeline.map((event, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className="absolute -left-5 w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                    style={{
                      background: event.done ? 'var(--accent)' : 'var(--border-color)',
                      border: event.done ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                    }} />
                  <div>
                    <p className="text-[19px] font-semibold" style={{ color: event.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {event.label}
                    </p>
                    {event.date && (
                      <p className="text-[17px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{event.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MOODBOARD ── */}
        {show.moodboard && (
          <div className="animate-in-delay-3">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <h2 className="font-bold text-[19px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Moodboard</h2>
              </div>
              <p className="text-[19px]" style={{ color: 'var(--text-secondary)' }}>
                Teile Inspirationen, Referenzbilder oder Links mit deinem Fotografen — zeige deinen Stil und deine Wünsche.
              </p>
            </div>
            <MoodBoard projectId={project.id} token={token} />
          </div>
        )}

        {/* ── TIPPS FÜR EUER SHOOTING ── */}
        {show.tips && !isPostShooting && (
          <div className="animate-in-delay-3">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="font-bold text-[19px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Tipps für euer Shooting
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Shirt className="w-5 h-5" />, title: 'Was anziehen?', text: 'Wählt Farben, die zueinander passen. Vermeidet große Logos oder Muster.' },
                { icon: <Sun className="w-5 h-5" />, title: 'Beste Uhrzeit', text: 'Die goldene Stunde — kurz nach Sonnenaufgang oder vor Sonnenuntergang.' },
                { icon: <Sparkles className="w-5 h-5" />, title: 'Vorbereitung', text: 'Entspannt euch! Authentische Momente entstehen, wenn ihr euch wohlfühlt.' },
                { icon: <MapPin className="w-5 h-5" />, title: 'Location Tipps', text: 'Wählt einen Ort, der für euch bedeutungsvoll ist — das sieht man in den Fotos.' },
              ].map((tip, i) => (
                <div key={i} className="rounded-xl p-4"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {tip.icon}
                  </div>
                  <p className="font-bold text-[15.5px] mb-1" style={{ color: 'var(--text-primary)' }}>{tip.title}</p>
                  <p className="text-[17.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!latestContract && !gallery && timelineEvents.length === 0 && (
          <div className="text-center py-14 rounded-2xl animate-in-delay-1"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-hover)' }}>
              <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-[16.5px]" style={{ color: 'var(--text-secondary)' }}>Dein Fotograf bereitet noch alles vor.</p>
            <p className="text-[18px] mt-1" style={{ color: 'var(--text-muted)' }}>Schau bald wieder vorbei!</p>
          </div>
        )}

      </div>
    </div>
  )
}
