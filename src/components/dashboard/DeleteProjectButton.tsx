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
  invoiceCount: number
  contractCount: number
  galleryCount: number
  questionnaireCount: number
}

interface Opts {
  galleries: boolean
  timeline: boolean
  invoices: boolean
  contracts: boolean
  questionnaires: boolean
}

const DEFAULT_OPTS: Opts = { galleries: true, timeline: true, invoices: false, contracts: false, questionnaires: false }
const ALL_OPTS: Opts    = { galleries: true, timeline: true, invoices: true,  contracts: true,  questionnaires: true  }

export default function DeleteProjectButton({ projectId, projectTitle, locale = 'de' }: Props) {
  const de = locale === 'de'
  const router = useRouter()
  const supabase = createClient()

  const [modal, setModal] = useState<Counts | null>(null)
  const [opts, setOpts] = useState<Opts>(DEFAULT_OPTS)
  const [deleting, setDeleting] = useState(false)

  const open = async () => {
    const [{ count: invoiceCount }, { count: contractCount }, { count: galleryCount }, { count: questionnaireCount }] = await Promise.all([
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('galleries').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('questionnaires').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    ])
    setOpts(DEFAULT_OPTS)
    setModal({ invoiceCount: invoiceCount ?? 0, contractCount: contractCount ?? 0, galleryCount: galleryCount ?? 0, questionnaireCount: questionnaireCount ?? 0 })
  }

  const allChecked = (m: Counts) =>
    opts.galleries && opts.timeline && opts.invoices && opts.contracts && opts.questionnaires &&
    (m.invoiceCount === 0 || opts.invoices) && (m.contractCount === 0 || opts.contracts) && (m.questionnaireCount === 0 || opts.questionnaires)

  const toggle = (k: keyof Opts) => setOpts(o => ({ ...o, [k]: !o[k] }))

  const confirmDelete = async () => {
    if (!modal) return
    setDeleting(true)
    if (opts.invoices) await supabase.from('invoices').delete().eq('project_id', projectId)
    if (opts.contracts) await supabase.from('contracts').delete().eq('project_id', projectId)
    if (opts.questionnaires) await supabase.from('questionnaires').delete().eq('project_id', projectId)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    setDeleting(false)
    if (error) { toast.error(de ? 'Fehler beim Löschen' : 'Error deleting'); return }
    toast.success(de ? 'Projekt gelöscht' : 'Project deleted')
    router.push('/dashboard/projects')
  }

  const CheckRow = ({ checked, onChange, label, kept }: { checked: boolean; onChange: () => void; label: string; kept?: boolean }) => (
    <label className="flex items-center gap-3 cursor-pointer py-1.5 px-3 rounded-xl transition-colors"
      style={{ background: checked ? 'rgba(196,59,44,0.07)' : 'transparent' }}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 cursor-pointer flex-shrink-0" style={{ accentColor: '#C43B2C' }} />
      <span className="text-[13px] flex-1" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
      {kept && !checked && (
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(61,186,111,0.10)', color: '#3DBA6F' }}>
          {de ? 'bleibt' : 'kept'}
        </span>
      )}
    </label>
  )

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
                  onClick={() => setOpts(allChecked(modal) ? DEFAULT_OPTS : ALL_OPTS)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ color: '#C43B2C', background: 'rgba(196,59,44,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.08)')}
                >
                  {allChecked(modal) ? (de ? 'Alle abwählen' : 'Deselect all') : (de ? 'Alle markieren' : 'Select all')}
                </button>
              </div>

              <div className="space-y-0.5">
                <CheckRow checked={opts.galleries} onChange={() => toggle('galleries')}
                  label={`${de ? 'Galerien & Fotos' : 'Galleries & Photos'}${modal.galleryCount > 0 ? ` (${modal.galleryCount})` : ''}`} />
                <CheckRow checked={opts.timeline} onChange={() => toggle('timeline')}
                  label={de ? 'Timeline, Moodboard, geplante E-Mails' : 'Timeline, moodboard, scheduled emails'} />
                {modal.invoiceCount > 0 && (
                  <CheckRow checked={opts.invoices} onChange={() => toggle('invoices')} kept
                    label={de ? `Rechnungen (${modal.invoiceCount})` : `Invoices (${modal.invoiceCount})`} />
                )}
                {modal.contractCount > 0 && (
                  <CheckRow checked={opts.contracts} onChange={() => toggle('contracts')} kept
                    label={de ? `Verträge (${modal.contractCount})` : `Contracts (${modal.contractCount})`} />
                )}
                {modal.questionnaireCount > 0 && (
                  <CheckRow checked={opts.questionnaires} onChange={() => toggle('questionnaires')} kept
                    label={de ? `Formulare (${modal.questionnaireCount})` : `Forms (${modal.questionnaireCount})`} />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 pb-5 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                {de ? 'Abbrechen' : 'Cancel'}
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-2 py-2.5 px-6 rounded-xl text-[13px] font-bold text-white transition-colors disabled:opacity-50"
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
