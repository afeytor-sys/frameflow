import React from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { Images } from 'lucide-react'
import GalleryViewer from '@/components/client-portal/GalleryViewer'
import { getTheme, getSpacingGap } from '@/lib/galleryThemes'
import type { SpacingDensity } from '@/lib/galleryThemes'
import GalleryPasswordGate from './GalleryPasswordGate'
import { getPhotoUrl } from '@/lib/utils'
import type { Metadata } from 'next'

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

  if (!project) return {}

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { studio_name: string | null; full_name: string } | null

  const { data: galleries } = await supabase
    .from('galleries')
    .select('id, title, cover_photo_id')
    .eq('project_id', project.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  const gallery = galleries?.[0] ?? null
  const galleryTitle = gallery?.title || project.title || 'Galerie'
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

  if (!project) notFound()

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { studio_name: string | null; full_name: string; logo_url: string | null } | null
  const client = (Array.isArray(project.client) ? project.client[0] : project.client) as { full_name: string; email?: string | null } | null

  // Fetch active gallery with photos
  const { data: allGalleries } = await supabase
    .from('galleries')
    .select('id, title, description, status, download_enabled, watermark, design_theme, password, guest_password, cover_photo_id, tags_enabled, cover_focal_x, cover_focal_y')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  type GalleryRow = NonNullable<typeof allGalleries>[number]
  let gallery: GalleryRow | null = null
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
      if ((count ?? 0) > 0) { gallery = g; break }
    }
    if (!gallery) gallery = allGalleries[0]
  }

  // Fetch columns from newer migrations separately so missing columns never crash the page.
  // These default to safe values if the migration hasn't been applied yet.
  let galleryExtra: {
    cover_focal_x_mobile?: number | null
    cover_focal_y_mobile?: number | null
    hero_style?: string | null
    spacing_density?: string | null
  } = {}
  if (gallery) {
    const { data: extra, error: extraError } = await supabase
      .from('galleries')
      .select('cover_focal_x_mobile, cover_focal_y_mobile, hero_style, spacing_density')
      .eq('id', gallery.id)
      .single()
    if (!extraError && extra) galleryExtra = extra
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

  // Try to fetch photos with is_private column; fall back if column doesn't exist yet
  let rawPhotos: { id: string; storage_url: string; thumbnail_url: string | null; filename: string; is_favorite: boolean; display_order: number; is_private?: boolean }[] = []
  const { data: photosWithPrivate, error: photosError } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order, is_private, section_id')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  if (photosError) {
    // Fallback: select without is_private (column may not exist yet)
    const { data: photosFallback } = await supabase
      .from('photos')
      .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order, section_id')
      .eq('gallery_id', gallery.id)
      .order('display_order', { ascending: true })
    rawPhotos = (photosFallback || []).map(p => ({ ...p, is_private: false }))
  } else {
    rawPhotos = (photosWithPrivate || []).map(p => ({ ...p, is_private: p.is_private === null ? undefined : p.is_private }))
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

  const shootDate = (project as { shoot_date?: string | null }).shoot_date
  const formattedDate = shootDate
    ? new Date(shootDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const heroTitle = gallery.title || project.title

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

    // ── Photographer branding pill (reused across hero styles) ──
    const brandingPill = photographer ? (
      <div className="hero-brand-in" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {photographer.logo_url ? (
          <img src={photographer.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.3)' }} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', border: '1.5px solid rgba(255,255,255,0.2)' }}>
            {(photographer.studio_name || photographer.full_name)[0]}
          </div>
        )}
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8125rem', fontWeight: 500, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.15)' }}>
          {photographer.studio_name || photographer.full_name}
        </span>
      </div>
    ) : null

    // ── Hero: choose style ───────────────────────────────────────────
    const effectiveStyle = (heroStyle === 'cinematic' && !heroUrl) ? 'minimal' : heroStyle

    let heroBlock: React.ReactNode

    if (effectiveStyle === 'cinematic') {
      heroBlock = (
        <div style={{ position: 'relative', height: '100svh', minHeight: 560, overflow: 'hidden', background: '#0F0F0E' }}>
          <style dangerouslySetInnerHTML={{ __html: focalCss }} />
          <img
            src={getPhotoUrl(heroUrl!, 1920, 80, 'cover')}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="gh gallery-hero-kb"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Gradient: dark top + dark bottom for readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 78%, rgba(0,0,0,0.88) 100%)' }} />
          {/* Branding — top left */}
          <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10 }}>
            {brandingPill}
          </div>
          {/* Title + date — bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 clamp(20px, 5vw, 64px) clamp(36px, 6vh, 60px)', zIndex: 10 }}>
            <h1 className="hero-title-in" style={{ color: 'white', fontFamily: theme.fontFamily, fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: theme.headerStyle === 'bold' ? 700 : 300, letterSpacing: '-0.025em', lineHeight: 1.1, margin: 0, textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p className="hero-date-in" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 400, letterSpacing: '0.1em', marginTop: 10, textTransform: 'uppercase' }}>
                {formattedDate}
              </p>
            )}
            <div style={{ marginTop: 28, width: 1, height: 28, background: 'rgba(255,255,255,0.2)' }} />
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
                <span style={{ color: theme.textMuted, fontSize: '0.75rem', fontWeight: 500 }}>{photographer.studio_name || photographer.full_name}</span>
              </div>
            )}
            <h1 style={{ color: theme.text, fontFamily: theme.fontFamily, fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: theme.headerStyle === 'bold' ? 700 : 400, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p style={{ color: theme.textMuted, fontSize: '0.75rem', letterSpacing: '0.06em', marginTop: 10, textTransform: 'uppercase' }}>{formattedDate}</p>
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
              <span style={{ color: theme.textMuted, fontSize: '0.8125rem', fontWeight: 500 }}>{photographer.studio_name || photographer.full_name}</span>
            </div>
          )}
          <h1 style={{ color: theme.text, fontFamily: theme.fontFamily, fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: theme.headerStyle === 'bold' ? 700 : 400, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
            {heroTitle}
          </h1>
          {formattedDate && (
            <p style={{ color: theme.textMuted, fontSize: '0.75rem', fontWeight: 400, letterSpacing: '0.08em', marginTop: 10, textTransform: 'uppercase' }}>{formattedDate}</p>
          )}
        </div>
      )
    } else {
      // Classic: image + title block below (original look)
      heroBlock = (
        <div style={{ position: 'relative' }}>
          {photographer && (
            <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10 }}>
              {brandingPill}
            </div>
          )}
          {heroUrl && (
            <div style={{ width: '100%', height: 'clamp(600px, 78vh, 960px)', overflow: 'hidden', background: '#1A1A18' }}>
              <style dangerouslySetInnerHTML={{ __html: focalCss }} />
              <img src={getPhotoUrl(heroUrl, 1920, 80, 'cover')} alt="" fetchPriority="high" decoding="async" className="gh" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ background: theme.bg, padding: '28px clamp(20px, 5vw, 64px) 20px', textAlign: 'center', borderBottom: `1px solid ${theme.border}` }}>
            <h1 style={{ color: theme.text, fontFamily: theme.fontFamily, fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: theme.headerStyle === 'bold' ? 700 : 400, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              {heroTitle}
            </h1>
            {formattedDate && (
              <p style={{ color: theme.textMuted, fontSize: '0.75rem', fontWeight: 400, letterSpacing: '0.06em', marginTop: 6, textTransform: 'uppercase' }}>{formattedDate}</p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.fontFamily }}>
        {theme.fontImport && <link rel="stylesheet" href={theme.fontImport} />}

        {heroBlock}

        {/* ── GALLERY CONTENT ── */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px 64px' }}>
          {sortedPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '96px 0' }}>
              <Images style={{ width: 40, height: 40, color: theme.textMuted, margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>Noch keine Fotos in dieser Galerie.</p>
            </div>
          ) : (
            <GalleryViewer
              galleryId={gallery!.id}
              projectId={project!.id}
              galleryTitle={gallery!.title || project!.title || 'Galerie'}
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
