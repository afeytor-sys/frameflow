'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, Images, Clock } from 'lucide-react'
import ContractTab from './ContractTab'
import GalleryTab from './GalleryTab'
import TimelineBuilder from './TimelineBuilder'
import type { Contract, Gallery, Timeline, Plan } from '@/types/database'

interface Props {
  project: { id: string; title: string; client_url: string; photographer_id: string; [key: string]: unknown }
  contracts: Contract[]
  gallery: (Gallery & { photos?: { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number; is_favorite: boolean }[] }) | null
  timeline: Timeline | null
  plan: Plan
}

const TABS = [
  { key: 'contract', label: 'Vertrag', icon: FileText },
  { key: 'gallery', label: 'Galerie', icon: Images },
  { key: 'timeline', label: 'Zeitplan', icon: Clock },
]

export default function ProjectTabs({ project, contracts, gallery, timeline, plan }: Props) {
  const [activeTab, setActiveTab] = useState('contract')

  const client = project.client as { full_name?: string; email?: string } | null
  const showWatermark = plan === 'free'

  // Extract timeline data
  const timelineId = timeline?.id ?? null
  const timelineEvents = (timeline?.events as { id: string; time: string; title: string; location?: string; duration_minutes?: number; phase: 'preparation' | 'shoot' | 'wrap' | 'other'; notes?: string; photographer_note?: string }[]) ?? []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px"
            style={{
              borderBottomColor: activeTab === key ? 'var(--accent)' : 'transparent',
              color: activeTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'contract' && (
          <ContractTab
            projectId={project.id}
            contracts={contracts}
            clientEmail={client?.email}
            clientName={client?.full_name}
          />
        )}
        {activeTab === 'gallery' && (
          <GalleryTab
            projectId={project.id}
            photographerId={project.photographer_id}
            clientUrl={project.client_url}
            gallery={gallery ? { id: gallery.id, title: gallery.title, description: gallery.description ?? null, status: gallery.status, password: gallery.password ?? null, watermark: gallery.watermark, download_enabled: gallery.download_enabled, comments_enabled: (gallery as { comments_enabled?: boolean }).comments_enabled ?? true, expires_at: gallery.expires_at ?? null, view_count: gallery.view_count, download_count: gallery.download_count } : null}
            photos={(gallery?.photos ?? []) as { id: string; storage_url: string; thumbnail_url: string | null; filename: string; file_size: number; display_order: number; is_favorite: boolean }[]}
            showWatermark={showWatermark}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineBuilder
            projectId={project.id}
            timelineId={timelineId}
            initialEvents={timelineEvents}
          />
        )}
      </div>
    </div>
  )
}
