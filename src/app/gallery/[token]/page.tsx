import React from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { Images } from 'lucide-react'
import GalleryViewer from '@/components/client-portal/GalleryViewer'
import { getTheme, getSpacingGap, getTypographyPreset } from '@/lib/galleryThemes'
import type { SpacingDensity } from '@/lib/galleryThemes'
import GalleryPasswordGate from './GalleryPasswordGate'
import { getPhotoUrl } from '@/lib/utils'
import type { Metadata } from 'next'

// ISR: serve from CDN cache, revalidate every 60 seconds.
// The /api/galleries/[galleryId]/revalidate endpoint calls revalidatePath()
// immediately after any settings save in GalleryTab, so changes are visible
// within seconds in practice (not 60s).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const supabase = createServiceClient()

  let project: { id: string; title: string | null; photographer: { studio_name: string | null; full_name: string } | { studio_name: string | null; full_name: string }[] | null } | null = null

  const { data: bySlug } = await supabase
    .from('projects')
    .select('id, title, photographer:photographers(studio_name, full_name)')
    .eq('custom_slug', token)
    .single()
  project = bySlug

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('id, title, photographer:photographers(studio_name, full_name)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  // Try direct gallery lookup (project-less galleries)
  let directGalleryMeta: { id: string; title: string; cover_photo_id: string | null; photographer_id: string } | null = null
  if (!project) {
    const { data: gBySlug } = await supabase
      .from('galleries')
      .select('id, title, cover_photo_id, photographer_id')
      .eq('custom_slug', token)
      .single()
    directGalleryMeta = gBySlug
    if (!directGalleryMeta) {
      const { data: gByToken } = await supabase
        .from('galleries')
        .select('id, title, cover_photo_id, photographer_id')
        .eq('share_token', token)
        .single()
      directGalleryMeta = gByToken
    }
  }

  if (!project && !directGalleryMeta) return {}

  let photographer: { studio_name: string | null; full_name: string } | null = null
  let gallery: { id: string; title: string; cover_photo_id: string | null } | null = null

  if (project) {
    photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { studio_name: string | null; full_name: string } | null
    const { data: galleries } = await supabase
      .from('galleries')
      .select('id, title, cover_photo_id')
      .eq('project_id', project.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
    gallery = galleries?.[0] ?? null
  } else {
    gallery = directGalleryMeta
    const { data: ph } = await supabase
      .from('photographers')
      .select('studio_name, full_name')
      .eq('id', directGalleryMeta!.photographer_id)
      .single()
    photographer = ph
  }

  const galleryTitle = gallery?.title || project?.title || 'Galerie'
  const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'

  let ogImageUrl: string | null = null

  if (gallery) {
    if (gallery.cover_photo_id) {
      const { data: coverPhoto } = await supabase
        .from('photos')
        .select('storage_url')
        .eq('id', gallery.cover_photo_id)
        .single()
      ogImageUrl = coverPhoto?.storage_url ?? null
    }
    if (!ogImageUrl) {
      const { data: firstPhoto } = await supabase
        .from('photos')
        .select('storage_url')
        .eq('gallery_id', gallery.id)
        .order('display_order', { ascending: true })
        .limit(1)
        .single()
      ogImageUrl = firstPhoto?.storage_url ?? null
    }
  }

  const ogImage = ogImageUrl ? getPhotoUrl(ogImageUrl, 1200, 85, 'cover') : undefined

  return {
    title: `${galleryTitle} — ${studioName}`,
    description: `Fotogalerie von ${studioName}`,
    openGraph: {
      title: galleryTitle,
      description: `Fotogalerie von ${studioName}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: galleryTitle }] } : {}),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: galleryTitle,
      description: `Fotogalerie von ${studioName}`,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function PublicGalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both custom slugs and raw client_token UUIDs
  let { data: project } = await supabase
    .from('projects')
    .select('id, title, photographer_id, shoot_date, location, photographer:photographers(studio_name, full_name, logo_url), client:clients(full_name, email)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('id, title, photographer_id, shoot_date, location, photographer:photographers(studio_name, full_name, logo_url), client:clients(full_name, email)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  // Try direct gallery share_token / custom_slug for project-less galleries
  let directGalleryId: string | null = null
  let directPhotographerId: string | null = null
  if (!project) {
    const { data: gBySlug } = await supabase
      .from('galleries')
      .select('id, photographer_id')
      .eq('custom_slug', token)
      .single()
    if (gBySlug) { directGalleryId = gBySlug.id; directPhotographerId = gBySlug.photographer_id }
    if (!directGalleryId) {
      const { data: gByToken } = await supabase
        .from('galleries')
        .select('id, photographer_id')
        .eq('share_token', token)
        .single()
      if (gByToken) { directGalleryId = gByToken.id; directPhotographerId = gByToken.photographer_id }
    }
    if (!directGalleryId) notFound()
  }

  let photographer: { studio_name: string | null; full_name: string; logo_url: string | null } | null = null
  let client: { full_name: string; email?: string | null } | null = null

  if (project) {
    photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { studio_name: string | null; full_name: string; logo_url: string | null } | null
    client = (Array.isArray(project.client) ? project.client[0] : project.client) as { full_name: string; email?: string | null } | null
  } else {
    const { data: ph } = await supabase
      .from('photographers')
      .select('studio_name, full_name, logo_url')
      .eq('id', directPhotographerId!)
      .single()
    photographer = ph
    client = null
  }

  // Fetch gallery
  const gallerySelectCols = 'id, title, description, status, download_enabled, watermark, design_theme, password, guest_password, cover_photo_id, tags_enabled, cover_focal_x, cover_focal_y'

  type GalleryRow = {
    id: string; title: string; description: string | null; status: string
    download_enabled: boolean; watermark: boolean; design_theme: string
    password: string | null; guest_password: string | null; cover_photo_id: string | null
    tags_enabled: string[] | null; cover_focal_x: number | null; cover_focal_y: number | null
  }

  let gallery: GalleryRow | null = null

  if (project) {
    const { data: allGalleries } = await supabase
      .from('galleries')
      .select(gallerySelectCols)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (allGalleries && allGalleries.length > 0) {
      const sorted = [
        ...allGalleries.filter(g => g.status === 'active'),
        ...allGalleries.filter(g => g.status !== 'active'),
      ]
      for (const g of sorted) {
        const { count } = await supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('gallery_id', g.id)
        if ((count ?? 0) > 0) { gallery = g as GalleryRow; break }
      }
      if (!gallery) gallery = allGalleries[0] as GalleryRow
    }
  } else {
    const { data: g } = await supabase
      .from('galleries')
      .select(gallerySelectCols)
      .eq('id', directGalleryId!)
      .single()
    gallery = g as GalleryRow | null
  }

  // Fetch each batch of newer columns in its own query so one missing column
  // never silently kills the others (a single SELECT with a missing column
  // returns an error for the whole row).
  let galleryExtra: {
    cover_focal_x_mobile?: number | null
    cover_focal_y_mobile?: number | null
    hero_style?: string | null
    spacing_density?: string | null
    typography_preset?: string | null
  } = {}
  if (gallery) {
    // migration 082 — focal point mobile
    const { data: e1 } = await supabase
      .from('galleries').select('cover_focal_x_mobile, cover_focal_y_mobile').eq('id', gallery.id).single()
    if (e1) galleryExtra = { ...galleryExtra, ...e1 }

    // migration 095 — hero style + spacing
    const { data: e2 } = await supabase
      .from('galleries').select('hero_style, spacing_density').eq('id', gallery.id).single()
    if (e2) galleryExtra = { ...galleryExtra, ...e2 }

    // migration 096 — typography preset
    const { data: e3 } = await supabase
      .from('galleries').select('typography_preset').eq('id', gallery.id).single()
    if (e3) galleryExtra = { ...galleryExtra, ...e3 }
  }

  const emptyTheme = getTheme('classic-white')

  if (!gallery) {
    return (
      <div style={{ minHeight: '100vh', background: emptyTheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: emptyTheme.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Images style={{ width: 28, height: 28, color: emptyTheme.textMuted }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: emptyTheme.text, letterSpacing: '-0.02em' }}>Galerie wird vorbereitet</h2>
        <p style={{ color: emptyTheme.textMuted, fontSize: '0.875rem' }}>Die Fotos werden bald verfügbar sein.</p>
      </div>
    )
  }

  // Paginate to bypass Supabase's 1000-row default limit
  type RawPhoto = { id: string; storage_url: string; thumbnail_url: string | null; filename: string; is_favorite: boolean; display_order: number; is_private?: boolean; section_id?: string | null }
  let rawPhotos: RawPhoto[] = []
  const PG = 1000
  let fetchError = false
  for (let from = 0; ; from += PG) {
    const { data: page, error: pageErr } = await supabase
      .from('photos')
      .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order, is_private, section_id')
      .eq('gallery_id', gallery.id)
      .order('display_order', { ascending: true })
      .range(from, from + PG - 1)
    if (pageErr) { fetchError = true; break }
    if (!page || page.length === 0) break
    rawPhotos.push(...page.map(p => ({ ...p, is_private: p.is_private === null ? undefined : p.is_private })))
    if (page.length < PG) break
  }
  if (fetchError) {
    // Fallback: select without is_private column
    rawPhotos = []
    for (let from = 0; ; from += PG) {
      const { data: page } = await supabase
        .from('photos')
        .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order, section_id')
        .eq('gallery_id', gallery.id)
        .order('display_order', { ascending: true })
        .range(from, from + PG - 1)
      if (!page || page.length === 0) break
      rawPhotos.push(...page.map(p => ({ ...p, is_private: false })))
      if (page.length < PG) break
    }
  }

  const { data: gallerySections } = await supabase
    .from('gallery_sections')
    .select('id, title, display_order')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  const allPhotos = rawPhotos.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  const galleryPassword = gallery.password ?? null
  const guestPassword = gallery.guest_password ?? null
  const coverPhotoId = gallery.cover_photo_id ?? null
  const focalX = (gallery as { cover_focal_x?: number | null }).cover_focal_x ?? 50
  const focalY = (gallery as { cover_focal_y?: number | null }).cover_focal_y ?? 50
  const focalXMobile = galleryExtra.cover_focal_x_mobile ?? focalX
  const focalYMobile = galleryExtra.cover_focal_y_mobile ?? focalY
  const heroStyle = galleryExtra.hero_style ?? 'cinematic'
  const spacingDensity = (galleryExtra.spacing_density ?? 'balanced') as SpacingDensity

  const theme = getTheme(gallery.design_theme || 'classic-white')

  const shootDate = (project as { shoot_date?: string | null } | null)?.shoot_date ?? null
  const formattedDate = shootDate
    ? new Date(shootDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const heroTitle = gallery.title || project?.title || 'Galerie'

  // Separate public (non-private) vs all photos
  const publicPhotos = allPhotos.filter(p => !p.is_private)
  const allAccessPhotos = allPhotos

  // ── Helper: render the hero + gallery layout for a given photo set ──
  // This is a plain function that returns JSX — called server-side only,
  // never passed as a prop across the server/client boundary.
  const tagsEnabled = Array.isArray((gallery as { tags_enabled?: string[] | null }).tags_enabled)
    ? ((gallery as { tags_enabled?: string[] | null }).tags_enabled?.length ?? 0) > 0
    : true

  function renderGallery(sortedPhotos: typeof allPhotos, fullAccess = false) {
    // Search cover in ALL photos (not just sortedPhotos) so private cover photos
    // still work as hero image without being exposed in the public photo list
    const coverPhoto = coverPhotoId ? allPhotos.find(p => p.id === coverPhotoId) : null
    const heroUrl = (coverPhoto ?? sortedPhotos[0])?.storage_url ?? null

    // Focal-point + Ken Burns CSS shared between hero variants
    const focalCss = `
      .gh{object-position:${focalX}% ${focalY}%}
      @media(max-width:768px){.gh{object-position:${focalXMobile}% ${focalYMobile}%}}
    `

    // ── Typography preset ────────────────────────────────────────────
    const typo = getTypographyPreset(galleryExtra.typography_preset ?? null)

    // ── Hero: choose style ───────────────────────────────────────────
    const imgRequired = ['cinematic', 'editorial', 'frame', 'luxury']
    const effectiveStyle = (imgRequired.includes(heroStyle) && !heroUrl) ? 'minimal' : heroStyle

    let heroBlock: React.ReactNode

    if (effectiveStyle === 'cinematic') {
      heroBlock = (
        <div style={{ position: 'relative', height: '100svh', minHeight: 560, overflow: 'hidden', background: '#0C0C0B' }}>
          <style dangerouslySetInnerHTML={{ __html: focalCss }} />
          <img
            src={getPhotoUrl(heroUrl!, 1920, 82, 'cover')}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="gh gallery-hero-kb"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.32) 72%, rgba(0,0,0,0.58) 100%)' }} />
          {photographer && (
            <div className="hero-brand-in" style={{ position: 'absolute', top: 22, left: 26, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              {photographer.logo_url && <img src={photographer.logo_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', opacity: 0.8 }} />}
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', fontFamily: typo.fontFamily, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                {photographer.studio_name || photographer.full_name}
              </span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 clamp(28px, 5vw, 72px) clamp(48px, 7vh, 72px)', zIndex: 10 }}>
            <h1 className="hero-title-in" style={{ color: 'rgba(255,255,255,0.92)', fontFamily: typo.fontFamily, fontSize: 'clamp(1.5rem, 2.8vw, 2.6rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, margin: 0, textShadow: '0 1px 20px rgba(0,0,0,0.28)' }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p className="hero-date-in" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.68rem', fontFamily: typo.fontFamily, letterSpacing: typo.subtitleTracking, marginTop: 14, textTransform: typo.subtitleUppercase ? 'uppercase' : 'none', textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                {formattedDate}
              </p>
            )}
            <div style={{ marginTop: 32, width: 1, height: 22, background: 'rgba(255,255,255,0.15)' }} />
          </div>
        </div>
      )
    } else if (effectiveStyle === 'frame') {
      heroBlock = (
        <div style={{ position: 'relative', height: '100svh', minHeight: 560, background: '#0A0A08', padding: 'clamp(12px, 2.5vw, 32px)', boxSizing: 'border-box' }}>
          <style dangerouslySetInnerHTML={{ __html: focalCss }} />
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <img className="gh gallery-hero-kb" src={getPhotoUrl(heroUrl!, 1920, 82, 'cover')} alt="" fetchPriority="high" decoding="async"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {/* Soft vignette so centered text is readable on any photo */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.52) 100%)' }} />
            {/* Photographer brand — top-left */}
            {photographer && (
              <div className="hero-brand-in" style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                {photographer.logo_url && <img src={photographer.logo_url} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', opacity: 0.75 }} />}
                <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: typo.fontFamily, fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                  {photographer.studio_name || photographer.full_name}
                </span>
              </div>
            )}
            {/* Title + date — dead center */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 clamp(32px, 6vw, 96px)', zIndex: 10 }}>
              <h1 className="hero-title-in" style={{ color: 'rgba(255,255,255,0.93)', fontFamily: typo.fontFamily, fontSize: 'clamp(1.6rem, 3vw, 2.8rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, margin: 0, textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>
                {heroTitle}
              </h1>
              {formattedDate && (
                <p className="hero-date-in" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: typo.fontFamily, fontSize: '0.64rem', letterSpacing: typo.subtitleTracking, marginTop: 14, textTransform: typo.subtitleUppercase ? 'uppercase' : 'none' }}>
                  {formattedDate}
                </p>
              )}
            </div>
            {/* Frame border */}
            <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
          </div>
        </div>
      )
    } else if (effectiveStyle === 'journal') {
      heroBlock = (
        <div style={{ background: theme.bg, minHeight: 'clamp(520px, 78vh, 860px)', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
          {heroUrl && (
            <div style={{ position: 'relative', width: 'min(380px, 65vw)', aspectRatio: '3/2', marginTop: 'clamp(40px, 7vh, 72px)', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.14)' }}>
              <style dangerouslySetInnerHTML={{ __html: focalCss }} />
              <img className="gh" src={getPhotoUrl(heroUrl, 1200, 82, 'cover')} alt="" fetchPriority="high" decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ maxWidth: 640, padding: 'clamp(32px, 5vh, 52px) clamp(20px, 5vw, 40px) clamp(48px, 7vh, 72px)', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            {photographer && (
              <p style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 20 }}>
                {photographer.studio_name || photographer.full_name}
              </p>
            )}
            <h1 className="hero-title-in" style={{ color: theme.text, fontFamily: typo.fontFamily, fontSize: 'clamp(2rem, 4.5vw, 4rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, margin: 0 }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p className="hero-date-in" style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.62rem', letterSpacing: typo.subtitleTracking, marginTop: 16, textTransform: typo.subtitleUppercase ? 'uppercase' : 'none' }}>
                {formattedDate}
              </p>
            )}
            <div style={{ margin: '28px auto 0', width: 36, height: 1, background: theme.accent, opacity: 0.4 }} />
          </div>
        </div>
      )
    } else if (effectiveStyle === 'luxury') {
      heroBlock = (
        <div style={{ position: 'relative', height: '100svh', minHeight: 560, overflow: 'hidden', background: '#060604' }}>
          <style dangerouslySetInnerHTML={{ __html: focalCss }} />
          <img className="gh gallery-hero-kb" src={getPhotoUrl(heroUrl!, 1920, 85, 'cover')} alt="" fetchPriority="high" decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.22) 65%, rgba(0,0,0,0.52) 100%)' }} />
          {photographer && (
            <div className="hero-brand-in" style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, zIndex: 10 }}>
              {photographer.logo_url
                ? <img src={photographer.logo_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', opacity: 0.65 }} />
                : <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontFamily: typo.fontFamily, letterSpacing: '0.06em' }}>
                    {(photographer.studio_name || photographer.full_name)[0]}
                  </div>
              }
              <div style={{ marginTop: 10, width: 0.5, height: 28, background: 'rgba(255,255,255,0.12)' }} />
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 clamp(32px, 6vw, 96px) clamp(52px, 8vh, 80px)', zIndex: 10, textAlign: 'center' }}>
            <h1 className="hero-title-in" style={{ color: 'rgba(255,255,255,0.88)', fontFamily: typo.fontFamily, fontSize: 'clamp(1.3rem, 2.2vw, 2.2rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, textShadow: '0 1px 12px rgba(0,0,0,0.18)', margin: 0 }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p className="hero-date-in" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: typo.fontFamily, fontSize: '0.58rem', letterSpacing: '0.28em', marginTop: 16, textTransform: 'uppercase' }}>
                {formattedDate}
              </p>
            )}
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.18)' }} />
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
              <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.18)' }} />
            </div>
          </div>
        </div>
      )
    } else if (effectiveStyle === 'editorial' && heroUrl) {
      heroBlock = (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'clamp(420px, 60vh, 700px)' }}>
          <style dangerouslySetInnerHTML={{ __html: focalCss }} />
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img src={getPhotoUrl(heroUrl, 1600, 82, 'cover')} alt="" fetchPriority="high" decoding="async" className="gh" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ background: theme.bg, padding: '48px clamp(24px, 5vw, 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderBottom: `1px solid ${theme.border}` }}>
            {photographer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
                {photographer.logo_url
                  ? <img src={photographer.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 24, height: 24, borderRadius: '50%', background: theme.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{(photographer.studio_name || photographer.full_name)[0]}</div>
                }
                <span style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.75rem' }}>{photographer.studio_name || photographer.full_name}</span>
              </div>
            )}
            <h1 style={{ color: theme.text, fontFamily: typo.fontFamily, fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, margin: 0 }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.68rem', letterSpacing: typo.subtitleTracking, marginTop: 10, textTransform: typo.subtitleUppercase ? 'uppercase' : 'none' }}>{formattedDate}</p>
            )}
          </div>
        </div>
      )
    } else if (effectiveStyle === 'minimal') {
      heroBlock = (
        <div style={{ background: theme.bg, padding: '80px clamp(20px, 5vw, 64px) 52px', textAlign: 'center', borderBottom: `1px solid ${theme.border}` }}>
          {photographer && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
              {photographer.logo_url
                ? <img src={photographer.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 40, height: 40, borderRadius: '50%', background: theme.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{(photographer.studio_name || photographer.full_name)[0]}</div>
              }
              <span style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.8125rem' }}>{photographer.studio_name || photographer.full_name}</span>
            </div>
          )}
          <h1 style={{ color: theme.text, fontFamily: typo.fontFamily, fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, margin: 0 }}>
            {heroTitle}
          </h1>
          {formattedDate && (
            <p style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.68rem', letterSpacing: typo.subtitleTracking, marginTop: 12, textTransform: typo.subtitleUppercase ? 'uppercase' : 'none' }}>{formattedDate}</p>
          )}
        </div>
      )
    } else {
      // Classic: image + title block below
      heroBlock = (
        <div style={{ position: 'relative' }}>
          {heroUrl && (
            <div style={{ width: '100%', height: 'clamp(600px, 78vh, 960px)', overflow: 'hidden', background: '#1A1A18' }}>
              <style dangerouslySetInnerHTML={{ __html: focalCss }} />
              <img src={getPhotoUrl(heroUrl, 1920, 80, 'cover')} alt="" fetchPriority="high" decoding="async" className="gh" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ background: theme.bg, padding: '32px clamp(20px, 5vw, 64px) 24px', textAlign: 'center', borderBottom: `1px solid ${theme.border}` }}>
            {photographer && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {photographer.logo_url
                  ? <img src={photographer.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 28, height: 28, borderRadius: '50%', background: theme.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{(photographer.studio_name || photographer.full_name)[0]}</div>
                }
                <span style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.8rem' }}>{photographer.studio_name || photographer.full_name}</span>
              </div>
            )}
            <h1 style={{ color: theme.text, fontFamily: typo.fontFamily, fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)', fontWeight: typo.titleWeight, letterSpacing: typo.titleTracking, lineHeight: typo.titleLineHeight, margin: 0 }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p style={{ color: theme.textMuted, fontFamily: typo.fontFamily, fontSize: '0.68rem', letterSpacing: typo.subtitleTracking, marginTop: 10, textTransform: typo.subtitleUppercase ? 'uppercase' : 'none' }}>{formattedDate}</p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: typo.fontFamily }}>
        {typo.fontImport && <link rel="stylesheet" href={typo.fontImport} />}

        {heroBlock}

        {/* ── GALLERY CONTENT ── */}
        <div style={{ padding: '32px 0 64px' }}>
          {sortedPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '96px 0' }}>
              <Images style={{ width: 40, height: 40, color: theme.textMuted, margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>Noch keine Fotos in dieser Galerie.</p>
            </div>
          ) : (
            <GalleryViewer
              galleryId={gallery!.id}
              projectId={project?.id ?? null}
              galleryTitle={gallery!.title || project?.title || 'Galerie'}
              clientName={client?.full_name || ''}
              clientEmail={client?.email ?? undefined}
              initialPhotos={sortedPhotos}
              initialSections={gallerySections ?? []}
              downloadEnabled={gallery!.download_enabled}
              commentsEnabled={false}
              showWatermark={false}
              token={token}
              theme={theme}
              photoCount={sortedPhotos.length}
              isPublic={true}
              canMarkPrivate={fullAccess}
              tagsEnabled={tagsEnabled}
              spacingDensity={spacingDensity}
            />
          )}
        </div>
      </div>
    )
  }

  // ── Access logic ──────────────────────────────────────────────────────────
  // Both passwords → GalleryPasswordGate handles which level was entered.
  // We pre-render both JSX trees server-side and pass them as ReactNode props.
  if (galleryPassword && guestPassword) {
    return (
      <GalleryPasswordGate
        password={galleryPassword}
        guestPassword={guestPassword}
        publicContent={renderGallery(publicPhotos, false)}
        allContent={renderGallery(allAccessPhotos, true)}
      />
    )
  }

  // Kunden-only password: full access after entering
  if (galleryPassword) {
    return (
      <GalleryPasswordGate password={galleryPassword}>
        {renderGallery(allAccessPhotos, true)}
      </GalleryPasswordGate>
    )
  }

  // Guest-only password: non-private photos after entering
  if (guestPassword) {
    return (
      <GalleryPasswordGate password={guestPassword}>
        {renderGallery(publicPhotos)}
      </GalleryPasswordGate>
    )
  }

  // No password: show only non-private photos publicly
  return renderGallery(publicPhotos)
}
