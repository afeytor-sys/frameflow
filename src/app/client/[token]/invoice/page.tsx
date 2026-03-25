import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, Send, Receipt, Building2 } from 'lucide-react'

type Locale = 'de' | 'en'

const PT = {
  de: {
    back: 'Zurück',
    title: 'Rechnungen',
    subtitle: 'Deine Rechnungen & Zahlungsdetails',
    noInvoices: 'Noch keine Rechnungen vorhanden.',
    noInvoicesSub: 'Dein Fotograf hat noch keine Rechnung erstellt.',
    status: {
      draft: 'Entwurf',
      sent: 'Gesendet',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
    },
    invoiceNumber: 'Rechnungsnummer',
    description: 'Beschreibung',
    amount: 'Betrag',
    dueDate: 'Fälligkeitsdatum',
    total: 'Gesamt',
    bankDetails: 'Bankverbindung',
    bankTransfer: 'Bitte überweise den Betrag auf folgendes Konto:',
    accountHolder: 'Kontoinhaber',
    bank: 'Bank',
    reference: 'Verwendungszweck',
    thankYou: 'Vielen Dank für dein Vertrauen!',
  },
  en: {
    back: 'Back',
    title: 'Invoices',
    subtitle: 'Your invoices & payment details',
    noInvoices: 'No invoices yet.',
    noInvoicesSub: 'Your photographer has not created an invoice yet.',
    status: {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue',
    },
    invoiceNumber: 'Invoice number',
    description: 'Description',
    amount: 'Amount',
    dueDate: 'Due date',
    total: 'Total',
    bankDetails: 'Bank details',
    bankTransfer: 'Please transfer the amount to the following account:',
    accountHolder: 'Account holder',
    bank: 'Bank',
    reference: 'Reference',
    thankYou: 'Thank you for your trust!',
  },
}

const STATUS_CONFIG = {
  draft:   { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: FileText },
  sent:    { color: '#CC8415', bg: 'rgba(204,132,21,0.10)',  icon: Send },
  paid:    { color: '#2A9B68', bg: 'rgba(42,155,104,0.10)', icon: CheckCircle2 },
  overdue: { color: '#C43B2C', bg: 'rgba(196,59,44,0.10)',  icon: AlertCircle },
}

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default async function ClientInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Resolve project by slug or token
  let { data: project } = await supabase
    .from('projects')
    .select('id, title, portal_sections, portal_locale, photographer_id, photographer:photographers(studio_name, full_name, logo_url, locale, bank_account_holder, bank_name, bank_iban, bank_bic, email)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('id, title, portal_sections, portal_locale, photographer_id, photographer:photographers(studio_name, full_name, logo_url, locale, bank_account_holder, bank_name, bank_iban, bank_bic, email)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  if (!project) notFound()

  // Check visibility
  const rawSections = (project as { portal_sections?: Record<string, boolean> | null }).portal_sections
  if (rawSections?.invoice !== true) notFound()

  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as {
    studio_name: string | null
    full_name: string
    logo_url: string | null
    locale?: string | null
    bank_account_holder?: string | null
    bank_name?: string | null
    bank_iban?: string | null
    bank_bic?: string | null
    email?: string | null
  } | null

  const portalLocale: Locale = (
    (project as { portal_locale?: string | null }).portal_locale ||
    photographer?.locale ||
    'de'
  ) as Locale
  const t = PT[portalLocale] ?? PT.de

  // Fetch invoices for this project
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, status, due_date, description, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const studioName = photographer?.studio_name || photographer?.full_name || 'Fotonizer'
  const hasBankDetails = photographer?.bank_iban || photographer?.bank_account_holder

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto px-5 py-10 space-y-5">

        {/* Back + Header */}
        <div className="animate-in">
          <Link
            href={`/client/${token}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold mb-5 transition-all hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.back}
          </Link>

          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.10)' }}>
              <Receipt className="w-5 h-5" style={{ color: '#F97316' }} />
            </div>
            <div>
              <h1 className="font-black text-[24px]" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                {t.title}
              </h1>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Invoice list */}
        {!invoices || invoices.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center animate-in-delay-1"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(249,115,22,0.08)' }}>
              <FileText className="w-5 h-5" style={{ color: '#F97316' }} />
            </div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{t.noInvoices}</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{t.noInvoicesSub}</p>
          </div>
        ) : (
          <div className="space-y-4 animate-in-delay-1">
            {invoices.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
              const StatusIcon = cfg.icon
              const statusLabel = t.status[inv.status as keyof typeof t.status] ?? inv.status

              return (
                <div
                  key={inv.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
                >
                  {/* Color bar */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)` }} />

                  <div className="p-5">
                    {/* Top row: number + status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: cfg.bg }}>
                          <StatusIcon className="w-4.5 h-4.5" style={{ color: cfg.color, width: '18px', height: '18px' }} />
                        </div>
                        <div>
                          {inv.invoice_number && (
                            <p className="font-mono text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
                              {inv.invoice_number}
                            </p>
                          )}
                          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(inv.created_at).toLocaleDateString(portalLocale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Description */}
                    {inv.description && (
                      <p className="text-[14px] mb-4" style={{ color: 'var(--text-secondary)' }}>
                        {inv.description}
                      </p>
                    )}

                    {/* Amount table */}
                    <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                        <span className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: 'var(--text-muted)' }}>
                          {t.description}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: 'var(--text-muted)' }}>
                          {t.amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5"
                        style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                          {inv.description || project.title}
                        </span>
                        <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatEur(inv.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ background: 'var(--bg-hover)' }}>
                        <span className="text-[13px] font-black" style={{ color: 'var(--text-primary)' }}>
                          {t.total}
                        </span>
                        <span className="text-[18px] font-black" style={{ color: '#F97316' }}>
                          {formatEur(inv.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Due date */}
                    {inv.due_date && (
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: inv.status === 'overdue' ? '#C43B2C' : 'var(--text-muted)' }} />
                        <span className="text-[13px]" style={{ color: inv.status === 'overdue' ? '#C43B2C' : 'var(--text-muted)' }}>
                          {t.dueDate}: <strong>{new Date(inv.due_date).toLocaleDateString(portalLocale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                        </span>
                      </div>
                    )}

                    {/* Bank details — only for unpaid invoices */}
                    {hasBankDetails && inv.status !== 'paid' && (
                      <div className="rounded-xl p-4" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F97316' }} />
                          <p className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: '#F97316' }}>
                            {t.bankDetails}
                          </p>
                        </div>
                        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
                          {t.bankTransfer}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          {photographer?.bank_account_holder && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-muted)' }}>{t.accountHolder}</p>
                              <p className="text-[13px] font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{photographer.bank_account_holder}</p>
                            </div>
                          )}
                          {photographer?.bank_name && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-muted)' }}>{t.bank}</p>
                              <p className="text-[13px] font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{photographer.bank_name}</p>
                            </div>
                          )}
                          {photographer?.bank_iban && (
                            <div className="col-span-2">
                              <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-muted)' }}>IBAN</p>
                              <p className="text-[13px] font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{photographer.bank_iban}</p>
                            </div>
                          )}
                          {photographer?.bank_bic && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-muted)' }}>BIC / SWIFT</p>
                              <p className="text-[13px] font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{photographer.bank_bic}</p>
                            </div>
                          )}
                        </div>
                        {inv.invoice_number && (
                          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(249,115,22,0.15)' }}>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {t.reference}: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{inv.invoice_number}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Paid badge */}
                    {inv.status === 'paid' && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(42,155,104,0.08)', border: '1px solid rgba(42,155,104,0.20)' }}>
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2A9B68' }} />
                        <p className="text-[13px] font-bold" style={{ color: '#2A9B68' }}>
                          {portalLocale === 'de' ? 'Rechnung bezahlt ✓' : 'Invoice paid ✓'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-4 animate-in-delay-2">
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {t.thankYou} · {studioName}
          </p>
        </div>

      </div>
    </div>
  )
}
