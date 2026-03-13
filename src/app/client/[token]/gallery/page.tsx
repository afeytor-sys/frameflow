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
    .select('id, title, photographer_id, photographer:photographers(plan)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { plan: string } | null
  const showWatermark = !['starter', 'pro', 'studio'].includes(photographer?.plan || '')

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, description, status, download_enabled, watermark, view_count')
    .eq('project_id', project.id)
    .eq('status', 'active')
    .single()

  if (!gallery) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/client/${token}`} className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <h1 className="font-display text-xl font-semibold text-[#1A1A1A]">🖼️ Galerie</h1>
        </div>
        <div className="text-center py-16 bg-white rounded-xl border border-[#E8E8E4]">
          <Images className="w-10 h-10 text-[#E8E8E4] mx-auto mb-3" />
          <p className="text-[#6B6B6B] text-sm">Die Galerie wird noch vorbereitet.</p>
          <p className="text-xs text-[#6B6B6B] mt-1">Dein Fotograf lädt bald deine Bilder hoch.</p>
        </div>
      </div>
    )
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url, filename, is_favorite, display_order')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  // Increment view count (fire and forget)
  supabase
    .from('galleries')
    .update({ view_count: (gallery.view_count || 0) + 1 })
    .eq('id', gallery.id)
    .then(() => {})

  const sortedPhotos = (photos || []).sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/client/${token}`} className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <h1 className="font-display text-xl font-semibold text-[#1A1A1A]">🖼️ {gallery.title || 'Galerie'}</h1>
        </div>
        <span className="text-sm text-[#6B6B6B]">{sortedPhotos.length} Fotos</span>
      </div>

      {gallery.description && (
        <p className="text-sm text-[#6B6B6B]">{gallery.description}</p>
      )}

      {sortedPhotos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E8E8E4]">
          <Images className="w-10 h-10 text-[#E8E8E4] mx-auto mb-3" />
          <p className="text-[#6B6B6B] text-sm">Noch keine Fotos in dieser Galerie.</p>
        </div>
      ) : (
        <GalleryViewer
          galleryId={gallery.id}
          galleryTitle={gallery.title || 'Galerie'}
          initialPhotos={sortedPhotos}
          downloadEnabled={gallery.download_enabled}
          showWatermark={false}
          token={token}
        />
      )}
    </div>
  )
}
