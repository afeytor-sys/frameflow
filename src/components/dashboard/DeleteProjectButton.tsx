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

export default function DeleteProjectButton({ projectId, projectTitle, locale = 'de' }: Props) {
  const de = locale === 'de'
  const router = useRouter()
  const supabase = createClient()

  const [modal, setModal] = useState<{
    invoiceCount: number; contractCount: number; galleryCount: number; questionnaireCount: number
  } | null>(null)
  const [opts, setOpts] = useState({ invoices: false, contracts: false, questionnaires: false })
  const [deleting, setDeleting] = useState(false)

  const open = async () => {
    const [{ count: invoiceCount }, { count: contractCount }, { count: galleryCount }, { count: questionnaireCount }] = await Promise.all([
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('galleries').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('questionnaires').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    ])
    setOpts({ invoices: false, contracts: false, questionnaires: false })
    setModal({ invoiceCount: invoiceCount ?? 0, contractCount: contractCount ?? 0, galleryCount: galleryCount ?? 0, questionnaireCount: questionnaireCount ?? 0 })
  }

  const confirm = async (deleteAll = false) => {
    if (!modal) return
    setDeleting(true)
    const o = deleteAll ? { invoices: true, contracts: true, questionnaires: true } : opts
    if (o.invoices) await supabase.from('invoices').delete().eq('project_id', projectId)
    if (o.contracts) await supabase.from('contracts').delete().eq('project_id', projectId)
    if (o.questionnaires) await supabase.from('questionnaires').delete().eq('project_id', projectId)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    setDeleting(false)
    if (error) { toast.error(de ? 'Fehler beim Löschen' : 'Error deleting'); return }
    toast.success(de ? 'Projekt gelöscht' : 'Project deleted')
    router.push('/dashboard/projects')
  }

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

            <div className="px-5 py-4 space-y-4">
              {/* Always deleted */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>{de ? 'Wird immer gelöscht' : 'Always deleted'}</p>
                <div className="space-y-1.5">
                  {[
                    `${de ? 'Galerien & Fotos' : 'Galleries & Photos'}${modal.galleryCount > 0 ? ` (${modal.galleryCount})` : ''}`,
                    de ? 'Timeline, Moodboard, geplante E-Mails' : 'Timeline, moodboard, scheduled emails',
                  ].map(label => (
                    <div key={label} className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C43B2C' }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional */}
              {(modal.invoiceCount > 0 || modal.contractCount > 0 || modal.questionnaireCount > 0) && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>{de ? 'Was soll zusätzlich gelöscht werden?' : 'Also delete?'}</p>
                  <div className="space-y-2.5">
                    {modal.invoiceCount > 0 && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={opts.invoices} onChange={e => setOpts(o => ({ ...o, invoices: e.target.checked }))} className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#C43B2C' }} />
                        <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{de ? `Rechnungen (${modal.invoiceCount})` : `Invoices (${modal.invoiceCount})`}</span>
                        {!opts.invoices && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(61,186,111,0.10)', color: '#3DBA6F' }}>{de ? 'bleibt erhalten' : 'kept'}</span>}
                      </label>
                    )}
                    {modal.contractCount > 0 && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={opts.contracts} onChange={e => setOpts(o => ({ ...o, contracts: e.target.checked }))} className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#C43B2C' }} />
                        <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{de ? `Verträge (${modal.contractCount})` : `Contracts (${modal.contractCount})`}</span>
                        {!opts.contracts && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(61,186,111,0.10)', color: '#3DBA6F' }}>{de ? 'bleibt erhalten' : 'kept'}</span>}
                      </label>
                    )}
                    {modal.questionnaireCount > 0 && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={opts.questionnaires} onChange={e => setOpts(o => ({ ...o, questionnaires: e.target.checked }))} className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#C43B2C' }} />
                        <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{de ? `Formulare (${modal.questionnaireCount})` : `Forms (${modal.questionnaireCount})`}</span>
                        {!opts.questionnaires && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(61,186,111,0.10)', color: '#3DBA6F' }}>{de ? 'bleibt erhalten' : 'kept'}</span>}
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                {de ? 'Abbrechen' : 'Cancel'}
              </button>
              <button onClick={() => confirm(false)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-50" style={{ background: 'rgba(196,59,44,0.12)', color: '#C43B2C' }}>
                {deleting ? '...' : (de ? 'Löschen' : 'Delete')}
              </button>
              <button onClick={() => confirm(true)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors disabled:opacity-50" style={{ background: '#C43B2C' }}>
                {deleting ? '...' : (de ? 'Alles löschen' : 'Delete all')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
