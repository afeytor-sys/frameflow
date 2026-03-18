import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { Images } from 'lucide-react'
import GalleryViewer from '@/components/client-portal/GalleryViewer'
import { getTheme } from '@/lib/galleryThemes'

export default async function PublicGalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both custom slugs and raw client_token UUIDs
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

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { studio_name: string | null; full_name: string; logo_url: string | null } | null
  const client = (Array.isArray(project.client) ? project.client[0] : project.client) as { full_name: string } | null

  // Fetch active gallery with photos
  const { data: allGalleries } = await supabase
    .from('galleries')
    .select('id, title, description, status, download_enabled, watermark, design_theme')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  let gallery = null
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

  if (!gallery) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Images style={{ width: 28, height: 28, color: '#B0ACA6' }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: '#111110', letterSpacing: '-0.02em' }}>Galerie wird vorbereitet</h2>
        <p style={{ color: '#7A7670', fontSize: '0.875rem' }}>Die Fotos werden bald verfügbar sein.</p>
      </div>
    )
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  const sortedPhotos = (photos || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  // Hero image
  const heroUrl = sortedPhotos[0]?.storage_url ?? null

  const theme = getTheme((gallery as { design_theme?: string | null }).design_theme || 'classic-white')

  const shootDate = (project as { shoot_date?: string | null }).shoot_date
  const formattedDate = shootDate
    ? new Date(shootDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const heroTitle = gallery.title || project.title

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: theme.fontFamily }}>
      {theme.fontImport && <link rel="stylesheet" href={theme.fontImport} />}

      {/* ── HERO HEADER — no back button ── */}
      <div style={{ position: 'relative' }}>
        {/* Studio branding — top left, over the photo */}
        {photographer && (
          <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
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
        )}

        {/* Hero photo — full width, no overlay, no gradient */}
        {heroUrl && (
          <div style={{
            width: '100%',
            height: 'clamp(480px, 65vw, 720px)',
            overflow: 'hidden',
            background: '#1A1A18',
          }}>
            <img
              src={heroUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 30%',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Text block — below the photo, clean background */}
        <div style={{
          background: '#F8F7F4',
          padding: '28px clamp(20px, 5vw, 64px) 20px',
          textAlign: 'center',
          borderBottom: '1px solid #E8E4DC',
        }}>
          <h1 style={{
            color: '#111110',
            fontFamily: theme.fontFamily,
            fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
            fontWeight: theme.headerStyle === 'bold' ? 700 : 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
          }}>
            {heroTitle}
          </h1>
          {formattedDate && (
            <p style={{
              color: '#9A9690',
              fontSize: '0.75rem',
              fontWeight: 400,
              letterSpacing: '0.06em',
              marginTop: 6,
              textTransform: 'uppercase',
            }}>
              {formattedDate}
            </p>
          )}
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
            commentsEnabled={false}
            showWatermark={false}
            token={token}
            theme={theme}
            photoCount={sortedPhotos.length}
            isPublic={true}
          />
        )}
      </div>
    </div>
  )
}
