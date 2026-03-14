'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Images, Plus, Eye, Download } from 'lucide-react'

interface Gallery {
  id: string
  title: string
  status: 'draft' | 'active' | 'expired'
  view_count: number
  download_count: number
  photo_count?: number
  cover_url?: string | null
  project?: { id: string; title: string; client?: { full_name: string } | { full_name: string }[] | null } | null
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // galleries don't have photographer_id — fetch via projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('photographer_id', user.id)

      const projectIds = (projects || []).map(p => p.id)
      if (projectIds.length === 0) { setLoading(false); return }

      const { data } = await supabase
        .from('galleries')
        .select('id, title, status, view_count, download_count, project:projects(id, title, client:clients(full_name))')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      // For each gallery, get photo count + first photo as cover
      const enriched = await Promise.all(data.map(async (g) => {
        const { count } = await supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('gallery_id', g.id)

        const { data: firstPhoto } = await supabase
          .from('photos')
          .select('thumbnail_url, storage_url')
          .eq('gallery_id', g.id)
          .order('display_order', { ascending: true })
          .limit(1)
          .single()

        return {
          ...g,
          photo_count: count || 0,
          cover_url: firstPhoto?.thumbnail_url || firstPhoto?.storage_url || null,
        }
      }))

      setGalleries(enriched as unknown as Gallery[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in">
        <div className="h-8 w-36 rounded-lg shimmer mb-2" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-56 rounded-2xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Galerien</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{galleries.length} Galerien insgesamt</p>
        </div>
      </div>

      {galleries.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleries.map((gallery) => {
            const project = gallery.project as { id: string; title: string; client?: { full_name: string } | { full_name: string }[] | null } | null
            const client = project?.client
            const clientName = Array.isArray(client) ? client[0]?.full_name : client?.full_name
            const isActive = gallery.status === 'active'

            return (
              <Link
                key={gallery.id}
                href={project ? `/dashboard/projects/${project.id}?tab=gallery` : '#'}
                className="group block rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {/* Cover photo — compact */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: 'var(--bg-hover)' }}>
                  {gallery.cover_url ? (
                    <img
                      src={gallery.cover_url}
                      alt={gallery.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-8 h-8" style={{ color: 'var(--border-strong)', opacity: 0.4 }} />
                    </div>
                  )}

                  {/* Status dot */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm"
                      style={{
                        background: isActive ? 'rgba(42,155,104,0.85)' : 'rgba(107,114,128,0.70)',
                        color: '#fff',
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      {isActive ? 'Aktiv' : 'Entwurf'}
                    </span>
                  </div>

                  {/* Photo count */}
                  {(gallery.photo_count || 0) > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.9)' }}>
                        {gallery.photo_count}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body — minimal */}
                <div className="px-3 py-2.5">
                  <h3 className="font-semibold text-[13px] truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {gallery.title}
                  </h3>
                  {clientName && (
                    <p className="text-[11.5px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {clientName}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <Eye className="w-3 h-3" />
                      {gallery.view_count}
                    </span>
                    {gallery.download_count > 0 && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <Download className="w-3 h-3" />
                        {gallery.download_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-hover)' }}>
            <Images className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Galerien</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Erstelle eine Galerie in einem Projekt</p>
          <Link href="/dashboard/projects"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--text-primary)' }}>
            <Plus className="w-3.5 h-3.5" />
            Zu den Projekten
          </Link>
        </div>
      )}
    </div>
  )
}
