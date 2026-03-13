import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Images } from 'lucide-react'
import GalleryViewer from '@/components/client-portal/GalleryViewer'

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
    .select('id, title, description, status, download_enabled, watermark, comments_enabled, view_count')
    .eq('project_id', project.id)
    .eq('status', 'active')
    .single()

  if (!gallery) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white">
        <Images className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Galerie wird vorbereitet</h2>
        <p className="text-white/50 text-sm">Dein Fotograf lädt bald deine Bilder hoch.</p>
        <Link href={`/client/${token}`} className="mt-6 text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Zurück zum Portal
        </Link>
      </div>
    )
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order, tag')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  // Increment view count (fire and forget)
  supabase
    .from('galleries')
    .update({ view_count: (gallery.view_count || 0) + 1 })
    .eq('id', gallery.id)
    .then(() => {})

  const sortedPhotos = (photos || []).sort((a, b) => a.display_order - b.display_order)

  // Format shoot date
  const shootDate = project.shoot_date
    ? new Date(project.shoot_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-[#0C0C0B]">
      {/* Hero Banner */}
      <div className="relative bg-[#0C0C0B] border-b border-white/5">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1510]/60 to-[#0C0C0B]" />

        <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16">
          {/* Back link */}
          <Link
            href={`/client/${token}`}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Portal
          </Link>

          {/* Studio name */}
          {photographer?.studio_name && (
            <p className="text-[#C8A882] text-xs font-semibold uppercase tracking-[0.15em] mb-3">
              {photographer.studio_name}
            </p>
          )}

          {/* Client name — big headline */}
          <h1 className="text-white font-light mb-2" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {client?.full_name || project.title}
          </h1>

          {/* Gallery title / project title */}
          <p className="text-white/50 text-lg font-light mb-6">
            {gallery.title || project.title}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/35">
            {shootDate && (
              <span>{shootDate}</span>
            )}
            {project.project_type && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="capitalize">{project.project_type}</span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{sortedPhotos.length} Fotos</span>
          </div>
        </div>
      </div>

      {/* Gallery content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {sortedPhotos.length === 0 ? (
          <div className="text-center py-24">
            <Images className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">Noch keine Fotos in dieser Galerie.</p>
          </div>
        ) : (
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
          />
        )}
      </div>
    </div>
  )
}
