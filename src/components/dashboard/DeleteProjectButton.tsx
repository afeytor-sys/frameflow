'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  projectTitle: string
  locale?: string
}

interface Counts {
  photoCount: number
  galleryCount: number
  questionnaireCount: number
  invoiceCount: number
  contractCount: number
  hasPortal: boolean
  hasBookingInfo: boolean
  hasNotes: boolean
}

interface Opts {
  photos: boolean
  galerie: boolean
  formulare: boolean
  rechnungen: boolean
  vertraege: boolean
  portal: boolean
  buchungsInfo: boolean
  notiz: boolean
}

const DEFAULT_OPTS: Opts = {
  photos: true, galerie: true, formulare: true,
  rechnungen: false, vertraege: false,
  portal: true, buchungsInfo: true, notiz: true,
}
const ALL_OPTS: Opts = {
  photos: true, galerie: true, formulare: true,
  rechnungen: true, vertraege: true,
  portal: true, buchungsInfo: true, notiz: true,
}

export default function DeleteProjectButton({ projectId, projectTitle, locale = 'de' }: Props) {
  const de = locale === 'de'
  const router = useRouter()
  const supabase = createClient()

  const [modal, setModal] = useState<Counts | null>(null)
  const [opts, setOpts] = useState<Opts>(DEFAULT_OPTS)
  const [deleting, setDeleting] = useState(false)

  const open = async () => {
    const [galleriesRes, { count: questionnaireCount }, { count: invoiceCount }, { count: contractCount }, projectRes] = await Promise.all([
      supabase.from('galleries').select('id').eq('project_id', projectId),
      supabase.from('questionnaires').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('projects').select('notes, shoot_date, location, shoot_time, client_token').eq('id', projectId).single(),
    ])
    const galleryIds = galleriesRes.data?.map(g => g.id) ?? []
    const galleryCount = galleryIds.length
    const { count: photoCount } = galleryIds.length > 0
      ? await supabase.from('photos').select('id', { count: 'exact', head: true }).in('gallery_id', galleryIds)
      : { count: 0 }

    const p = projectRes.data
    setOpts(DEFAULT_OPTS)
    setModal({
      photoCount: photoCount ?? 0,
      galleryCount,
      questionnaireCount: questionnaireCount ?? 0,
      invoiceCount: invoiceCount ?? 0,
      contractCount: contractCount ?? 0,
      hasPortal: !!p?.client_token,
      hasBookingInfo: !!(p?.shoot_date || p?.location || p?.shoot_time),
      hasNotes: !!p?.notes,
    })
  }

  const allChecked = () =>
    opts.photos && opts.galerie && opts.formulare && opts.rechnungen &&
    opts.vertraege && opts.portal && opts.buchungsInfo && opts.notiz

  const toggle = (k: keyof Opts) => setOpts(o => ({ ...o, [k]: !o[k] }))

  const confirmDelete = async () => {
    if (!modal) return
    setDeleting(true)
    if (opts.rechnungen) await supabase.from('invoices').delete().eq('project_id', projectId)
    if (opts.vertraege) await supabase.from('contracts').delete().eq('project_id', projectId)
    if (opts.formulare) await supabase.from('questionnaires').delete().eq('project_id', projectId)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    setDeleting(false)
    if (error) { toast.error(de ? 'Fehler beim Löschen' : 'Error deleting'); return }
    toast.success(de ? 'Projekt gelöscht' : 'Project deleted')
    router.push('/dashboard/projects')
  }

  type Item = { key: keyof Opts; label: string; count?: number; canKeep?: boolean; show: boolean }

  const getItems = (m: Counts): Item[] => [
    { key: 'photos',      label: de ? `Fotos${m.photoCount > 0 ? ` (${m.photoCount})` : ''}` : `Photos${m.photoCount > 0 ? ` (${m.photoCount})` : ''}`,            show: true },
    { key: 'galerie',     label: de ? `Galerie${m.galleryCount > 0 ? ` (${m.galleryCount})` : ''}` : `Gallery${m.galleryCount > 0 ? ` (${m.galleryCount})` : ''}`, show: true },
    { key: 'formulare',   label: de ? `Formulare${m.questionnaireCount > 0 ? ` (${m.questionnaireCount})` : ''}` : `Forms${m.questionnaireCount > 0 ? ` (${m.questionnaireCount})` : ''}`, show: m.questionnaireCount > 0 },
    { key: 'rechnungen',  label: de ? `Rechnungen${m.invoiceCount > 0 ? ` (${m.invoiceCount})` : ''}` : `Invoices${m.invoiceCount > 0 ? ` (${m.invoiceCount})` : ''}`,  canKeep: true, show: m.invoiceCount > 0 },
    { key: 'vertraege',   label: de ? `Verträge${m.contractCount > 0 ? ` (${m.contractCount})` : ''}` : `Contracts${m.contractCount > 0 ? ` (${m.contractCount})` : ''}`, canKeep: true, show: m.contractCount > 0 },
    { key: 'portal',      label: de ? 'Portal-Link & Zugang' : 'Portal link & access', show: m.hasPortal },
    { key: 'buchungsInfo',label: de ? 'Buchungs-Info (Datum, Ort, Zeit)' : 'Booking info (date, location, time)', show: m.hasBookingInfo },
    { key: 'notiz',       label: de ? 'Notiz' : 'Notes', show: m.hasNotes },
  ]

  return (
    <>
      <button
        onClick={open}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-90"
        style={{ background: 'rgba(196,59,44,0.08)', border: '1px solid rgba(196,59,44,0.15)', color: '#C43B2C' }}
        title={de ? 'Projekt löschen' : 'Delete project'}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{de ? 'Löschen' : 'Delete'}</span>
      </button>

      {modal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,59,44,0.10)' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: '#C43B2C' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{de ? 'Projekt löschen' : 'Delete project'}</p>
                <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{projectTitle}</p>
              </div>
              <button onClick={() => setModal(null)} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="px-3 py-3">
              <div className="flex items-center justify-between px-2 mb-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  {de ? 'Was soll gelöscht werden?' : 'What to delete?'}
                </p>
                <button
                  onClick={() => setOpts(allChecked() ? DEFAULT_OPTS : ALL_OPTS)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ color: '#C43B2C', background: 'rgba(196,59,44,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.08)')}
                >
                  {allChecked() ? (de ? 'Alle abwählen' : 'Deselect all') : (de ? 'Alle markieren' : 'Select all')}
                </button>
              </div>

              <div className="space-y-0.5">
                {getItems(modal).filter(i => i.show).map(item => {
                  const checked = opts[item.key]
                  return (
                    <label key={item.key} className="flex items-center gap-3 cursor-pointer py-1.5 px-3 rounded-xl transition-colors"
                      style={{ background: checked ? 'rgba(196,59,44,0.07)' : 'transparent' }}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(item.key)} className="w-4 h-4 cursor-pointer flex-shrink-0" style={{ accentColor: '#C43B2C' }} />
                      <span className="text-[13px] flex-1" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                      {item.canKeep && !checked && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(61,186,111,0.10)', color: '#3DBA6F' }}>
                          {de ? 'bleibt' : 'kept'}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 pb-5 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                {de ? 'Abbrechen' : 'Cancel'}
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 px-6 rounded-xl text-[13px] font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: '#C43B2C' }}>
                {deleting ? '...' : (de ? 'Löschen' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
