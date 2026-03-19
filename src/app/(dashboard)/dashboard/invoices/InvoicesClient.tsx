'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText, Send, CheckCircle2, Clock, AlertCircle, MoreHorizontal, Trash2, X, Percent, FolderPlus, UserPlus, Eye, Printer, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import EmailVorlagePicker from '@/components/dashboard/EmailVorlagePicker'
import { useLocale } from '@/hooks/useLocale'
import { dashboardT } from '@/lib/dashboardTranslations'

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
  sent_at?: string | null
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

interface Photographer {
  id: string
  plan: string | null
  full_name: string | null
  studio_name: string | null
  email: string | null
  bank_account_holder: string | null
  bank_name: string | null
  bank_iban: string | null
  bank_bic: string | null
}

interface Props {
  invoices: Invoice[]
  projects: Project[]
  photographerId: string
  photographer: Photographer | null
}

const STATUS_CONFIG = {
  draft:   { label: 'Draft',    color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: FileText },
  sent:    { label: 'Sent',   color: '#CC8415', bg: 'rgba(204,132,21,0.10)',  icon: Send },
  paid:    { label: 'Paid',    color: '#2A9B68', bg: 'rgba(42,155,104,0.10)', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: '#C43B2C', bg: 'rgba(196,59,44,0.10)',  icon: AlertCircle },
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

function getClientEmail(project?: Invoice['project']): string | null {
  if (!project) return null
  const c = project.client
  if (!c) return null
  if (Array.isArray(c)) return c[0]?.email || null
  return c.email || null
}

const MWST_RATE = 0.19

// ── Print invoice in a new window ─────────────────────────────────────────
function printInvoiceWindow(invoice: Invoice, photographer: Photographer | null) {
  const clientName = getClientName(invoice.project)
  const clientEmail = getClientEmail(invoice.project)
  const cfg = STATUS_CONFIG[invoice.status]
  const hasBankDetails = photographer?.bank_iban || photographer?.bank_account_holder

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Rechnung ${invoice.invoice_number || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1A1A1A; background: #fff; padding: 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .studio-name { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; }
    .meta { font-size: 12px; color: #6B6B6B; margin-top: 4px; }
    .invoice-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #6B6B6B; margin-bottom: 4px; text-align: right; }
    .invoice-number { font-family: monospace; font-size: 16px; font-weight: 700; text-align: right; }
    .invoice-date { font-size: 12px; color: #6B6B6B; text-align: right; margin-top: 4px; }
    .divider { height: 1px; background: #E8E8E4; margin: 24px 0; }
    .section-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #6B6B6B; margin-bottom: 8px; }
    .client-name { font-size: 16px; font-weight: 700; }
    .client-meta { font-size: 13px; color: #6B6B6B; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #E8E8E4; border-radius: 8px; overflow: hidden; margin: 24px 0; }
    thead tr { background: #F8F8F6; }
    th { padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.10em; color: #6B6B6B; text-align: left; }
    th:last-child { text-align: right; }
    td { padding: 16px; font-size: 14px; border-top: 1px solid #E8E8E4; }
    td:last-child { text-align: right; font-weight: 700; }
    tfoot tr { background: #F8F8F6; border-top: 2px solid #E8E8E4; }
    tfoot td { font-size: 14px; font-weight: 900; }
    tfoot td:last-child { font-size: 18px; color: #F97316; }
    .status-row { display: flex; gap: 24px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${cfg.bg}; color: ${cfg.color}; }
    .bank-box { background: #F8F8F6; border: 1px solid #E8E8E4; border-radius: 12px; padding: 20px; margin-top: 24px; }
    .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin-top: 12px; }
    .bank-label { font-size: 10px; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.08em; }
    .bank-value { font-size: 13px; font-weight: 700; margin-top: 2px; }
    .bank-mono { font-family: monospace; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8E8E4; text-align: center; font-size: 11px; color: #6B6B6B; }
    .ref { font-size: 11px; color: #6B6B6B; margin-top: 12px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="studio-name">${photographer?.studio_name || photographer?.full_name || 'Fotograf'}</div>
      ${photographer?.studio_name && photographer?.full_name ? `<div class="meta">${photographer.full_name}</div>` : ''}
      ${photographer?.email ? `<div class="meta">${photographer.email}</div>` : ''}
    </div>
    <div>
      <div class="invoice-label">Rechnung</div>
      <div class="invoice-number">${invoice.invoice_number || '—'}</div>
      <div class="invoice-date">${new Date(invoice.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div style="margin-bottom:24px">
    <div class="section-label">Bill to</div>
    <div class="client-name">${clientName}</div>
    ${clientEmail ? `<div class="client-meta">${clientEmail}</div>` : ''}
    ${invoice.project?.title ? `<div class="client-meta">Projekt: ${invoice.project.title}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Beschreibung</th>
        <th>Betrag</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${invoice.description || invoice.project?.title || 'Fotografieleistungen'}</td>
        <td>${formatEur(invoice.amount)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td>Gesamt</td>
        <td>${formatEur(invoice.amount)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="status-row">
    <div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.10em;color:#6B6B6B;">Status: </span><span class="status-badge">${cfg.label}</span></div>
    ${invoice.due_date ? `<div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.10em;color:#6B6B6B;">Due on: </span><span style="font-size:12px;font-weight:700;">${new Date(invoice.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>` : ''}
  </div>

  ${hasBankDetails ? `
  <div class="divider"></div>
  <div class="bank-box">
    <div class="section-label">Bank details — Please transfer the amount to the following account:</div>
    <div class="bank-grid">
      ${photographer?.bank_account_holder ? `<div><div class="bank-label">Kontoinhaber</div><div class="bank-value">${photographer.bank_account_holder}</div></div>` : ''}
      ${photographer?.bank_name ? `<div><div class="bank-label">Bank</div><div class="bank-value">${photographer.bank_name}</div></div>` : ''}
      ${photographer?.bank_iban ? `<div><div class="bank-label">IBAN</div><div class="bank-value bank-mono">${photographer.bank_iban}</div></div>` : ''}
      ${photographer?.bank_bic ? `<div><div class="bank-label">BIC / SWIFT</div><div class="bank-value bank-mono">${photographer.bank_bic}</div></div>` : ''}
    </div>
    ${invoice.invoice_number ? `<div class="ref">Verwendungszweck: <strong>${invoice.invoice_number}</strong></div>` : ''}
  </div>
  ` : ''}

  <div class="footer">Thank you for your trust! · ${photographer?.studio_name || photographer?.full_name || 'Fotonizer'}</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ── Invoice Preview Modal ──────────────────────────────────────────────────
function InvoicePreviewModal({
  invoice,
  photographer,
  onClose,
  autoPrint,
}: {
  invoice: Invoice
  photographer: Photographer | null
  onClose: () => void
  autoPrint: boolean
}) {
  const cfg = STATUS_CONFIG[invoice.status]
  const clientName = getClientName(invoice.project)
  const clientEmail = getClientEmail(invoice.project)
  const hasBankDetails = photographer?.bank_iban || photographer?.bank_account_holder

  // Auto-trigger print in new window after mount
  if (typeof window !== 'undefined' && autoPrint) {
    setTimeout(() => printInvoiceWindow(invoice, photographer), 200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in"
        style={{ background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto' }}
      >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E4]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.10)' }}>
                <FileText className="w-4 h-4" style={{ color: '#F97316' }} />
              </div>
              <span className="font-bold text-[15px] text-[#1A1A1A]">Invoice Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => printInvoiceWindow(invoice, photographer)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-88"
                style={{ background: '#1A1A1A' }}
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Invoice document ── */}
          <div className="p-8 bg-white" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>

            {/* Top: Photographer info + Invoice number */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="font-black text-[20px] text-[#1A1A1A]" style={{ letterSpacing: '-0.03em' }}>
                  {photographer?.studio_name || photographer?.full_name || 'Fotograf'}
                </p>
                {photographer?.studio_name && photographer?.full_name && (
                  <p className="text-[13px] text-[#6B6B6B] mt-0.5">{photographer.full_name}</p>
                )}
                {photographer?.email && (
                  <p className="text-[12px] text-[#6B6B6B] mt-0.5">{photographer.email}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B] mb-1">Rechnung</p>
                <p className="font-mono font-bold text-[15px] text-[#1A1A1A]">{invoice.invoice_number || '—'}</p>
                <p className="text-[12px] text-[#6B6B6B] mt-1">
                  {new Date(invoice.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E8E8E4] mb-6" />

            {/* Bill to */}
            <div className="mb-6">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B] mb-2">Bill to</p>
              <p className="font-bold text-[15px] text-[#1A1A1A]">{clientName}</p>
              {clientEmail && <p className="text-[13px] text-[#6B6B6B] mt-0.5">{clientEmail}</p>}
              {invoice.project?.title && (
                <p className="text-[12px] text-[#6B6B6B] mt-0.5">Projekt: {invoice.project.title}</p>
              )}
            </div>

            {/* Invoice table */}
            <div className="rounded-xl overflow-hidden border border-[#E8E8E4] mb-6">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F8F8F6' }}>
                    <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.10em] text-[#6B6B6B]">Beschreibung</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.10em] text-[#6B6B6B]">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#E8E8E4]">
                    <td className="px-4 py-4 text-[14px] text-[#1A1A1A]">
                      {invoice.description || invoice.project?.title || 'Fotografieleistungen'}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-[14px] text-[#1A1A1A]">
                      {formatEur(invoice.amount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8F8F6', borderTop: '2px solid #E8E8E4' }}>
                    <td className="px-4 py-3 font-black text-[14px] text-[#1A1A1A]">Gesamt</td>
                    <td className="px-4 py-3 text-right font-black text-[18px]" style={{ color: '#F97316' }}>
                      {formatEur(invoice.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Status + Due date row */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6B6B6B]">Status:</span>
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
              {invoice.due_date && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6B6B6B]">Due on:</span>
                  <span className="text-[12px] font-bold text-[#1A1A1A]">
                    {new Date(invoice.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Bank details */}
            {hasBankDetails && (
              <>
                <div className="h-px bg-[#E8E8E4] mb-5" />
                <div className="rounded-xl p-5" style={{ background: '#F8F8F6', border: '1px solid #E8E8E4' }}>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B] mb-3">
                    Bank details — Please transfer the amount to the following account:
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {photographer?.bank_account_holder && (
                      <div>
                        <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wide">Kontoinhaber</p>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">{photographer.bank_account_holder}</p>
                      </div>
                    )}
                    {photographer?.bank_name && (
                      <div>
                        <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wide">Bank</p>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">{photographer.bank_name}</p>
                      </div>
                    )}
                    {photographer?.bank_iban && (
                      <div>
                        <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wide">IBAN</p>
                        <p className="text-[13px] font-bold text-[#1A1A1A] font-mono">{photographer.bank_iban}</p>
                      </div>
                    )}
                    {photographer?.bank_bic && (
                      <div>
                        <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wide">BIC / SWIFT</p>
                        <p className="text-[13px] font-bold text-[#1A1A1A] font-mono">{photographer.bank_bic}</p>
                      </div>
                    )}
                  </div>
                  {invoice.invoice_number && (
                    <p className="text-[11px] text-[#6B6B6B] mt-3">
                      Verwendungszweck: <strong className="text-[#1A1A1A]">{invoice.invoice_number}</strong>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-[#E8E8E4] text-center">
              <p className="text-[11px] text-[#6B6B6B]">
                Thank you for your trust! · {photographer?.studio_name || photographer?.full_name || 'Fotonizer'}
              </p>
            </div>
          </div>

          {/* Bottom print button */}
          <div className="px-8 pb-6 flex gap-3">
            <button
              onClick={() => printInvoiceWindow(invoice, photographer)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:opacity-88"
              style={{ background: '#1A1A1A' }}
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-[13px] font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              style={{ background: '#F0F0EC' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function InvoicesClient({ invoices: initial, projects, photographerId, photographer }: Props) {
  const locale = useLocale()
  const ti = dashboardT(locale).invoicesPage
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [projectList, setProjectList] = useState<Project[]>(projects)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Preview modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [autoPrint, setAutoPrint] = useState(false)

  // After-create modal
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null)
  const [sendingCreated, setSendingCreated] = useState(false)
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')

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
    if (!newProjectTitle.trim()) { toast.error(ti.enterProjectName); return }
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
    if (error) { toast.error('Error creating'); setSavingProject(false); return }
    const newProject = data as Project
    setProjectList(prev => [newProject, ...prev])
    setForm(f => ({ ...f, project_id: newProject.id }))
    setNewProjectTitle('')
    setNewProjectClientId('')
    setShowNewProject(false)
    setSavingProject(false)
    toast.success(ti.projectCreated(newProject.title))
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) { toast.error(ti.enterName); return }
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
    if (error) { toast.error('Error creating'); setSavingClient(false); return }
    const newClient = data as Client
    setClients(prev => [newClient, ...prev])
    setNewProjectClientId(newClient.id)
    setNewClientName('')
    setNewClientEmail('')
    setShowNewClient(false)
    setSavingClient(false)
    toast.success(ti.clientCreated(newClient.full_name))
  }

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  // Only sum MwSt for paid invoices that explicitly include 19% MwSt (detected via description)
  const totalMwst = invoices
    .filter(i => i.status === 'paid' && i.description?.includes('inkl. 19% MwSt'))
    .reduce((s, i) => s + Math.round(i.amount * MWST_RATE / (1 + MWST_RATE)), 0)

  const netAmount = parseFloat(form.amount.replace(',', '.')) || 0
  const mwstAmount = form.include_mwst ? netAmount * MWST_RATE : 0
  const grossAmount = netAmount + mwstAmount

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.project_id) { toast.error(ti.selectProjectError); return }
    if (!form.amount) { toast.error(ti.enterAmount); return }
    setSaving(true)

    const net = parseFloat(form.amount.replace(',', '.'))
    const gross = form.include_mwst ? net * (1 + MWST_RATE) : net
    const amountCents = Math.round(gross * 100)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

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
        status: 'sent',
        description: finalDescription,
        due_date: form.due_date || null,
        invoice_number: invoiceNumber,
        notes: form.notes || null,
      })
      .select('*, project:projects(title, client:clients(full_name, email))')
      .single()

    if (error) { toast.error('Error creating'); setSaving(false); return }

    const newInvoice = data as Invoice
    setInvoices(prev => [newInvoice, ...prev])
    setForm({ project_id: '', amount: '', notes: '', description: '', due_date: '', include_mwst: false })
    setShowNew(false)
    setSaving(false)
    setCreatedInvoice(newInvoice)
  }

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId)
    const res = await fetch('/api/invoices/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    })
    const json = await res.json()
    setSendingId(null)
    if (!res.ok) {
      if (json.error === 'Client has no email address') {
        toast.error(ti.noClientEmail)
      } else {
        toast.error(ti.errorSend)
      }
      return false
    }
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'sent' as const, sent_at: new Date().toISOString() } : i))
    toast.success(ti.invoiceSent)
    return true
  }

  const handleSendCreated = async () => {
    if (!createdInvoice) return
    setSendingCreated(true)
    const ok = await handleSendInvoice(createdInvoice.id)
    setSendingCreated(false)
    if (ok) setCreatedInvoice(null)
  }

  const updateStatus = async (id: string, status: Invoice['status']) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (error) { toast.error(ti.errorStatus); return }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    setOpenMenu(null)
    toast.success(ti.statusUpdated(STATUS_CONFIG[status].label))
  }

  const deleteInvoice = async (id: string) => {
    if (!confirm(ti.deleteConfirm)) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) { toast.error(ti.errorDelete); return }
    setInvoices(prev => prev.filter(i => i.id !== id))
    setOpenMenu(null)
    toast.success(ti.deleted)
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
            {ti.title}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {ti.subtitle}
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98]"
          style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}>
          <Plus className="w-4 h-4" />
          {ti.newInvoice}
        </button>
      </div>

      {/* Stats */}
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {([
          { label: ti.stats.paid,    value: formatEur(totalPaid),    color: '#2A9B68', desc: totalPaid > 0 ? ti.stats.paidDesc : ti.stats.paidDescEmpty,          Icon: CheckCircle2, delay: 0 },
          { label: ti.stats.pending, value: formatEur(totalPending), color: '#C4A47C', desc: totalPending > 0 ? ti.stats.pendingDesc : ti.stats.pendingDescEmpty,  Icon: Clock,        delay: 90 },
          { label: ti.stats.overdue, value: formatEur(totalOverdue), color: '#C43B2C', desc: totalOverdue > 0 ? ti.stats.overdueDesc : ti.stats.overdueDescEmpty,  Icon: AlertCircle,  delay: 180 },
          { label: ti.stats.vat,     value: formatEur(totalMwst),    color: '#8B5CF6', desc: ti.stats.vatDesc,                                                     Icon: Percent,      delay: 270 },
        ] as const).map(({ label, value, color, desc, Icon, delay }) => (
          <div
            key={label}
            className="relative group rounded-2xl overflow-hidden cursor-default transition-all duration-300"
            style={{
              background: 'var(--card-bg)',
              border: `1px solid ${color}20`,
              boxShadow: `0 2px 12px ${color}12`,
              animation: 'statFadeUp 0.5s ease forwards',
              animationDelay: `${delay}ms`,
              opacity: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 12px 32px ${color}22`
              e.currentTarget.style.borderColor = color + '40'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 2px 12px ${color}12`
              e.currentTarget.style.borderColor = color + '20'
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color, opacity: 0.7 }} />
            <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}12 0%, ${color}03 100%)`, opacity: 0.5 }} />
            <div className="relative z-10 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: color + '15', border: `1px solid ${color}25` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              </div>
              <p className="font-black tabular-nums leading-none mb-1" style={{ fontSize: '32px', letterSpacing: '-0.04em', color }}>{value}</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: color + '99' }}>{label}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
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
              {ti.noInvoices}
            </h3>
            <p className="text-[13.5px] mb-7 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              {ti.noInvoicesDesc}
            </p>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88"
              style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}>
              <Plus className="w-4 h-4" />
              {ti.createFirst}
            </button>
          </div>
        ) : (
          invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status]
            const StatusIcon = cfg.icon
            const clientName = getClientName(inv.project)
            const clientEmail = getClientEmail(inv.project)
            const isSending = sendingId === inv.id
            return (
              <div key={inv.id} className="glass-card p-4 flex items-center gap-3">
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
                      Due: {new Date(inv.due_date).toLocaleDateString('en-US')}
                    </p>
                  )}
                </div>

                {/* Amount + status */}
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-[16px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {formatEur(inv.amount)}
                  </p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Send button */}
                {(inv.status === 'sent' || inv.status === 'draft') && clientEmail && (
                  <button
                    onClick={() => handleSendInvoice(inv.id)}
                    disabled={isSending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white flex-shrink-0 transition-all hover:opacity-88 disabled:opacity-50"
                    style={{ background: '#CC8415', boxShadow: '0 1px 6px rgba(204,132,21,0.25)' }}
                    title={`${ti.sendToClient} ${clientEmail}`}
                  >
                    {isSending
                      ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                    {isSending ? ti.sending : ti.send}
                  </button>
                )}

                {/* ── View button ── */}
                <button
                  onClick={() => { setAutoPrint(false); setPreviewInvoice(inv) }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title={ti.viewInvoice}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* ── Print/Download button ── */}
                <button
                  onClick={() => { setAutoPrint(true); setPreviewInvoice(inv) }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title={ti.printPdf}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Printer className="w-4 h-4" />
                </button>

                {/* Actions menu */}
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
                      <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 min-w-[200px]"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}>
                        {/* Send — only for draft/sent */}
                        {(inv.status === 'draft' || inv.status === 'sent') && (
                          <button onClick={() => { handleSendInvoice(inv.id); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Send className="w-3.5 h-3.5" style={{ color: '#CC8415' }} />
                            {ti.sendToClient}
                          </button>
                        )}
                        {/* Mark as pending — only for draft */}
                        {inv.status === 'draft' && (
                          <button onClick={() => updateStatus(inv.id, 'sent')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Clock className="w-3.5 h-3.5" style={{ color: '#CC8415' }} />
                            Mark as Pending
                          </button>
                        )}
                        {/* Mark as paid — always visible (except already paid) */}
                        {inv.status !== 'paid' && (
                          <button onClick={() => updateStatus(inv.id, 'paid')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2A9B68' }} />
                            {ti.markPaid}
                          </button>
                        )}
                        {/* Mark as overdue — for draft/sent/paid */}
                        {inv.status !== 'overdue' && (
                          <button onClick={() => updateStatus(inv.id, 'overdue')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <AlertCircle className="w-3.5 h-3.5" style={{ color: '#C43B2C' }} />
                            {ti.markOverdue}
                          </button>
                        )}
                        <div style={{ borderTop: '1px solid var(--border-color)' }} />
                        <button onClick={() => deleteInvoice(inv.id)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors"
                          style={{ color: '#C43B2C' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,59,44,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Trash2 className="w-3.5 h-3.5" />
                          {ti.delete}
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

      {/* ── Invoice Preview Modal ── */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          photographer={photographer}
          onClose={() => { setPreviewInvoice(null); setAutoPrint(false) }}
          autoPrint={autoPrint}
        />
      )}

      {/* ── New invoice modal ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{ti.modalTitle}</h2>
              <button onClick={() => setShowNew(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                    {ti.newProject}
                  </button>
                </div>

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
                    <div className="flex items-center gap-2">
                      <select
                        value={newProjectClientId}
                        onChange={e => setNewProjectClientId(e.target.value)}
                        className="input-base flex-1 text-[13px]"
                        style={{ color: newProjectClientId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        <option value="">{ti.noClient}</option>
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

                    {showNewClient && (
                      <div className="p-2.5 rounded-lg space-y-1.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>New client</p>
                        <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Name *" className="input-base w-full text-[12px]" autoFocus />
                        <input type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="E-Mail (optional)" className="input-base w-full text-[12px]" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowNewClient(false)} className="flex-1 text-[12px] py-1.5 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Cancel</button>
                          <button type="button" onClick={handleCreateClient} disabled={savingClient || !newClientName.trim()} className="flex-1 text-[12px] py-1.5 rounded-lg font-bold text-white disabled:opacity-40" style={{ background: 'var(--accent)' }}>
                            {savingClient ? '...' : 'Create'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 text-[12px] py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Cancel</button>
                      <button type="button" onClick={handleCreateProject} disabled={savingProject || !newProjectTitle.trim()} className="flex-1 text-[12px] py-1.5 rounded-lg font-bold text-white disabled:opacity-40" style={{ background: 'var(--accent)' }}>
                        {savingProject ? '...' : '+ Create'}
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
                        <option value="">{ti.selectProject}</option>
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
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Betrag (€) *
                </label>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                  <span className="flex-shrink-0 px-3 text-[14px] font-bold select-none" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>€</span>
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
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: form.include_mwst ? 'var(--accent-muted)' : 'var(--border-color)' }}>
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
                  className="relative rounded-full transition-all flex-shrink-0"
                  style={{ background: form.include_mwst ? 'var(--accent)' : 'var(--border-strong)', width: '40px', height: '22px' }}
                >
                  <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: form.include_mwst ? '20px' : '2px' }} />
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
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

              {/* Notes */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Anmerkungen
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes or hints for the client..."
                  rows={3}
                  className="input-base resize-none"
                  style={{ lineHeight: '1.5' }}
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Due date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="input-base"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="btn-shimmer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50"
                  style={{ background: '#F97316' }}>
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Plus className="w-4 h-4" />Create invoice</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── After-create: send modal ── */}
      {createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col animate-scale-in"
            style={{ maxHeight: '92vh', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}>

            {/* Accent bar */}
            <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #F97316, #CC8415)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.12)' }}>
                  <Mail className="w-4 h-4" style={{ color: '#F97316' }} />
                </div>
                <div>
                  <h2 className="font-black text-[15px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Send invoice
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {getClientEmail(createdInvoice.project) ? `To ${getClientEmail(createdInvoice.project)}` : ti.noEmail}
                  </p>
                </div>
              </div>
              <button onClick={() => setCreatedInvoice(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Invoice summary */}
              <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.10)' }}>
                  <FileText className="w-4 h-4" style={{ color: '#F97316' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {getClientName(createdInvoice.project)} · {createdInvoice.invoice_number}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {formatEur(createdInvoice.amount)}{createdInvoice.due_date ? ` · Due ${new Date(createdInvoice.due_date).toLocaleDateString('en-US')}` : ''}
                  </p>
                </div>
              </div>

              {/* Vorlage picker */}
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>E-Mail Vorlage</p>
                <EmailVorlagePicker
                  category="rechnung"
                  onSelect={(subject, body) => { setSendSubject(subject); setSendMessage(body) }}
                  vars={{ client_name: getClientName(createdInvoice.project), invoice_number: createdInvoice.invoice_number || undefined, amount: formatEur(createdInvoice.amount) }}
                  label="Select template"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Betreff</label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={e => setSendSubject(e.target.value)}
                  className="input-base w-full"
                  placeholder={`Rechnung ${createdInvoice.invoice_number || ''}`}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Nachricht</label>
                <textarea
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  rows={6}
                  className="input-base w-full resize-none"
                  style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
                  placeholder="Deine Nachricht an den Kunden..."
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  The invoice link will be automatically added to the email.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              {getClientEmail(createdInvoice.project) ? (
                <button
                  onClick={handleSendCreated}
                  disabled={sendingCreated}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 disabled:opacity-50"
                  style={{ background: '#CC8415', boxShadow: '0 1px 8px rgba(204,132,21,0.30)' }}
                >
                  {sendingCreated
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                  {sendingCreated ? ti.sendingBtn : ti.sendToClientNow}
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl text-[13px] text-center"
                  style={{ background: 'rgba(196,59,44,0.08)', color: '#C43B2C', border: '1px solid rgba(196,59,44,0.20)' }}>
                  {ti.noEmailWarning}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setAutoPrint(false); setPreviewInvoice(createdInvoice); setCreatedInvoice(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium transition-colors"
                  style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)' }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {ti.preview}
                </button>
                <button
                  onClick={() => setCreatedInvoice(null)}
                  className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
                >
                  {ti.later}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
