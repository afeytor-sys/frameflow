import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, daysUntil } from '@/lib/utils'
import {
  FileText, Images, Clock, CheckCircle2, ChevronRight, PenLine,
  Calendar, Sparkles, Camera, Sun, Shirt, MapPin, MessageCircle,
  ArrowRight, Star, Heart, ClipboardList, Link2, ExternalLink,
} from 'lucide-react'
import WeatherWidget from '@/components/client-portal/WeatherWidget'
import MoodBoard from '@/components/client-portal/MoodBoard'
import GalleryShareButton from '@/components/client-portal/GalleryShareButton'

// ── Portal translations ──────────────────────────────────────────────────────
type Locale = 'de' | 'en'

const PT = {
  de: {
    hello: (name: string) => `Hallo, ${name} 👋`,
    shootToday: 'Dein Shooting ist heute! 📸',
    shootDone: (date: string) => `Shooting war am ${date}`,
    shootIn: (days: number) => `Shooting in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
    photosReady: 'Deine Fotos sind fertig! 🎉',
    messageFrom: (studio: string) => `Nachricht von ${studio}`,
    projectOverview: 'Projektübersicht',
    nextSteps: 'Nächste Schritte',
    currentStep: 'Aktueller Schritt',
    steps: {
      booking: 'Buchung bestätigt',
      contract: 'Vertrag unterschrieben',
      questionnaire: 'Fragebogen ausgefüllt',
      shooting: 'Shooting-Tag',
      gallery: 'Galerie-Lieferung',
    },
    contract: {
      title: 'Vertrag',
      signed: 'Unterschrieben ✓',
      viewed: 'Angesehen — bitte unterschreiben',
      ready: 'Bereit zur Unterschrift',
      pending: 'Ausstehend',
      signNow: 'Jetzt unterschreiben',
    },
    questionnaire: {
      title: 'Fragebogen',
      completed: 'Ausgefüllt ✓ — Antworten ansehen',
      pending: 'Bitte ausfüllen — hilft bei der Vorbereitung',
      pendingBadge: 'Ausstehend',
      fillNow: 'Jetzt ausfüllen',
      viewAnswers: 'Antworten ansehen',
    },
    timeline: {
      title: 'Zeitplan',
      entries: (n: number) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`,
    },
    gallery: {
      title: 'Galerie',
      photos: (n: number) => `${n} ${n === 1 ? 'Foto' : 'Fotos'} bereit`,
      available: 'Galerie verfügbar',
      viewFavs: 'Fotos ansehen & Favoriten markieren',
      views: (n: number) => `👁 ${n} Aufrufe`,
      downloads: (n: number) => `⬇️ ${n} Downloads`,
    },
    treffpunkt: {
      title: 'Treffpunkt',
      subtitle: 'Euer genauer Treffpunkt',
      openMaps: 'In Maps öffnen',
      routeMaps: 'Route in Google Maps anzeigen →',
    },
    links: {
      title: 'Links',
      subtitle: 'Von deinem Fotografen',
    },
    moodboard: {
      title: 'Moodboard',
      desc: 'Teile Inspirationen, Referenzbilder oder Links mit deinem Fotografen — zeige deinen Stil und deine Wünsche.',
    },
    tips: {
      title: 'Tipps für dein Shooting',
      items: [
        { title: 'Was anziehen?', text: 'Wähle Farben, die sich ergänzen. Vermeide große Logos oder Muster.' },
        { title: 'Beste Uhrzeit', text: 'Die goldene Stunde — kurz nach Sonnenaufgang oder vor Sonnenuntergang.' },
        { title: 'Vorbereitung', text: 'Entspann dich! Authentische Momente entstehen, wenn du dich wohlfühlst.' },
        { title: 'Location-Tipps', text: 'Wähle einen Ort, der dir bedeutsam ist — das sieht man auf den Fotos.' },
      ],
    },
    empty: {
      text: 'Dein Fotograf bereitet noch alles vor.',
      sub: 'Schau bald wieder vorbei!',
    },
    nextStepsCta: {
      contract: 'Jetzt unterschreiben',
      moodboard: 'Inspirationen hinzufügen',
      prepare: 'Tipps ansehen',
      gallery: 'Fotos ansehen',
    },
    messages: {
      welcome: (name: string) => ({ emoji: '👋', title: `Willkommen in deinem Portal, ${name}!`, text: 'Hier findest du alles rund um dein Shooting. Melde dich gerne, wenn du Fragen hast.' }),
      soon: (days: number) => ({ emoji: '🎉', title: 'Dein Shooting steht bevor!', text: `Nur noch ${days === 0 ? 'heute' : `${days} ${days === 1 ? 'Tag' : 'Tage'}`} bis zu deinem großen Tag! Vergiss nicht, dein Moodboard zu erstellen und dich vorzubereiten.` }),
      editing: { emoji: '✨', title: 'Wir bearbeiten eure Fotos!', text: 'Das Shooting war wunderschön! Ich bearbeite gerade eure Fotos. Du wirst benachrichtigt, sobald die Galerie fertig ist.' },
      delivered: { emoji: '🎊', title: 'Eure Galerie ist fertig!', text: 'Ich hoffe, ihr liebt eure Fotos genauso sehr wie ich es tue! Schaut euch die Galerie an und markiert eure Favoriten.' },
    },
  },
  en: {
    hello: (name: string) => `Hello, ${name} 👋`,
    shootToday: 'Your shoot is today! 📸',
    shootDone: (date: string) => `Shoot was on ${date}`,
    shootIn: (days: number) => `Shoot in ${days} ${days === 1 ? 'day' : 'days'}`,
    photosReady: 'Your photos are ready! 🎉',
    messageFrom: (studio: string) => `Message from ${studio}`,
    projectOverview: 'Project Overview',
    nextSteps: 'Next Steps',
    currentStep: 'Current step',
    steps: {
      booking: 'Booking confirmed',
      contract: 'Contract signed',
      questionnaire: 'Questionnaire completed',
      shooting: 'Shooting day',
      gallery: 'Gallery delivery',
    },
    contract: {
      title: 'Contract',
      signed: 'Signed ✓',
      viewed: 'Viewed — please sign',
      ready: 'Ready to sign',
      pending: 'Pending',
      signNow: 'Sign now',
    },
    questionnaire: {
      title: 'Questionnaire',
      completed: 'Completed ✓ — View answers',
      pending: 'Please fill out — helps with preparation',
      pendingBadge: 'Pending',
      fillNow: 'Fill out now',
      viewAnswers: 'View answers',
    },
    timeline: {
      title: 'Timeline',
      entries: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,
    },
    gallery: {
      title: 'Gallery',
      photos: (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'} ready`,
      available: 'Gallery available',
      viewFavs: 'View photos & mark favorites',
      views: (n: number) => `👁 ${n} views`,
      downloads: (n: number) => `⬇️ ${n} downloads`,
    },
    treffpunkt: {
      title: 'Meeting Point',
      subtitle: 'Your exact meeting point',
      openMaps: 'Open in Maps',
      routeMaps: 'Show route in Google Maps →',
    },
    links: {
      title: 'Links',
      subtitle: 'From your photographer',
    },
    moodboard: {
      title: 'Moodboard',
      desc: 'Share inspirations, reference images or links with your photographer — show your style and wishes.',
    },
    tips: {
      title: 'Tips for your shoot',
      items: [
        { title: 'What to wear?', text: 'Choose colors that complement each other. Avoid large logos or patterns.' },
        { title: 'Best time of day', text: 'The golden hour — shortly after sunrise or before sunset.' },
        { title: 'Preparation', text: 'Relax! Authentic moments happen when you feel comfortable.' },
        { title: 'Location tips', text: 'Choose a place that is meaningful to you — it shows in the photos.' },
      ],
    },
    empty: {
      text: 'Your photographer is still preparing everything.',
      sub: 'Check back soon!',
    },
    nextStepsCta: {
      contract: 'Sign now',
      moodboard: 'Add inspirations',
      prepare: 'View tips',
      gallery: 'View photos',
    },
    messages: {
      welcome: (name: string) => ({ emoji: '👋', title: `Welcome to your portal, ${name}!`, text: "Here you'll find everything about your shoot. Feel free to reach out if you have any questions." }),
      soon: (days: number) => ({ emoji: '🎉', title: 'Your shoot is coming up!', text: `Only ${days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'}`} until your big day! Don't forget to create your moodboard and get prepared.` }),
      editing: { emoji: '✨', title: "We're editing your photos!", text: 'The shoot was wonderful! I am currently editing your photos. You will be notified once the gallery is ready.' },
      delivered: { emoji: '🎊', title: 'Your gallery is ready!', text: "I hope you love your photos as much as I do! Check out the gallery and mark your favorites." },
    },
  },
}

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both custom slugs and raw client_token UUIDs
  let { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email), photographer:photographers(studio_name, full_name, logo_url, plan, locale)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('*, client:clients(full_name, email), photographer:photographers(studio_name, full_name, logo_url, plan, locale)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  if (!project) notFound()

  const client = project.client as { full_name: string; email?: string }
  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as {
    studio_name: string | null; full_name: string; logo_url: string | null; plan: string; locale?: string | null
  } | null

  // ── Resolve portal locale: project override → photographer locale → 'de' ──
  const portalLocale: Locale = (
    (project as { portal_locale?: string | null }).portal_locale ||
    photographer?.locale ||
    'de'
  ) as Locale
  const t = PT[portalLocale] ?? PT.de

  const [
    { data: contracts },
    { data: gallery },
    { data: timeline },
    { data: questionnaire },
    { data: questionnaireSubmission },
  ] = await Promise.all([
    supabase.from('contracts').select('id, title, status').eq('project_id', project.id),
    supabase.from('galleries').select('id, status, view_count, download_count, password').eq('project_id', project.id).eq('status', 'active').single(),
    supabase.from('timelines').select('id, events').eq('project_id', project.id).single(),
    supabase.from('questionnaires').select('id, sent_at').eq('project_id', project.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('questionnaire_submissions').select('id').eq('project_id', project.id).limit(1).single(),
  ])

  const questionnaireSubmitted = !!questionnaireSubmission

  let photoCount = 0
  if (gallery) {
    const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true }).eq('gallery_id', gallery.id)
    photoCount = count || 0
  }

  const days = project.shoot_date ? daysUntil(project.shoot_date) : null
  // Parse meeting_point: supports legacy string OR JSON array
  type MeetingLocation = { label: string; url: string }
  function parseMeetingLocations(raw: string | null): MeetingLocation[] {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((l: MeetingLocation) => l.url?.trim())
    } catch {}
    return [{ label: '', url: raw }]
  }
  const meetingLocations = parseMeetingLocations((project as { meeting_point?: string | null }).meeting_point ?? null)
  const meetingPoint: string | null = meetingLocations.length > 0 ? meetingLocations[0].url : null
  const portalPassword: string | null = (project as { portal_password?: string | null }).portal_password ?? null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frameflow.app'
  const publicGalleryUrl = `${baseUrl}/gallery/${token}`
  const portalLinks = ((project as { portal_links?: { label: string; url: string }[] | null }).portal_links ?? []).filter(l => l.url?.trim())

  // Portal visibility settings
  const rawSections = (project as { portal_sections?: Record<string, boolean> | null }).portal_sections
  const show = {
    contract:      rawSections?.contract      !== false,
    gallery:       rawSections?.gallery       !== false,
    timeline:      rawSections?.timeline      !== false,
    treffpunkt:    rawSections?.treffpunkt    !== false,
    moodboard:     rawSections?.moodboard     === true,
    tips:          rawSections?.tips          !== false,
    weather:       rawSections?.weather       !== false,
    questionnaire: rawSections?.questionnaire !== false,
    invoice:       rawSections?.invoice       === true,
  }
  const customMessage: string | null = (project as { portal_message?: string | null }).portal_message ?? null
  const stepsOverride = (project as { project_steps_override?: Record<string, boolean> | null }).project_steps_override ?? null

  function getMapsUrl(mp: string): string {
    if (mp.startsWith('http')) return mp
    return `https://maps.google.com/?q=${encodeURIComponent(mp)}`
  }
  function getEmbedUrl(mp: string): string {
    const q = mp.startsWith('http')
      ? (() => { try { const u = new URL(mp); return u.searchParams.get('q') || mp } catch { return mp } })()
      : mp
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=16`
  }

  const isDelivered = project.status === 'delivered' || project.status === 'completed'
  const isPostShooting = project.status === 'editing' || isDelivered
  const firstName = project.title || client.full_name.split(' ')[0]
  const latestContract = contracts?.[0]
  const contractSigned = latestContract?.status === 'signed'
  const timelineEvents = (timeline?.events as { id: string; time: string; title: string; phase: string }[]) || []
  const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
  const dateLocale = portalLocale === 'de' ? 'de' : 'en'

  // Project overview steps
  const projectSteps = [
    { key: 'booking',       label: t.steps.booking,       done: true,                                                                icon: '📅' },
    { key: 'contract',      label: t.steps.contract,      done: contractSigned || stepsOverride?.contract === true,                  icon: '✍️' },
    ...(questionnaire ? [{ key: 'questionnaire', label: t.steps.questionnaire, done: questionnaireSubmitted,                         icon: '📋' }] : []),
    { key: 'shooting',      label: t.steps.shooting,      done: isPostShooting || (days !== null && days < 0) || stepsOverride?.shooting === true, icon: '📸' },
    { key: 'gallery',       label: t.steps.gallery,       done: !!gallery || stepsOverride?.gallery === true,                        icon: '🖼️' },
  ]
  const currentStepIdx = projectSteps.filter(s => s.done).length - 1

  // Next steps
  const nextSteps = [
    { key: 'contract',  label: t.contract.title,       done: contractSigned,  show: !!latestContract,                       href: `/client/${token}/contract`,     cta: t.nextStepsCta.contract },
    { key: 'moodboard', label: t.moodboard.title,      done: false,           show: show.moodboard && !isPostShooting,      href: undefined,                       cta: t.nextStepsCta.moodboard },
    { key: 'prepare',   label: t.tips.title,           done: isPostShooting,  show: days !== null && days <= 14 && days >= 0, href: undefined,                     cta: t.nextStepsCta.prepare },
    { key: 'gallery',   label: t.gallery.title,        done: false,           show: !!gallery,                              href: `/client/${token}/gallery`,      cta: t.nextStepsCta.gallery },
  ].filter(s => s.show)

  // Photographer message
  let photographerMessage = t.messages.welcome(firstName)
  if (days !== null && days <= 7 && days >= 0 && !isPostShooting) {
    photographerMessage = t.messages.soon(days)
  } else if (project.status === 'editing') {
    photographerMessage = t.messages.editing
  } else if (isDelivered && gallery) {
    photographerMessage = t.messages.delivered
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
            {t.hello(firstName)}
          </h1>

          {project.shoot_date && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[19px] font-semibold mb-3"
              style={{
                background: isDelivered ? 'rgba(42,155,104,0.10)' : days === 0 ? 'rgba(196,59,44,0.08)' : 'var(--accent-muted)',
                color: isDelivered ? '#2A9B68' : days === 0 ? '#C43B2C' : 'var(--accent)',
              }}>
              <Calendar className="w-3.5 h-3.5" />
              {isDelivered ? t.photosReady
                : days === 0 ? t.shootToday
                : days !== null && days < 0 ? t.shootDone(formatDate(project.shoot_date, dateLocale))
                : t.shootIn(days!)}
            </div>
          )}

          <p className="text-[17px]" style={{ color: 'var(--text-secondary)' }}>
            {project.title}
            {project.shoot_date && (
              <span style={{ color: 'var(--text-muted)' }}> · {formatDate(project.shoot_date, dateLocale)}</span>
            )}
          </p>

          {show.weather && project.shoot_date && !isDelivered && days !== null && days >= 0 && days <= 30 && (
            <div className="mt-4">
              <WeatherWidget date={project.shoot_date} location={project.location || 'Deutschland'} />
            </div>
          )}
        </div>

        {/* ── MESSAGE FROM PHOTOGRAPHER ── */}
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
                  {t.messageFrom(studioName)}
                </p>
              </div>
              <p className="font-bold text-[17px] mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {customMessage ? t.messageFrom(studioName) : photographerMessage.title}
              </p>
              <p className="text-[19px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {customMessage ?? photographerMessage.text}
              </p>
            </div>
          </div>
        </div>

        {/* ── PROJECT OVERVIEW (Stepper) ── */}
        <div className="rounded-2xl p-5 animate-in-delay-1"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {t.projectOverview}
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-5 bottom-5 w-0.5" style={{ background: 'var(--border-color)' }} />
            <div className="space-y-3">
              {projectSteps.map((step, i) => {
                const isActive = i === currentStepIdx + 1 && !step.done
                const isPast = step.done
                return (
                  <div key={step.key} className="flex items-center gap-3 relative">
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
                        <p className="text-[17px] mt-0.5" style={{ color: 'var(--accent)' }}>{t.currentStep}</p>
                      )}
                    </div>
                    {isPast && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2A9B68' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── NEXT STEPS ── */}
        {nextSteps.length > 0 && (
          <div className="rounded-2xl p-5 animate-in-delay-1"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {t.nextSteps}
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
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t.contract.title}</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {contractSigned ? t.contract.signed
                        : latestContract.status === 'viewed' ? t.contract.viewed
                        : t.contract.ready}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!contractSigned && (
                    <span className="text-[17px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {t.contract.pending}
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
                      {latestContract.status === 'draft' ? 'Draft' : latestContract.status === 'sent' ? 'Sent' : 'Viewed'}
                    </p>
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-1.5 text-[15.5px] font-bold" style={{ color: 'var(--accent)' }}>
                      <PenLine className="w-3.5 h-3.5" />
                      {t.contract.signNow}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Link>
        )}

        {/* ── TREFFPUNKT MAP CARD(S) ── */}
        {show.treffpunkt && meetingLocations.length > 0 && (
          <div className="rounded-2xl overflow-hidden animate-in-delay-2"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #EC4899, #F472B6)' }} />
            <div className="p-5 pb-3">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(236,72,153,0.10)' }}>
                  <MapPin className="w-4.5 h-4.5" style={{ color: '#EC4899', width: '18px', height: '18px' }} />
                </div>
                <div>
                  <p className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t.treffpunkt.title}</p>
                  <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{t.treffpunkt.subtitle}</p>
                </div>
              </div>

              {/* Multiple locations */}
              <div className="space-y-4">
                {meetingLocations.map((loc, idx) => (
                  <div key={idx}>
                    {/* Location label + open button */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899' }}>
                          {idx + 1}
                        </span>
                        <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {loc.label || t.treffpunkt.title}
                        </span>
                      </div>
                      <a
                        href={getMapsUrl(loc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-bold flex-shrink-0 transition-all hover:opacity-80"
                        style={{ background: 'rgba(236,72,153,0.10)', color: '#EC4899' }}
                      >
                        <MapPin className="w-3 h-3" />
                        {t.treffpunkt.openMaps}
                      </a>
                    </div>
                    {/* Map embed */}
                    <div className="rounded-xl overflow-hidden" style={{ height: '160px' }}>
                      <iframe
                        src={getEmbedUrl(loc.url)}
                        width="100%"
                        height="160"
                        style={{ border: 0, display: 'block' }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={loc.label || t.treffpunkt.title}
                      />
                    </div>
                    {/* Route link */}
                    <a
                      href={getMapsUrl(loc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[13px] font-bold mt-2 transition-all hover:opacity-80"
                      style={{ color: '#EC4899' }}
                    >
                      <MapPin className="w-3 h-3" />
                      {t.treffpunkt.routeMaps}
                    </a>
                    {/* Divider between locations */}
                    {idx < meetingLocations.length - 1 && (
                      <div className="mt-4" style={{ borderTop: '1px solid var(--card-border)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTIONNAIRE CARD ── */}
        {show.questionnaire && questionnaire && (
          <Link href={`/client/${token}/questionnaire`}
            className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-2 hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: questionnaireSubmitted ? 'rgba(42,155,104,0.10)' : 'rgba(139,92,246,0.10)' }}>
                    {questionnaireSubmitted
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: '#2A9B68' }} />
                      : <ClipboardList className="w-5 h-5" style={{ color: '#8B5CF6' }} />}
                  </div>
                  <div>
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t.questionnaire.title}</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {questionnaireSubmitted ? t.questionnaire.completed : t.questionnaire.pending}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!questionnaireSubmitted && (
                    <span className="text-[17px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.10)', color: '#8B5CF6' }}>
                      {t.questionnaire.pendingBadge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-1.5 text-[15.5px] font-bold"
                  style={{ color: questionnaireSubmitted ? '#2A9B68' : '#8B5CF6' }}>
                  <ClipboardList className="w-3.5 h-3.5" />
                  {questionnaireSubmitted ? t.questionnaire.viewAnswers : t.questionnaire.fillNow}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </Link>
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
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t.timeline.title}</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {t.timeline.entries(timelineEvents.length)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0 mt-3" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </Link>
        )}

        {/* ── LINKS CARD ── */}
        {portalLinks.length > 0 && (
          <div className="rounded-2xl overflow-hidden animate-in-delay-2"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366F1, #818CF8)' }} />
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <Link2 className="w-4.5 h-4.5" style={{ color: '#6366F1', width: '18px', height: '18px' }} />
                </div>
                <div>
                  <p className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t.links.title}</p>
                  <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{t.links.subtitle}</p>
                </div>
              </div>
              <div className="space-y-2">
                {portalLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(99,102,241,0.12)' }}>
                      <Link2 className="w-3.5 h-3.5" style={{ color: '#6366F1' }} />
                    </div>
                    <span className="flex-1 text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {link.label || link.url}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366F1' }} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GALLERY CARD ── */}
        {show.gallery && gallery && (
          <div className="rounded-2xl overflow-hidden animate-in-delay-2"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), #E8C89C)' }} />
            <Link href={`/client/${token}/gallery`} className="group block p-5 hover:opacity-95 transition-opacity">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-muted)' }}>
                    <Images className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t.gallery.title}</p>
                    <p className="text-[19px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {photoCount > 0 ? t.gallery.photos(photoCount) : t.gallery.available}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {photoCount > 0 && (
                    <span className="text-[17px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {photoCount} {portalLocale === 'de' ? 'Fotos' : 'Photos'}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-1.5 text-[15.5px] font-bold" style={{ color: 'var(--accent)' }}>
                  <Heart className="w-3.5 h-3.5" />
                  {t.gallery.viewFavs}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
              {(gallery.view_count > 0 || gallery.download_count > 0) && (
                <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  {gallery.view_count > 0 && <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>{t.gallery.views(gallery.view_count)}</span>}
                  {gallery.download_count > 0 && <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>{t.gallery.downloads(gallery.download_count)}</span>}
                </div>
              )}
            </Link>
            {/* Share button — outside the Link to avoid nested navigation */}
            <div className="px-5 pb-4 pt-0 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)' }}>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Teile die Galerie mit Gästen & Familie
              </p>
              <GalleryShareButton
                galleryUrl={publicGalleryUrl}
                galleryPassword={(gallery as { password?: string | null }).password ?? null}
              />
            </div>
          </div>
        )}

        {/* ── MOODBOARD ── */}
        {show.moodboard && (
          <div className="animate-in-delay-3">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <h2 className="font-bold text-[19px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t.moodboard.title}</h2>
              </div>
              <p className="text-[19px]" style={{ color: 'var(--text-secondary)' }}>{t.moodboard.desc}</p>
            </div>
            <MoodBoard projectId={project.id} token={token} />
          </div>
        )}

        {/* ── TIPS FOR YOUR SHOOT ── */}
        {show.tips && !isPostShooting && (
          <div className="animate-in-delay-3">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="font-bold text-[19px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {t.tips.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {t.tips.items.map((tip, i) => {
                const icons = [
                  <Shirt key="shirt" className="w-5 h-5" />,
                  <Sun key="sun" className="w-5 h-5" />,
                  <Sparkles key="sparkles" className="w-5 h-5" />,
                  <MapPin key="mappin" className="w-5 h-5" />,
                ]
                return (
                  <div key={i} className="rounded-xl p-4"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {icons[i]}
                    </div>
                    <p className="font-bold text-[15.5px] mb-1" style={{ color: 'var(--text-primary)' }}>{tip.title}</p>
                    <p className="text-[17.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── INVOICE CARD ── */}
        {show.invoice && (
          <Link href={`/client/${token}/invoice`}
            className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-2 hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)' }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(249,115,22,0.10)' }}>
                    <FileText className="w-5 h-5" style={{ color: '#F97316' }} />
                  </div>
                  <div>
                    <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {portalLocale === 'de' ? 'Rechnung' : 'Invoice'}
                    </p>
                    <p className="text-[14px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {portalLocale === 'de' ? 'Rechnungen & Zahlungsdetails ansehen' : 'View invoices & payment details'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0 mt-3" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-1.5 text-[15.5px] font-bold" style={{ color: '#F97316' }}>
                  <FileText className="w-3.5 h-3.5" />
                  {portalLocale === 'de' ? 'Rechnung ansehen →' : 'View invoice →'}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Empty state */}
        {!latestContract && !gallery && timelineEvents.length === 0 && (
          <div className="text-center py-14 rounded-2xl animate-in-delay-1"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-hover)' }}>
              <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-[16.5px]" style={{ color: 'var(--text-secondary)' }}>{t.empty.text}</p>
            <p className="text-[18px] mt-1" style={{ color: 'var(--text-muted)' }}>{t.empty.sub}</p>
          </div>
        )}

      </div>
    </div>
  )
}
