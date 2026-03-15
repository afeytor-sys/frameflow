import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Images, Download, Heart, Share2 } from 'lucide-react'
import GalleryViewer from '@/components/client-portal/GalleryViewer'
import { getTheme } from '@/lib/galleryThemes'

export default async function ClientGalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both custom slugs (e.g. "elisa") and raw client_token UUIDs
  let { data: project } = await supabase
    .from('projects')
    .select('id, title, photographer_id, shoot_date, location, photographer:photographers(studio_name, full_name, logo_url), client:clients(full_name)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('id, title, photographer_id, shoot_date, location, photographer:photographers(studio_name, full_name, logo_url), client:clients(full_name)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  if (!project) notFound()

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { plan: string; studio_name: string | null; full_name: string; logo_url: string | null } | null
  const client = (Array.isArray(project.client) ? project.client[0] : project.client) as { full_name: string } | null

  // Fetch all galleries for this project, prefer active ones with photos
  const { data: allGalleries, error: galleryError } = await supabase
    .from('galleries')
    .select('id, title, description, status, download_enabled, watermark')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  if (galleryError) {
    console.error('Gallery query error:', galleryError.message, galleryError.code)
  }

  // Pick the best gallery: first active, then any with photos, then most recent
  let gallery = null
  if (allGalleries && allGalleries.length > 0) {
    // Check each gallery for photos, starting with active ones
    const sorted = [
      ...allGalleries.filter(g => g.status === 'active'),
      ...allGalleries.filter(g => g.status !== 'active'),
    ]
    for (const g of sorted) {
      const { count } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('gallery_id', g.id)
      if ((count ?? 0) > 0) {
        gallery = g
        break
      }
    }
    // Fallback: just use the most recent gallery even if empty
    if (!gallery) gallery = allGalleries[0]
  }

  if (!gallery) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Images style={{ width: 28, height: 28, color: 'var(--text-muted)' }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Galerie wird vorbereitet</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>Dein Fotograf lädt bald deine Bilder hoch.</p>
        <Link href={`/client/${token}`} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Zurück zum Portal
        </Link>
      </div>
    )
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  const { data: sections } = await supabase
    .from('gallery_sections')
    .select('id, title, display_order')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  const sortedPhotos = (photos || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const gallerySections = sections || []

  // Hero image: first photo of the gallery
  const heroPhoto = sortedPhotos[0] ?? null
  const heroUrl = heroPhoto?.storage_url ?? null

  const theme = getTheme('classic-white')

  // Format shoot date
  const shootDate = (project as { shoot_date?: string | null }).shoot_date
  const location = (project as { location?: string | null }).location
  const formattedDate = shootDate
    ? new Date(shootDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const studioName = photographer?.studio_name || photographer?.full_name || null
  const displayName = client?.full_name || project.title
  const gallerySubtitle = gallery.title && gallery.title !== project.title ? gallery.title : null

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: theme.fontFamily }}>
      {theme.fontImport && <link rel="stylesheet" href={theme.fontImport} />}

      {/* ── HERO HEADER ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(480px, 60vw, 650px)',
          overflow: 'hidden',
          background: '#1A1A18',
        }}
      >
        {/* Background photo */}
        {heroUrl && (
          <img
            src={heroUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              filter: 'brightness(0.72)',
            }}
          />
        )}

        {/* Gradient overlay — top dark for nav, bottom dark for text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.65) 75%, rgba(0,0,0,0.82) 100%)',
        }} />

        {/* Bottom fade into page bg */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(to bottom, transparent, #F8F7F4)',
          zIndex: 2,
        }} />

        {/* Back link — top left */}
        <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10 }}>
          <Link
            href={`/client/${token}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
              background: 'rgba(0,0,0,0.28)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.12)',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Zurück zum Portal
          </Link>
        </div>

        {/* Hero text — bottom left */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 clamp(20px, 5vw, 64px) 48px',
          zIndex: 3,
        }}>
          {/* Studio name */}
          {studioName && (
            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              {studioName}
            </p>
          )}

          {/* Client name — big, font from gallery theme */}
          <h1 style={{
            color: '#FFFFFF',
            fontFamily: theme.fontFamily,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: theme.headerStyle === 'bold' ? 700 : 300,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: gallerySubtitle ? 6 : 12,
          }}>
            {displayName}
          </h1>

          {/* Gallery subtitle */}
          {gallerySubtitle && (
            <p style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 'clamp(0.9rem, 2vw, 1.125rem)',
              fontWeight: 300,
              marginBottom: 12,
              letterSpacing: '0.01em',
            }}>
              {gallerySubtitle}
            </p>
          )}

          {/* Date · Location */}
          {(formattedDate || location) && (
            <p style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.8125rem',
              fontWeight: 400,
              letterSpacing: '0.02em',
              marginBottom: 24,
            }}>
              {[formattedDate, location].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {gallery.download_enabled && sortedPhotos.length > 0 && (
              <button
                id="hero-download-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(255,255,255,0.95)',
                  color: '#111110',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '9px 20px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
                }}
              >
                <Download style={{ width: 14, height: 14 }} />
                Galerie herunterladen
              </button>
            )}
            <button
              id="hero-favorites-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px',
                padding: '9px 20px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              <Heart style={{ width: 14, height: 14 }} />
              Favoriten
            </button>
          </div>
        </div>
      </div>

      {/* ── GALLERY CONTENT ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px 64px' }}>
        {sortedPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '96px 0' }}>
            <Images style={{ width: 40, height: 40, color: '#B0ACA6', margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ color: '#B0ACA6', fontSize: '0.875rem' }}>Noch keine Fotos in dieser Galerie.</p>
          </div>
        ) : (
          <GalleryViewer
            galleryId={gallery.id}
            projectId={project.id}
            galleryTitle={gallery.title || project.title || 'Galerie'}
            clientName={client?.full_name || ''}
            initialPhotos={sortedPhotos}
            downloadEnabled={gallery.download_enabled}
            commentsEnabled={true}
            showWatermark={false}
            token={token}
            theme={theme}
            photoCount={sortedPhotos.length}
          />
        )}
      </div>
    </div>
  )
}
