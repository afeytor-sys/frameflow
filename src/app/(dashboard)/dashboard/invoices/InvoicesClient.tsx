'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText, Send, CheckCircle2, Clock, AlertCircle, MoreHorizontal, Trash2, X, Percent, FolderPlus, UserPlus, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  project_id: string
  photographer_id: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  due_date: string | null
  description: string | null
  invoice_number: string | null
  stripe_invoice_id: string | null
  created_at: string
  project?: {
    title: string
    client?: { full_name: string; email?: string } | { full_name: string; email?: string }[]
  }
}

interface Project {
  id: string
  title: string
  client?: { full_name: string } | { full_name: string }[]
}

interface Client {
  id: string
  full_name: string
  email: string | null
}

interface Props {
  invoices: Invoice[]
  projects: Project[]
  photographerId: string
}

const STATUS_CONFIG = {
  draft:   { label: 'Entwurf',   color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: FileText },
  sent:    { label: 'Gesendet',  color: '#CC8415', bg: 'rgba(204,132,21,0.10)',  icon: Send },
  paid:    { label: 'Bezahlt',   color: '#2A9B68', bg: 'rgba(42,155,104,0.10)', icon: CheckCircle2 },
  overdue: { label: 'Überfällig',color: '#C43B2C', bg: 'rgba(196,59,44,0.10)',  icon: AlertCircle },
}

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function getClientName(project?: Invoice['project']): string {
  if (!project) return '—'
  const c = project.client
  if (!c) return project.title
  if (Array.isArray(c)) return c[0]?.full_name || project.title
  return c.full_name || project.title
}

const MWST_RATE = 0.19

export default function InvoicesClient({ invoices: initial, projects, photographerId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [projectList, setProjectList] = useState<Project[]>(projects)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [form, setForm] = useState({
    project_id: '',
    amount: '',
    notes: '',
    description: '',
    due_date: '',
    include_mwst: false,
  })

  // Quick-create project
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectClientId, setNewProjectClientId] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoaded, setClientsLoaded] = useState(false)

  // Quick-create client
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const supabase = createClient()

  const loadClients = async () => {
    if (clientsLoaded) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('photographer_id', photographerId)
      .order('full_name')
    setClients(data || [])
    setClientsLoaded(true)
  }

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) { toast.error('Bitte einen Projektnamen eingeben'); return }
    setSavingProject(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        photographer_id: photographerId,
        title: newProjectTitle.trim(),
        client_id: newProjectClientId || null,
        status: 'inquiry',
      })
      .select('id, title, client:clients(full_name)')
      .single()
    if (error) { toast.error('Fehler beim Erstellen'); setSavingProject(false); return }
    const newProject = data as Project
    setProjectList(prev => [newProject, ...prev])
    setForm(f => ({ ...f, project_id: newProject.id }))
    setNewProjectTitle('')
    setNewProjectClientId('')
    setShowNewProject(false)
    setSavingProject(false)
    toast.success(`Projekt "${newProject.title}" erstellt!`)
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) { toast.error('Bitte einen Namen eingeben'); return }
    setSavingClient(true)
    const { data, error } = await supabase
      .from('clients')
      .insert({
        photographer_id: photographerId,
        full_name: newClientName.trim(),
        email: newClientEmail.trim() || null,
        status: 'active',
      })
      .select('id, full_name, email')
      .single()
    if (error) { toast.error('Fehler beim Erstellen'); setSavingClient(false); return }
    const newClient = data as Client
    setClients(prev => [newClient, ...prev])
    setNewProjectClientId(newClient.id)
    setNewClientName('')
    setNewClientEmail('')
    setShowNewClient(false)
    setSavingClient(false)
    toast.success(`Kunde "${newClient.full_name}" erstellt!`)
  }

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const totalMwst = Math.round(totalPaid * MWST_RATE)

  // Calculate net/tax/gross for preview
  const netAmount = parseFloat(form.amount.replace(',', '.')) || 0
  const mwstAmount = form.include_mwst ? netAmount * MWST_RATE : 0
  const grossAmount = netAmount + mwstAmount

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.project_id) { toast.error('Bitte ein Projekt auswählen'); return }
    if (!form.amount) { toast.error('Bitte einen Betrag eingeben'); return }
    setSaving(true)

    const net = parseFloat(form.amount.replace(',', '.'))
    const gross = form.include_mwst ? net * (1 + MWST_RATE) : net
    const amountCents = Math.round(gross * 100)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

    // Build description: combine notes + mwst info
    let descParts: string[] = []
    if (form.description) descParts.push(form.description)
    if (form.include_mwst) descParts.push(`inkl. 19% MwSt (Netto: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(net)})`)
    const finalDescription = descParts.join(' · ') || null

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        project_id: form.project_id,
        photographer_id: photographerId,
        amount: amountCents,
        currency: 'eur',
        status: 'draft',
        description: finalDescription,
        due_date: form.due_date || null,
        invoice_number: invoiceNumber,
      })
      .select('*, project:projects(title, client:clients(full_name, email))')
      .single()

    if (error) { toast.error('Fehler beim Erstellen'); setSaving(false); return }
    setInvoices(prev => [data as Invoice, ...prev])
    setForm({ project_id: '', amount: '', notes: '', description: '', due_date: '', include_mwst: false })
    setShowNew(false)
    setSaving(false)
    toast.success('Rechnung erstellt!')
  }

  const updateStatus = async (id: string, status: Invoice['status']) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (error) { toast.error('Fehler'); return }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    setOpenMenu(null)
    toast.success(`Status: ${STATUS_CONFIG[status].label}`)
  }

  const deleteInvoice = async (id: string) => {
    if (!confirm('Rechnung löschen?')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) { toast.error('Fehler'); return }
    setInvoices(prev => prev.filter(i => i.id !== id))
    setOpenMenu(null)
    toast.success('Rechnung gelöscht')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-in">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            Rechnungen
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Erstelle und verfolge deine Zahlungen
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98]"
          style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}>
          <Plus className="w-4 h-4" />
          Neue Rechnung
        </button>
      </div>

      {/* Stats */}
      <style>{`
        .invoice-stat-card {
          transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease !important;
        }
        .invoice-stat-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: var(--card-shadow-hover) !important;
        }
      `}</style>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {([
          { label: 'Bezahlt',       value: formatEur(totalPaid),    color: '#2A9B68', iconBg: 'rgba(42,155,104,0.12)',  Icon: CheckCircle2, delay: 0 },
          { label: 'Ausstehend',    value: formatEur(totalPending), color: 'var(--accent)', iconBg: 'var(--accent-muted)', Icon: Clock,    delay: 60 },
          { label: 'Überfällig',    value: formatEur(totalOverdue), color: '#C43B2C', iconBg: 'rgba(196,59,44,0.10)',  Icon: AlertCircle,  delay: 120 },
          { label: 'MwSt. bezahlt', value: formatEur(totalMwst),   color: '#8B5CF6', iconBg: 'rgba(139,92,246,0.10)', Icon: Percent,      delay: 180 },
        ] as const).map(({ label, value, color, iconBg, Icon, delay }) => (
          <div
            key={label}
            className="invoice-stat-card rounded-2xl p-5 flex items-center gap-3"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
              animation: 'fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
              animationDelay: `${delay}ms`,
              opacity: 0,
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: iconBg }}>
              <Icon className="w-4.5 h-4.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] mb-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="font-black text-[18px] leading-none truncate" style={{ color, letterSpacing: '-0.03em' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      <div className="space-y-2 animate-in-delay-2">
        {invoices.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(249,115,22,0.08)' }}>
              <FileText className="w-7 h-7" style={{ color: '#F97316' }} />
            </div>
            <h3 className="font-black mb-2" style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Noch keine Rechnungen
            </h3>
            <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Erstelle deine erste Rechnung und behalte deine Zahlungen im Überblick
            </p>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
              style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}>
              <Plus className="w-4 h-4" />
              Erste Rechnung erstellen
            </button>
          </div>
        ) : (
          invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status]
            const StatusIcon = cfg.icon
            const clientName = getClientName(inv.project)
            return (
              <div key={inv.id} className="glass-card p-4 flex items-center gap-4">
                {/* Status icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}>
                  <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                      {clientName}
                    </p>
                    {inv.invoice_number && (
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {inv.invoice_number}
                      </span>
                    )}
                  </div>
                  {inv.description && (
                    <p className="text-[12.5px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {inv.description}
                    </p>
                  )}
                  {inv.due_date && (
                    <p className="text-[11.5px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" />
                      Fällig: {new Date(inv.due_date).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-[16px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {formatEur(inv.amount)}
                  </p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="relative flex-shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {openMenu === inv.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 min-w-[180px]"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}>
                        {inv.status === 'draft' && (
                          <button onClick={() => updateStatus(inv.id, 'sent')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Send className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            Als gesendet markieren
                          </button>
                        )}
                        {inv.status === 'sent' && (
                          <button onClick={() => updateStatus(inv.id, 'paid')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2A9B68' }} />
                            Als bezahlt markieren
                          </button>
                        )}
                        {(inv.status === 'sent' || inv.status === 'draft') && (
                          <button onClick={() => updateStatus(inv.id, 'overdue')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <AlertCircle className="w-3.5 h-3.5" style={{ color: '#C43B2C' }} />
                            Als überfällig markieren
                          </button>
                        )}
                        <div style={{ borderTop: '1px solid var(--border-color)' }} />
                        <button onClick={() => deleteInvoice(inv.id)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                          style={{ color: '#C43B2C' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Trash2 className="w-3.5 h-3.5" />
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* New invoice modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Neue Rechnung</h2>
              <button onClick={() => setShowNew(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Project */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: 'var(--text-primary)' }}>
                    Projekt *
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowNewProject(v => !v); loadClients() }}
                    className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    <FolderPlus className="w-3 h-3" />
                    + Neues Projekt
                  </button>
                </div>

                {/* Quick-create project form */}
                {showNewProject && (
                  <div className="mb-2 p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={e => setNewProjectTitle(e.target.value)}
                      placeholder="Projektname *"
                      className="input-base w-full text-[13px]"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    />
                    {/* Client select for new project */}
                    <div className="flex items-center gap-2">
                      <select
                        value={newProjectClientId}
                        onChange={e => setNewProjectClientId(e.target.value)}
                        className="input-base flex-1 text-[13px]"
                        style={{ color: newProjectClientId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        <option value="">Kein Kunde</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewClient(v => !v)}
                        className="flex items-center gap-1 text-[11px] font-bold flex-shrink-0 transition-colors"
                        style={{ color: 'var(--accent)' }}
                      >
                        <UserPlus className="w-3 h-3" />
                        + Neu
                      </button>
                    </div>

                    {/* Quick-create client inline */}
                    {showNewClient && (
                      <div className="p-2.5 rounded-lg space-y-1.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Neuer Kunde</p>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                          placeholder="Name *"
                          className="input-base w-full text-[12px]"
                          autoFocus
                        />
                        <input
                          type="email"
                          value={newClientEmail}
                          onChange={e => setNewClientEmail(e.target.value)}
                          placeholder="E-Mail (optional)"
                          className="input-base w-full text-[12px]"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowNewClient(false)} className="flex-1 text-[12px] py-1.5 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Abbrechen</button>
                          <button type="button" onClick={handleCreateClient} disabled={savingClient || !newClientName.trim()} className="flex-1 text-[12px] py-1.5 rounded-lg font-bold text-white disabled:opacity-40" style={{ background: 'var(--accent)' }}>
                            {savingClient ? '...' : 'Erstellen'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 text-[12px] py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Abbrechen</button>
                      <button type="button" onClick={handleCreateProject} disabled={savingProject || !newProjectTitle.trim()} className="flex-1 text-[12px] py-1.5 rounded-lg font-bold text-white disabled:opacity-40" style={{ background: 'var(--accent)' }}>
                        {savingProject ? '...' : '+ Erstellen'}
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  className="input-base"
                  style={{ color: form.project_id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  <option value="">Projekt auswählen...</option>
                  {projectList.map(p => {
                    const c = p.client
                    const clientName = Array.isArray(c) ? c[0]?.full_name : c?.full_name
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title}{clientName ? ` — ${clientName}` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
                  style={{ color: 'var(--text-primary)' }}>
                  Betrag (€) *
                </label>
                <div className="flex items-center rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                  <span className="flex-shrink-0 px-3 text-[14px] font-bold select-none"
                    style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>
                    €
                  </span>
                  <input
                    type="text"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    required
                    placeholder="0,00"
                    className="flex-1 px-3 py-2.5 bg-transparent text-[14px] outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* MwSt toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: form.include_mwst ? 'rgba(196,164,124,0.10)' : 'var(--bg-hover)', border: `1px solid ${form.include_mwst ? 'var(--accent)' : 'var(--border-color)'}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: form.include_mwst ? 'var(--accent-muted)' : 'var(--border-color)' }}>
                    <Percent className="w-3.5 h-3.5" style={{ color: form.include_mwst ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Mehrwertsteuer 19%</p>
                    {form.include_mwst && netAmount > 0 && (
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Netto {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(netAmount)} + MwSt {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(mwstAmount)} = <strong style={{ color: 'var(--accent)' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(grossAmount)}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, include_mwst: !f.include_mwst }))}
                  className="relative w-10 h-5.5 rounded-full transition-all flex-shrink-0"
                  style={{
                    background: form.include_mwst ? 'var(--accent)' : 'var(--border-strong)',
                    width: '40px',
                    height: '22px',
                  }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: form.include_mwst ? '20px' : '2px' }}
                  />
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
                  style={{ color: 'var(--text-primary)' }}>
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="z.B. Hochzeitsfotografie — 12. April 2026"
                  className="input-base"
                />
              </div>

              {/* Notes / Anmerkungen */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
                  style={{ color: 'var(--text-primary)' }}>
                  Anmerkungen
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Interne Notizen oder Hinweise für den Kunden..."
                  rows={3}
                  className="input-base resize-none"
                  style={{ lineHeight: '1.5' }}
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
                  style={{ color: 'var(--text-primary)' }}>
                  Fälligkeitsdatum
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="input-base"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)}
                  className="btn-secondary flex-1">
                  Abbrechen
                </button>
                <button type="submit" disabled={saving}
                  className="btn-shimmer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}>
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Erstellen
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
