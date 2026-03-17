'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Images, Plus, Eye, Download, Share2, X, Check, Lock, Sparkles, GripHorizontal, Trash2 } from 'lucide-react'
import { GALLERY_THEMES } from '@/lib/galleryThemes'
import toast from 'react-hot-toast'

interface Gallery {
  id: string
  title: string
  status: 'draft' | 'active' | 'expired'
  view_count: number
  download_count: number
  photo_count?: number
  cover_url?: string | null
  client_token?: string | null
  project?: { id: string; title: string; client?: { full_name: string } | { full_name: string }[] | null } | null
}

interface Project {
  id: string
  title: string
  client?: { full_name: string } | { full_name: string }[] | null
}

const SET_SUGGESTIONS = ['Getting Ready', 'Trauung', 'Feier', 'Portraits', 'Details', 'Highlights', 'Momente']

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Modal form state
  const [form, setForm] = useState({
    title: '',
    password: '',
    theme: 'classic-white',
    project_id: '',
    download_enabled: true,
    comments_enabled: true,
    tags_enabled: true,
  })
  const [sets, setSets] = useState<string[]>([])
  const [newSetName, setNewSetName] = useState('')

  const supabase = createClient()
  const userRef = useRef<{ id: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userRef.current = user

      const { data: projs } = await supabase
        .from('projects')
        .select('id, title, client:clients(full_name)')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false })
      setProjects((projs || []) as Project[])

      const projectIds = (projs || []).map(p => p.id)
      if (projectIds.length === 0) { setLoading(false); return }

      const { data } = await supabase
        .from('galleries')
        .select('id, title, status, view_count, download_count, project:projects(id, title, client_token, client:clients(full_name))')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      const enriched = await Promise.all(data.map(async (g) => {
        const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true }).eq('gallery_id', g.id)
        const { data: firstPhoto } = await supabase.from('photos').select('thumbnail_url, storage_url').eq('gallery_id', g.id).order('display_order', { ascending: true }).limit(1).single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proj = (g.project as any)
        return { ...g, photo_count: count || 0, cover_url: firstPhoto?.thumbnail_url || firstPhoto?.storage_url || null, client_token: proj?.client_token || null }
      }))

      setGalleries(enriched as unknown as Gallery[])
      setLoading(false)
    }
    load()
  }, [])

  const openModal = () => {
    setForm({ title: '', password: '', theme: 'classic-white', project_id: projects[0]?.id || '', download_enabled: true, comments_enabled: true, tags_enabled: true })
    setSets([])
    setNewSetName('')
    setShowModal(true)
  }

  const addSet = (name?: string) => {
    const n = (name || newSetName).trim()
    if (!n || sets.includes(n)) return
    setSets(prev => [...prev, n])
    setNewSetName('')
  }

  const removeSet = (name: string) => setSets(prev => prev.filter(s => s !== name))

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Bitte einen Titel eingeben'); return }
    if (!form.project_id) { toast.error('Please select a project'); return }
    setCreating(true)

    const { data: gallery, error } = await supabase
      .from('galleries')
      .insert({
        project_id: form.project_id,
        title: form.title.trim(),
        status: 'active',
        watermark: false,
        download_enabled: form.download_enabled,
        comments_enabled: form.comments_enabled,
        view_count: 0,
        download_count: 0,
        design_theme: form.theme,
        tags_enabled: form.tags_enabled ? ['green', 'yellow', 'red'] : [],
        ...(form.password ? { password: form.password } : {}),
      })
      .select('id, title, status, view_count, download_count, project:projects(id, title, client_token, client:clients(full_name))')
      .single()

    if (error) { toast.error('Error creating'); setCreating(false); return }

    // Create sets
    if (sets.length > 0) {
      await Promise.all(sets.map((title, i) =>
        supabase.from('gallery_sections').insert({ gallery_id: gallery.id, title, display_order: i })
      ))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proj = Array.isArray(gallery.project) ? (gallery.project as any)[0] : (gallery.project as any)
    const newGallery: Gallery = {
      id: gallery.id,
      title: gallery.title,
      status: gallery.status,
      view_count: gallery.view_count,
      download_count: gallery.download_count,
      photo_count: 0,
      cover_url: null,
      client_token: proj?.client_token || null,
      project: proj ? { id: proj.id, title: proj.title, client: proj.client } : null,
    }
    setGalleries(prev => [newGallery, ...prev])
    setShowModal(false)
    setCreating(false)
    toast.success('Galerie erstellt!')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="h-8 w-36 rounded-lg shimmer mb-2" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-56 rounded-2xl shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-black" style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            Galerien
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {galleries.length} {galleries.length === 1 ? 'Galerie' : 'Galerien'} · Teile deine Fotos mit Kunden
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{ background: '#10B981', boxShadow: '0 1px 8px rgba(16,185,129,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          New gallery
        </button>
      </div>

      {galleries.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleries.map((gallery) => {
            const project = gallery.project as { id: string; title: string; client?: { full_name: string } | { full_name: string }[] | null } | null
            const client = project?.client
            const clientName = Array.isArray(client) ? client[0]?.full_name : client?.full_name
            const isActive = gallery.status === 'active'

            const handleShare = (e: React.MouseEvent) => {
              e.preventDefault(); e.stopPropagation()
              if (!gallery.client_token) { toast.error('Kein Client-Token gefunden'); return }
              const url = `${window.location.origin}/client/${gallery.client_token}/gallery`
              navigator.clipboard.writeText(url).then(() => toast.success('Galerie-Link kopiert!')).catch(() => toast.error('Kopieren fehlgeschlagen'))
            }

            return (
              <div key={gallery.id} className="relative group">
                <Link
                  href={project ? `/dashboard/projects/${project.id}?tab=gallery` : '#'}
                  className="block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.18)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.30)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--card-shadow)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: 'var(--bg-hover)' }}>
                    {gallery.cover_url ? (
                      <img src={gallery.cover_url} alt={gallery.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Images className="w-8 h-8" style={{ color: 'var(--border-strong)', opacity: 0.4 }} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm"
                        style={{ background: isActive ? 'rgba(16,185,129,0.85)' : 'rgba(107,114,128,0.70)', color: '#fff' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                        {isActive ? 'Aktiv' : 'Draft'}
                      </span>
                    </div>
                    {gallery.client_token && (
                      <button onClick={handleShare} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }} title="Galerie-Link kopieren">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(gallery.photo_count || 0) > 0 && (
                      <div className="absolute bottom-2 right-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.60)', color: 'rgba(255,255,255,0.95)' }}>
                          {gallery.photo_count} Fotos
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-3.5 py-3">
                    <h3 className="font-bold text-[13.5px] truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{gallery.title}</h3>
                    {clientName && <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{clientName}</p>}
                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                        <Eye className="w-3 h-3" />{gallery.view_count}
                      </span>
                      {gallery.download_count > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                          <Download className="w-3 h-3" />{gallery.download_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-hover)' }}>
            <Images className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Noch keine Galerien</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Erstelle deine erste Galerie direkt hier</p>
          <button onClick={openModal} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#10B981' }}>
            <Plus className="w-3.5 h-3.5" />New gallery
          </button>
        </div>
      )}

      {/* ── Create Gallery Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[18px]" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>New gallery erstellen</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Konfiguriere deine Galerie vor dem Upload</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Galerie-Name *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="z.B. Hochzeit Anna & Max"
                    className="input-base w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Lock className="w-3 h-3 inline mr-1" />Passwort (optional)
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Kein Passwort"
                    className="input-base w-full"
                  />
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Projekt *</label>
                {projects.length > 0 ? (
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="input-base w-full">
                    <option value="">Select project...</option>
                    {projects.map(p => {
                      const c = p.client
                      const cn = Array.isArray(c) ? c[0]?.full_name : c?.full_name
                      return <option key={p.id} value={p.id}>{p.title}{cn ? ` — ${cn}` : ''}</option>
                    })}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    Kein Projekt vorhanden.{' '}
                    <a href="/dashboard/projects/new" className="font-medium" style={{ color: 'var(--accent)' }}>Projekt erstellen →</a>
                  </div>
                )}
              </div>

              {/* Sets */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <GripHorizontal className="w-3 h-3 inline mr-1" />Sets (optional)
                </label>
                <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Teile deine Galerie in Abschnitte auf (z.B. Getting Ready, Trauung)</p>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SET_SUGGESTIONS.filter(s => !sets.includes(s)).map(s => (
                    <button key={s} onClick={() => addSet(s)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                      + {s}
                    </button>
                  ))}
                </div>

                {/* Custom set input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSet() } }}
                    placeholder="Eigener Set-Name..."
                    className="input-base flex-1"
                  />
                  <button onClick={() => addSet()} disabled={!newSetName.trim()} className="px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Added sets */}
                {sets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sets.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.25)' }}>
                        <span className="text-[10px] font-bold opacity-50">{i + 1}</span>
                        {s}
                        <button onClick={() => removeSet(s)} className="w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="flex items-center gap-5 flex-wrap">
                {[
                  { label: 'Download erlauben', key: 'download_enabled' as const, color: 'var(--accent)' },
                  { label: 'Kommentare erlauben', key: 'comments_enabled' as const, color: 'var(--accent)' },
                  { label: 'Tag Auswahl', key: 'tags_enabled' as const, color: '#22C55E' },
                ].map(({ label, key, color }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))} className="relative cursor-pointer rounded-full"
                      style={{ width: '36px', height: '20px', background: form[key] ? color : 'var(--border-strong)', transition: 'background 150ms' }}>
                      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow" style={{ left: form[key] ? '16px' : '2px', transition: 'left 150ms' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Design / Theme */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Sparkles className="w-3 h-3 inline mr-1" />Layout / Design
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {GALLERY_THEMES.map(theme => (
                    <button key={theme.key} onClick={() => setForm(f => ({ ...f, theme: theme.key }))}
                      className="relative rounded-xl overflow-hidden text-left transition-all"
                      style={{ border: form.theme === theme.key ? '2px solid var(--accent)' : '2px solid var(--border-color)', boxShadow: form.theme === theme.key ? '0 0 0 3px rgba(196,164,124,0.2)' : 'none' }}>
                      <div className="h-10 flex flex-col justify-between p-1.5" style={{ background: theme.bg }}>
                        <div className="flex gap-0.5">
                          {[1,2,3].map(i => <div key={i} className="flex-1 rounded-sm" style={{ height: '12px', background: theme.surface, border: `1px solid ${theme.border}` }} />)}
                        </div>
                        <div className="h-0.5 rounded-full w-1/2" style={{ background: theme.accent, opacity: 0.7 }} />
                      </div>
                      <div className="px-1.5 py-1" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
                        <p className="text-[9px] font-semibold truncate" style={{ color: theme.text }}>{theme.name}</p>
                      </div>
                      {form.theme === theme.key && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title.trim() || !form.project_id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: '#10B981', boxShadow: '0 1px 8px rgba(16,185,129,0.25)' }}
              >
                {creating
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Sparkles className="w-4 h-4" />Galerie erstellen</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
