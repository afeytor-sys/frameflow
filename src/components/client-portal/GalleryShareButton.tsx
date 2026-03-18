'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import GalleryShareModal from '@/components/dashboard/GalleryShareModal'

interface Props {
  galleryUrl: string
  galleryPassword: string | null
  galleryTitle?: string
  galleryId?: string | null
  studioName?: string
  clientName?: string
}

export default function GalleryShareButton({
  galleryUrl,
  galleryPassword,
  galleryTitle = 'Galerie',
  galleryId,
  studioName,
  clientName,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
        style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}
      >
        <Share2 className="w-3.5 h-3.5" />
        Teilen
      </button>

      <GalleryShareModal
        open={open}
        onClose={() => setOpen(false)}
        galleryTitle={galleryTitle}
        galleryUrl={galleryUrl}
        galleryPassword={galleryPassword}
        galleryId={galleryId}
        studioName={studioName}
        clientName={clientName}
      />
    </>
  )
}
