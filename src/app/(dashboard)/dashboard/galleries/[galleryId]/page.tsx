import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import GalleryDetailClient from './GalleryDetailClient'

export default async function GalleryDetailPage({ params }: { params: Promise<{ galleryId: string }> }) {
  const { galleryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // Fetch gallery with project + client data in one query
  const { data: gallery } = await supabase
    .from('galleries')
    .select('*, share_token, custom_slug, project:projects(id, title, client_token, custom_slug, photographer_id, client:clients(full_name, email))')
    .eq('id', galleryId)
    .single()

  if (!gallery) return notFound()

  const project = gallery.project as {
    id: string
    title: string
    client_token?: string | null
    custom_slug?: string | null
    photographer_id: string
    client?: { full_name: string; email?: string | null } | { full_name: string; email?: string | null }[] | null
  } | null

  // Verify ownership: via project.photographer_id if linked, else via gallery.photographer_id
  const galleryPhotographerId = (gallery as unknown as { photographer_id?: string }).photographer_id
  const ownedViaProject = project && project.photographer_id === user.id
  const ownedDirectly = !project && galleryPhotographerId === user.id
  if (!ownedViaProject && !ownedDirectly) return notFound()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('studio_name, full_name')
    .eq('id', user.id)
    .single()

  const studioName = photographer?.studio_name || photographer?.full_name || null

  // Build client portal URL (only if gallery is linked to a project)
  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = forwardedHost || headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const portalToken = project?.custom_slug || project?.client_token
  const clientUrl = portalToken
    ? `${protocol}://${host}/client/${portalToken}`
    : null

  const client = project ? (Array.isArray(project.client) ? project.client[0] : project.client) : null

  return (
    <GalleryDetailClient
      gallery={{
        id: gallery.id,
        title: gallery.title,
        description: (gallery.description as string | null) ?? null,
        status: gallery.status as 'draft' | 'active' | 'expired',
        password: (gallery.password as string | null) ?? null,
        guest_password: (gallery.guest_password as string | null) ?? null,
        cover_photo_id: (gallery.cover_photo_id as string | null) ?? null,
        watermark: (gallery.watermark as boolean) ?? false,
        download_enabled: (gallery.download_enabled as boolean) ?? true,
        comments_enabled: (gallery.comments_enabled as boolean) ?? true,
        expires_at: (gallery.expires_at as string | null) ?? null,
        view_count: (gallery.view_count as number) ?? 0,
        download_count: (gallery.download_count as number) ?? 0,
        photo_download_count: (gallery.photo_download_count as number | null) ?? undefined,
        design_theme: (gallery.design_theme as string | null) ?? null,
        tags_enabled: Array.isArray(gallery.tags_enabled) ? (gallery.tags_enabled as string[]) : null,
      }}
      projectId={project?.id ?? null}
      projectTitle={project?.title ?? null}
      photographerId={user.id}
      clientUrl={clientUrl}
      clientEmail={client?.email ?? null}
      clientName={client?.full_name ?? null}
      currentSlug={project?.custom_slug ?? null}
      clientToken={project?.client_token ?? null}
      studioName={studioName}
      galleryShareToken={(gallery as unknown as { share_token?: string | null }).share_token ?? null}
      galleryCustomSlug={project ? null : (gallery as unknown as { custom_slug?: string | null }).custom_slug ?? null}
    />
  )
}
