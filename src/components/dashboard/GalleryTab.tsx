'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PhotoUploader from './PhotoUploader'
import { Images, Settings, Share2, Trash2, Heart, GripVertical, Lock } from 'lucide-react'
import { cn, copyToClipboard } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Photo {
  id: string
  storage_url: string
  thumbnail_url: string | null
  filename: string
  file_size: number
  display_order: number
  is_favorite: boolean
}

interface Gallery {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'expired'
  password: string | null
  watermark: boolean
  download_enabled: boolean
  comments_enabled: boolean
  expires_at: string | null
  view_count: number
  download_count: number
}

interface Props {
  projectId: string
  photographerId: string
  clientUrl: string
  gallery: Gallery | null
  photos: Photo[]
  showWatermark: boolean
}

// Sortable photo item
function SortablePhoto({
  photo,
  selected,
  onSelect,
  onDelete,
}: {
  photo: Photo
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all',
        selected ? 'border-[#C8A882]' : 'border-transparent'
      )}
    >
      <img
        src={photo.thumbnail_url || photo.storage_url}
        alt={photo.filename}
        className="w-full aspect-square object-cover"
        loading="lazy"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />

      {/* Select checkbox */}
      <button
        onClick={() => onSelect(photo.id)}
        className={cn(
          'absolute top-2 left-2 w-5 h-5 rounded border-2 transition-all',
          selected
            ? 'bg-[#C8A882] border-[#C8A882]'
            : 'bg-white/80 border-white opacity-0 group-hover:opacity-100'
        )}
      >
        {selected && (
          <svg className="w-3 h-3 text-white mx-auto" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 w-6 h-6 bg-black/40 rounded flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-all"
      >
        <GripVertical className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Favorite indicator */}
      {photo.is_favorite && (
        <div className="absolute bottom-2 left-2">
          <Heart className="w-3.5 h-3.5 text-white fill-white" />
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute bottom-2 right-2 w-6 h-6 bg-[#E84C1A]/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3 h-3 text-white" />
      </button>
    </div>
  )
}

export default function GalleryTab({ projectId, photographerId, clientUrl, gallery: initialGallery, photos: initialPhotos, showWatermark }: Props) {
  const [gallery, setGallery] = useState<Gallery | null>(initialGallery)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState(gallery?.title || 'Galerie')
  const [settingsDesc, setSettingsDesc] = useState(gallery?.description || '')
  const [settingsDownload, setSettingsDownload] = useState(gallery?.download_enabled ?? true)
  const [settingsComments, setSettingsComments] = useState(gallery?.comments_enabled ?? true)
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsExpiry, setSettingsExpiry] = useState(gallery?.expires_at?.split('T')[0] || '')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const supabase = createClient()

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({ ...p, display_order: i }))
    setPhotos(reordered)

    // Persist order
    await Promise.all(
      reordered.map((p) =>
        supabase.from('photos').update({ display_order: p.display_order }).eq('id', p.id)
      )
    )
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(photos.map((p) => p.id)))
  const clearSelection = () => setSelected(new Set())

  const deleteSelected = async () => {
    if (!confirm(`${selected.size} ${selected.size === 1 ? 'Foto' : 'Fotos'} wirklich löschen?`)) return
    const ids = Array.from(selected)

    // Delete from storage + DB
    for (const id of ids) {
      const photo = photos.find((p) => p.id === id)
      if (photo) {
        // Extract path from URL
        const url = new URL(photo.storage_url)
        const path = url.pathname.split('/photos/')[1]
        if (path) await supabase.storage.from('photos').remove([path])
      }
      await supabase.from('photos').delete().eq('id', id)
    }

    setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)))
    setSelected(new Set())
    toast.success(`${ids.length} ${ids.length === 1 ? 'Foto' : 'Fotos'} gelöscht`)
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Foto wirklich löschen?')) return
    const photo = photos.find((p) => p.id === id)
    if (photo) {
      const url = new URL(photo.storage_url)
      const path = url.pathname.split('/photos/')[1]
      if (path) await supabase.storage.from('photos').remove([path])
    }
    await supabase.from('photos').delete().eq('id', id)
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    toast.success('Foto gelöscht')
  }

  const createGallery = async () => {
    const { data, error } = await supabase
      .from('galleries')
      .insert({
        project_id: projectId,
        title: 'Galerie',
        status: 'active',
        watermark: showWatermark,
        download_enabled: true,
        view_count: 0,
        download_count: 0,
      })
      .select()
      .single()

    if (error) { toast.error('Fehler beim Erstellen der Galerie'); return }
    setGallery(data)
    setShowUploader(true)
    toast.success('Galerie erstellt')
  }

  const saveSettings = async () => {
    if (!gallery) return
    setSavingSettings(true)

    const updates: Record<string, unknown> = {
      title: settingsTitle,
      description: settingsDesc || null,
      download_enabled: settingsDownload,
      comments_enabled: settingsComments,
      expires_at: settingsExpiry ? new Date(settingsExpiry).toISOString() : null,
    }
    if (settingsPassword) updates.password = settingsPassword

    const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
    if (error) {
      toast.error('Fehler beim Speichern')
    } else {
      setGallery((prev) => prev ? { ...prev, ...updates as Partial<Gallery> } : prev)
      setShowSettings(false)
      toast.success('Einstellungen gespeichert')
    }
    setSavingSettings(false)
  }

  const toggleGalleryStatus = async () => {
    if (!gallery) return
    const newStatus = gallery.status === 'active' ? 'draft' : 'active'
    await supabase.from('galleries').update({ status: newStatus }).eq('id', gallery.id)
    setGallery((prev) => prev ? { ...prev, status: newStatus } : prev)
    toast.success(newStatus === 'active' ? 'Galerie aktiviert' : 'Galerie deaktiviert')
  }

  const shareGallery = async () => {
    const url = `${clientUrl}/gallery`
    const ok = await copyToClipboard(url)
    if (ok) toast.success('Link kopiert!')
  }

  // No gallery yet
  if (!gallery) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--bg-hover)' }}>
          <Images className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Noch keine Galerie für dieses Projekt</p>
        <button
          onClick={createGallery}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Galerie erstellen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{gallery.title}</h3>

          {/* Clickable status tag */}
          <button
            onClick={toggleGalleryStatus}
            title={gallery.status === 'active' ? 'Klicken zum Deaktivieren' : 'Klicken zum Aktivieren'}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer"
            style={{
              background: gallery.status === 'active' ? 'rgba(61,186,111,0.12)' : 'rgba(107,114,128,0.10)',
              color: gallery.status === 'active' ? '#3DBA6F' : 'var(--text-muted)',
              border: `1px solid ${gallery.status === 'active' ? 'rgba(61,186,111,0.25)' : 'var(--border-color)'}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block"
              style={{ background: gallery.status === 'active' ? '#3DBA6F' : 'var(--text-muted)' }} />
            {gallery.status === 'active' ? 'Aktiv' : 'Entwurf'}
          </button>

          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{photos.length} Fotos · {gallery.view_count} Aufrufe</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={shareGallery}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Share2 className="w-3.5 h-3.5" />
            Teilen
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Settings className="w-3.5 h-3.5" />
            Einstellungen
          </button>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-white"
            style={{ background: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            + Fotos hochladen
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl border p-5 space-y-4"
          style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Galerie-Einstellungen</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Titel</label>
              <input
                type="text"
                value={settingsTitle}
                onChange={(e) => setSettingsTitle(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Passwort (optional)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  placeholder={gallery.password ? '••••••••' : 'Kein Passwort'}
                  className="input-base pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Beschreibung</label>
              <input
                type="text"
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                placeholder="Optional"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Ablaufdatum (optional)</label>
              <input
                type="date"
                value={settingsExpiry}
                onChange={(e) => setSettingsExpiry(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Download toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setSettingsDownload(!settingsDownload)}
                className="relative cursor-pointer rounded-full transition-all"
                style={{
                  width: '36px',
                  height: '20px',
                  background: settingsDownload ? 'var(--accent)' : 'var(--border-strong)',
                }}
              >
                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: settingsDownload ? '16px' : '2px' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Download erlauben</span>
            </label>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={toggleGalleryStatus}
                className="relative cursor-pointer rounded-full transition-all"
                style={{
                  width: '36px',
                  height: '20px',
                  background: gallery.status === 'active' ? '#3DBA6F' : 'var(--border-strong)',
                }}
              >
                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: gallery.status === 'active' ? '16px' : '2px' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Galerie aktiv</span>
            </label>

            {/* Comments toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setSettingsComments(!settingsComments)}
                className="relative cursor-pointer rounded-full transition-all"
                style={{
                  width: '36px',
                  height: '20px',
                  background: settingsComments ? 'var(--accent)' : 'var(--border-strong)',
                }}
              >
                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: settingsComments ? '16px' : '2px' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Kommentare erlauben</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {savingSettings ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Uploader */}
      {showUploader && (
        <PhotoUploader
          galleryId={gallery.id}
          photographerId={photographerId}
          onUploadComplete={(newPhotos) => {
            setPhotos((prev) => [...prev, ...newPhotos.map((p) => ({ ...p, is_favorite: false }))])
            setShowUploader(false)
          }}
        />
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(200,168,130,0.10)', border: '1px solid rgba(200,168,130,0.20)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.size} ausgewählt</span>
          <button onClick={clearSelection} className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            Auswahl aufheben
          </button>
          <button onClick={selectAll} className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            Alle auswählen
          </button>
          <button
            onClick={deleteSelected}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors"
            style={{ background: '#E84C1A' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#D04418')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E84C1A')}
          >
            <Trash2 className="w-3 h-3" />
            Löschen
          </button>
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 rounded-xl"
          style={{ border: '2px dashed var(--border-color)' }}>
          <Images className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Noch keine Fotos. Lade deine ersten Fotos hoch.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  selected={selected.has(photo.id)}
                  onSelect={toggleSelect}
                  onDelete={deletePhoto}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

    </div>
  )
}
