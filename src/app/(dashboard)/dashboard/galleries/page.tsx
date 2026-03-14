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

      const { data } = await supabase
        .from('galleries')
        .select('id, title, status, view_count, download_count, project:projects(id, title, client:clients(full_name))')
        .eq('photographer_id', user.id)
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
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Galerien</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{galleries.length} Galerien insgesamt</p>
        </div>
      </div>

      {galleries.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleries.map((gallery) => {
            const project = gallery.project as { id: string; title: string; client?: { full_name: string } | { full_name: string }[] | null } | null
            const client = project?.client
            const clientName = Array.isArray(client) ? client[0]?.full_name : client?.full_name
            const isActive = gallery.status === 'active'

            return (
              <Link
                key={gallery.id}
                href={project ? `/dashboard/projects/${project.id}?tab=gallery` : '#'}
                className="group block rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--card-shadow)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,164,124,0.3)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'
                }}
              >
                {/* Cover photo */}
                <div className="relative h-44 overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  {gallery.cover_url ? (
                    <img
                      src={gallery.cover_url}
                      alt={gallery.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-10 h-10" style={{ color: 'var(--border-strong)' }} />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)'
                  }} />

                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm"
                      style={{
                        background: isActive ? 'rgba(42,155,104,0.85)' : 'rgba(107,114,128,0.75)',
                        color: '#fff',
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      {isActive ? 'Aktiv' : 'Entwurf'}
                    </span>
                  </div>

                  {/* Photo count bottom-left */}
                  {(gallery.photo_count || 0) > 0 && (
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[12px] font-semibold text-white/90">
                        {gallery.photo_count} {gallery.photo_count === 1 ? 'Foto' : 'Fotos'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <h3 className="font-semibold text-[14px] mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                    {gallery.title}
                  </h3>
                  {clientName && (
                    <p className="text-[12.5px] truncate mb-3" style={{ color: 'var(--text-muted)' }}>
                      {clientName}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      <Eye className="w-3.5 h-3.5" />
                      {gallery.view_count} Aufrufe
                    </span>
                    {gallery.download_count > 0 && (
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        <Download className="w-3.5 h-3.5" />
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
