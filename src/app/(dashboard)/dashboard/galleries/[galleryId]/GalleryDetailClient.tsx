'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GalleryTab from '@/components/dashboard/GalleryTab'
import UpgradeModal from '@/components/dashboard/UpgradeModal'
import { usePlanLimits } from '@/hooks/usePlanLimits'

interface Gallery {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'expired'
  password: string | null
  guest_password?: string | null
  cover_photo_id?: string | null
  watermark: boolean
  download_enabled: boolean
  comments_enabled: boolean
  expires_at: string | null
  view_count: number
  download_count: number
  photo_download_count?: number
  design_theme?: string | null
  tags_enabled?: string[] | null
}

interface Props {
  gallery: Gallery
  projectId: string
  projectTitle: string
  photographerId: string
  clientUrl: string
  clientEmail: string | null
  clientName: string | null
  currentSlug: string | null
  clientToken: string | null
}

export default function GalleryDetailClient({
  gallery,
  projectId,
  projectTitle,
  photographerId,
  clientUrl,
  clientEmail,
  clientName,
  currentSlug,
  clientToken,
}: Props) {
  const planLimits = usePlanLimits()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  return (
    <div className="space-y-0 animate-in">

      {/* Header */}
      <div
        className="rounded-2xl mb-5 overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), rgba(196,164,124,0.4))' }} />
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/galleries"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-80 flex-shrink-0"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1
                className="font-display text-[22px] font-black leading-tight truncate"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
              >
                {gallery.title}
              </h1>
              <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {projectTitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery editor */}
      <GalleryTab
        projectId={projectId}
        photographerId={photographerId}
        clientUrl={clientUrl}
        gallery={gallery}
        photos={[]}
        showWatermark={false}
        canUploadFile={planLimits.canUploadFile}
        maxStorageBytes={planLimits.limits.maxStorageBytes}
        storageUsedBytes={planLimits.storageUsedBytes}
        onStorageLimitReached={() => setShowUpgradeModal(true)}
        clientEmail={clientEmail}
        clientName={clientName}
        currentSlug={currentSlug}
        clientToken={clientToken}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={planLimits.plan}
      />
    </div>
  )
}
