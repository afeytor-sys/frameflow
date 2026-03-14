import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Images } from 'lucide-react'
import GalleryViewer from '@/components/client-portal/GalleryViewer'
import { getTheme } from '@/lib/galleryThemes'

export default async function ClientGalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, shoot_date, project_type, photographer_id, photographer:photographers(plan, studio_name, full_name, logo_url), client:clients(full_name)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { plan: string; studio_name: string | null; full_name: string; logo_url: string | null } | null
  const client = (Array.isArray(project.client) ? project.client[0] : project.client) as { full_name: string } | null

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, description, status, download_enabled, watermark, comments_enabled, view_count, design_theme')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

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

  // Load photos with section_id
  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order, tag, section_id')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  // Load sections
  const { data: sections } = await supabase
    .from('gallery_sections')
    .select('id, title, display_order')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  // Increment view count (fire and forget)
  supabase
    .from('galleries')
    .update({ view_count: (gallery.view_count || 0) + 1 })
    .eq('id', gallery.id)
    .then(() => {})

  const sortedPhotos = (photos || []).sort((a, b) => a.display_order - b.display_order)
  const gallerySections = sections || []

  // Get theme
  const theme = getTheme(gallery.design_theme || 'classic-white')

  // Format shoot date
  const shootDate = project.shoot_date
    ? new Date(project.shoot_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // Grid columns CSS
  const gridCols = theme.grid === '2col' ? 'repeat(2, 1fr)' : theme.grid === '4col' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.fontFamily }}>
      {/* Font import */}
      {theme.fontImport && (
        <link rel="stylesheet" href={theme.fontImport} />
      )}

      {/* Hero Banner */}
      <div style={{
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        padding: '48px 24px 40px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Back link */}
          <Link
            href={`/client/${token}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: theme.textMuted, fontSize: '0.875rem', marginBottom: 32, textDecoration: 'none' }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Zurück zum Portal
          </Link>

          {/* Studio name */}
          {photographer?.studio_name && (
            <p style={{ color: theme.accent, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
              {photographer.studio_name}
            </p>
          )}

          {/* Client name — big headline */}
          <h1 style={{
            color: theme.text,
            fontFamily: theme.fontFamily,
            fontSize: theme.titleSize,
            fontWeight: theme.headerStyle === 'bold' ? 700 : 300,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: 8,
            textAlign: theme.headerStyle === 'centered' ? 'center' : 'left',
          }}>
            {client?.full_name || project.title}
          </h1>

          {/* Gallery title */}
          <p style={{ color: theme.textMuted, fontSize: '1.125rem', fontWeight: 300, marginBottom: 24, textAlign: theme.headerStyle === 'centered' ? 'center' : 'left' }}>
            {gallery.title || project.title}
          </p>

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: '0.875rem', color: theme.textMuted, justifyContent: theme.headerStyle === 'centered' ? 'center' : 'flex-start' }}>
            {shootDate && <span>{shootDate}</span>}
            {project.project_type && (
              <>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: theme.border, display: 'inline-block' }} />
                <span style={{ textTransform: 'capitalize' }}>{project.project_type}</span>
              </>
            )}
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: theme.border, display: 'inline-block' }} />
            <span>{sortedPhotos.length} Fotos</span>
            {gallerySections.length > 0 && (
              <>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: theme.border, display: 'inline-block' }} />
                <span>{gallerySections.length} Sets</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gallery content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {sortedPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '96px 0' }}>
            <Images style={{ width: 40, height: 40, color: theme.textMuted, margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>Noch keine Fotos in dieser Galerie.</p>
          </div>
        ) : gallerySections.length > 0 ? (
          // Sectioned view
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {gallerySections.map(section => {
              const sectionPhotos = sortedPhotos.filter(p => (p as { section_id?: string | null }).section_id === section.id)
              if (sectionPhotos.length === 0) return null
              return (
                <div key={section.id}>
                  <div style={{ marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${theme.border}` }}>
                    <h2 style={{ color: theme.text, fontFamily: theme.fontFamily, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                      {section.title}
                    </h2>
                    <p style={{ color: theme.textMuted, fontSize: '0.8rem', marginTop: 4 }}>{sectionPhotos.length} Fotos</p>
                  </div>
                  <GalleryViewer
                    galleryId={gallery.id}
                    projectId={project.id}
                    galleryTitle={section.title}
                    clientName={client?.full_name || ''}
                    initialPhotos={sectionPhotos}
                    downloadEnabled={gallery.download_enabled}
                    commentsEnabled={gallery.comments_enabled ?? true}
                    showWatermark={false}
                    token={token}
                    theme={theme}
                  />
                </div>
              )
            })}
            {/* Unsectioned photos */}
            {(() => {
              const unsectioned = sortedPhotos.filter(p => !(p as { section_id?: string | null }).section_id)
              if (unsectioned.length === 0) return null
              return (
                <div>
                  <div style={{ marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${theme.border}` }}>
                    <h2 style={{ color: theme.text, fontFamily: theme.fontFamily, fontSize: '1.25rem', fontWeight: 600 }}>Weitere Fotos</h2>
                    <p style={{ color: theme.textMuted, fontSize: '0.8rem', marginTop: 4 }}>{unsectioned.length} Fotos</p>
                  </div>
                  <GalleryViewer
                    galleryId={gallery.id}
                    projectId={project.id}
                    galleryTitle={gallery.title || project.title || 'Galerie'}
                    clientName={client?.full_name || ''}
                    initialPhotos={unsectioned}
                    downloadEnabled={gallery.download_enabled}
                    commentsEnabled={gallery.comments_enabled ?? true}
                    showWatermark={false}
                    token={token}
                    theme={theme}
                  />
                </div>
              )
            })()}
          </div>
        ) : (
          // No sections — single grid
          <GalleryViewer
            galleryId={gallery.id}
            projectId={project.id}
            galleryTitle={gallery.title || project.title || 'Galerie'}
            clientName={client?.full_name || ''}
            initialPhotos={sortedPhotos}
            downloadEnabled={gallery.download_enabled}
            commentsEnabled={gallery.comments_enabled ?? true}
            showWatermark={false}
            token={token}
            theme={theme}
          />
        )}
      </div>
    </div>
  )
}
