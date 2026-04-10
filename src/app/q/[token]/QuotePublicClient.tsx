'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, Clock, Minus, Plus } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type SectionType = 'fixed' | 'single_choice' | 'multiple_choice'

interface QuoteItem {
  id: string
  title: string
  description: string | null
  unit_price: number
  editable_qty: boolean
  default_qty: number
  position: number
}

interface QuoteSection {
  id: string
  title: string
  type: SectionType
  required: boolean
  position: number
  items: QuoteItem[]
}

interface Quote {
  id: string
  title: string
  status: string
  valid_until: string | null
  notes: string | null
  tax_status: string
  tax_rate: number
  sections: QuoteSection[]
}

interface Props {
  quote: Quote
  studioName: string
  token: string
}

// ── i18n ──────────────────────────────────────────────────────────────────────
const T = {
  de: {
    offerFrom: 'Angebot von',
    expired: 'Abgelaufen',
    validUntil: 'Gültig bis',
    expiredBanner: (name: string) => `Dieses Angebot ist abgelaufen. Bitte kontaktiere ${name} für ein aktuelles Angebot.`,
    required: 'Pflichtfeld',
    oneChoice: 'Eine Auswahl',
    extras: 'Extra Leistungen',
    summary: 'Zusammenfassung',
    net: 'Nettobetrag',
    vat: 'MwSt',
    total: 'Gesamtbetrag',
    kleinNote: 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.',
    accept: 'Angebot annehmen',
    name: 'Name',
    namePlaceholder: 'Dein vollständiger Name',
    email: 'E-Mail',
    emailPlaceholder: 'deine@email.de',
    missingRequired: 'Bitte wähle eine Option in allen Pflichtfeldern.',
    sending: 'Wird gesendet…',
    submitBtn: (total: string) => `Angebot annehmen — ${total}`,
    thankYouTitle: 'Angebot angenommen',
    thankYouSub: (total: string) => `Deine Auswahl mit einem Gesamtbetrag von ${total} wurde übermittelt.`,
    thankYouContact: (name: string) => `${name} wird sich in Kürze bei dir melden.`,
  },
  en: {
    offerFrom: 'Quote from',
    expired: 'Expired',
    validUntil: 'Valid until',
    expiredBanner: (name: string) => `This quote has expired. Please contact ${name} for an updated quote.`,
    required: 'Required',
    oneChoice: 'Choose one',
    extras: 'Extra services',
    summary: 'Summary',
    net: 'Subtotal',
    vat: 'VAT',
    total: 'Total',
    kleinNote: 'No VAT charged (small business regulation).',
    accept: 'Accept quote',
    name: 'Name',
    namePlaceholder: 'Your full name',
    email: 'Email',
    emailPlaceholder: 'your@email.com',
    missingRequired: 'Please select an option in all required fields.',
    sending: 'Sending…',
    submitBtn: (total: string) => `Accept quote — ${total}`,
    thankYouTitle: 'Quote accepted',
    thankYouSub: (total: string) => `Your selection totalling ${total} has been submitted.`,
    thankYouContact: (name: string) => `${name} will be in touch shortly.`,
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function initSelections(sections: QuoteSection[]): Record<string, number> {
  const sel: Record<string, number> = {}
  for (const section of sections) {
    if (section.type === 'fixed') {
      for (const item of section.items) {
        sel[item.id] = item.default_qty
      }
    }
  }
  return sel
}

// ── Thank You screen ──────────────────────────────────────────────────────────
function ThankYou({ studioName, total, lang }: { studioName: string; total: number; lang: 'de' | 'en' }) {
  const t = T[lang]
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8F7F4' }}>
      <div className="max-w-[400px] w-full text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(196,164,124,0.15)' }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: '#C4A47C' }} />
        </div>
        <h1 className="text-2xl font-black mb-2" style={{ color: '#111110', letterSpacing: '-0.03em' }}>
          {t.thankYouTitle}
        </h1>
        <p className="text-sm mb-1" style={{ color: '#7A7670' }}>
          {t.thankYouSub(formatEur(total)).replace(formatEur(total), '')}
          <strong style={{ color: '#111110' }}>{formatEur(total)}</strong>
          {' '}
          {lang === 'de' ? 'wurde übermittelt.' : 'has been submitted.'}
        </p>
        <p className="text-sm" style={{ color: '#7A7670' }}>{t.thankYouContact(studioName)}</p>
        <p className="text-xs mt-8" style={{ color: '#B0ACA6' }}>Powered by Fotonizer</p>
      </div>
    </div>
  )
}

// ── Qty stepper ───────────────────────────────────────────────────────────────
function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
        style={{ background: '#F0EDE8', color: '#7A7670' }}>
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-7 text-center text-sm font-semibold" style={{ color: '#111110' }}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
        style={{ background: '#F0EDE8', color: '#7A7670' }}>
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Language toggle ───────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }: { lang: 'de' | 'en'; setLang: (l: 'de' | 'en') => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.06)' }}>
      {(['de', 'en'] as const).map(l => (
        <button key={l} type="button" onClick={() => setLang(l)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
          style={{
            background: lang === l ? '#fff' : 'transparent',
            color: lang === l ? '#111110' : '#7A7670',
            boxShadow: lang === l ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
          <span style={{ fontSize: 14 }}>{l === 'de' ? '🇩🇪' : '🇬🇧'}</span>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuotePublicClient({ quote, studioName, token }: Props) {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  const t = T[lang]

  const [selections, setSelections] = useState<Record<string, number>>(() =>
    initSelections(quote.sections)
  )
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── Totals ──────────────────────────────────────────────────────────────────
  const { subtotal, taxAmount, total } = useMemo(() => {
    let sub = 0
    for (const [itemId, qty] of Object.entries(selections)) {
      if (qty <= 0) continue
      for (const section of quote.sections) {
        const item = section.items.find(i => i.id === itemId)
        if (item) { sub += item.unit_price * qty; break }
      }
    }
    const tax = quote.tax_status === 'kleinunternehmer' ? 0 : Math.round(sub * quote.tax_rate / 100)
    return { subtotal: sub, taxAmount: tax, total: sub + tax }
  }, [selections, quote])

  // ── Validation ──────────────────────────────────────────────────────────────
  const missingRequired = useMemo(() =>
    quote.sections.filter(s =>
      s.required && s.type !== 'fixed' &&
      !s.items.some(item => (selections[item.id] ?? 0) > 0)
    ), [selections, quote.sections])

  const canSubmit = clientName.trim() && clientEmail.trim() && missingRequired.length === 0

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSingleChoice = (section: QuoteSection, itemId: string) => {
    setSelections(prev => {
      const next = { ...prev }
      for (const item of section.items) delete next[item.id]
      next[itemId] = 1
      return next
    })
  }

  const handleQty = (itemId: string, qty: number, min = 1) => {
    setSelections(prev => {
      const next = { ...prev }
      const val = Math.max(min, qty)
      if (val === 0) delete next[itemId]
      else next[itemId] = val
      return next
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          selections,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error')
      }
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error sending')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Expired guard ───────────────────────────────────────────────────────────
  const isExpired = quote.status === 'expired' ||
    (quote.valid_until != null && new Date(quote.valid_until) < new Date(new Date().toDateString()))

  if (submitted) return <ThankYou studioName={studioName} total={total} lang={lang} />

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#F8F7F4' }}>
      <div className="max-w-[600px] mx-auto">

        {/* Lang toggle ─────────────────────────────────────────────────────── */}
        <div className="flex justify-end mb-4">
          <LangToggle lang={lang} setLang={setLang} />
        </div>

        {/* Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#B0ACA6' }}>
            {t.offerFrom}
          </p>
          <h1 className="text-3xl font-black mb-1" style={{ color: '#111110', letterSpacing: '-0.04em' }}>
            {studioName}
          </h1>
          <p className="text-base font-medium" style={{ color: '#7A7670' }}>{quote.title}</p>

          {quote.valid_until && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: isExpired ? 'rgba(201,64,48,0.08)' : 'rgba(196,164,124,0.12)',
                color: isExpired ? '#C94030' : '#C4A47C',
              }}>
              <Clock className="w-3 h-3" />
              {isExpired
                ? t.expired
                : `${t.validUntil} ${new Date(quote.valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            </div>
          )}
        </div>

        {/* Expired banner ──────────────────────────────────────────────────── */}
        {isExpired && (
          <div className="mb-6 p-4 rounded-xl text-sm text-center font-medium"
            style={{ background: 'rgba(201,64,48,0.08)', color: '#C94030', border: '1px solid rgba(201,64,48,0.15)' }}>
            {t.expiredBanner(studioName)}
          </div>
        )}

        {/* Notes ───────────────────────────────────────────────────────────── */}
        {quote.notes && (
          <div className="mb-6 p-4 rounded-xl text-sm"
            style={{ background: '#fff', border: '1px solid #E8E4DC', color: '#7A7670', lineHeight: 1.6 }}>
            {quote.notes}
          </div>
        )}

        {/* Sections ────────────────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          {quote.sections.map(section => (
            <div key={section.id} className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid #E8E4DC' }}>

              {/* Section header */}
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0EDE8' }}>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base" style={{ color: '#111110' }}>{section.title}</h2>
                  {section.required && section.type !== 'fixed' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(201,64,48,0.08)', color: '#C94030' }}>
                      {t.required}
                    </span>
                  )}
                  {section.type === 'single_choice' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
                      style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                      {t.oneChoice}
                    </span>
                  )}
                  {section.type === 'multiple_choice' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
                      {t.extras}
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="divide-y" style={{ borderColor: '#F0EDE8' }}>
                {section.items.map(item => {
                  const qty = selections[item.id] ?? 0
                  const isSelected = qty > 0

                  if (section.type === 'fixed') {
                    return (
                      <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: '#111110' }}>{item.title}</p>
                          {item.description && (
                            <p className="text-xs mt-0.5" style={{ color: '#B0ACA6' }}>{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {item.editable_qty && (
                            <QtyStepper value={qty} onChange={n => handleQty(item.id, n)} />
                          )}
                          <p className="text-sm font-bold" style={{ color: '#111110', minWidth: 72, textAlign: 'right' }}>
                            {formatEur(item.unit_price * (item.editable_qty ? qty : item.default_qty))}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  if (section.type === 'single_choice') {
                    return (
                      <button key={item.id} type="button"
                        onClick={() => !isExpired && handleSingleChoice(section, item.id)}
                        disabled={isExpired}
                        className="w-full flex items-center gap-4 px-5 py-4 transition-all text-left"
                        style={{
                          background: isSelected ? 'rgba(196,164,124,0.08)' : 'transparent',
                          borderLeft: isSelected ? '3px solid #C4A47C' : '3px solid transparent',
                          cursor: isExpired ? 'not-allowed' : 'pointer',
                        }}>
                        {/* Custom square checkbox */}
                        <div className="flex-shrink-0 mt-0.5" style={{
                          width: 18, height: 18, borderRadius: 5,
                          border: isSelected ? '2px solid #C4A47C' : '2px solid #D4CFC9',
                          background: isSelected ? '#C4A47C' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: '#111110' }}>{item.title}</p>
                          {item.description && (
                            <p className="text-xs mt-0.5" style={{ color: '#B0ACA6' }}>{item.description}</p>
                          )}
                        </div>
                        <p className="text-sm font-bold flex-shrink-0" style={{ color: isSelected ? '#C4A47C' : '#B0ACA6' }}>
                          {formatEur(item.unit_price)}
                        </p>
                      </button>
                    )
                  }

                  // multiple_choice — qty stepper from 0
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4 transition-colors"
                      style={{ background: isSelected ? 'rgba(196,164,124,0.06)' : 'transparent' }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: '#111110' }}>{item.title}</p>
                        {item.description && (
                          <p className="text-xs mt-0.5" style={{ color: '#B0ACA6' }}>{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={() => !isExpired && handleQty(item.id, qty - 1, 0)}
                            disabled={isExpired || qty === 0}
                            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                            style={{ background: '#F0EDE8', color: '#7A7670' }}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold"
                            style={{ color: isSelected ? '#C4A47C' : '#B0ACA6' }}>
                            {qty}
                          </span>
                          <button type="button"
                            onClick={() => !isExpired && handleQty(item.id, qty + 1, 0)}
                            disabled={isExpired}
                            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                            style={{ background: isSelected ? 'rgba(196,164,124,0.15)' : '#F0EDE8', color: isSelected ? '#C4A47C' : '#7A7670' }}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm font-bold" style={{ color: isSelected ? '#C4A47C' : '#B0ACA6', minWidth: 72, textAlign: 'right' }}>
                          {formatEur(item.unit_price * qty)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary ─────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#B0ACA6' }}>
            {t.summary}
          </h3>
          {quote.tax_status !== 'kleinunternehmer' && quote.tax_status !== 'none' && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: '#7A7670' }}>{t.net}</span>
                <span className="text-sm font-medium" style={{ color: '#111110' }}>{formatEur(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm" style={{ color: '#7A7670' }}>{t.vat} {quote.tax_rate}%</span>
                <span className="text-sm font-medium" style={{ color: '#111110' }}>{formatEur(taxAmount)}</span>
              </div>
              <div className="h-px mb-3" style={{ background: '#E8E4DC' }} />
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold" style={{ color: '#111110' }}>{t.total}</span>
            <span className="text-xl font-black" style={{ color: '#C4A47C', letterSpacing: '-0.03em' }}>
              {formatEur(total)}
            </span>
          </div>
          {quote.tax_status === 'kleinunternehmer' && (
            <p className="text-xs mt-2" style={{ color: '#B0ACA6' }}>{t.kleinNote}</p>
          )}
        </div>

        {/* Contact form ────────────────────────────────────────────────────── */}
        {!isExpired && (
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
            <h3 className="font-bold mb-4" style={{ color: '#111110' }}>{t.accept}</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#7A7670' }}>{t.name}</label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{ background: '#F8F7F4', border: '1px solid #E8E4DC', color: '#111110' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#7A7670' }}>{t.email}</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{ background: '#F8F7F4', border: '1px solid #E8E4DC', color: '#111110' }} />
              </div>
            </div>

            {missingRequired.length > 0 && (
              <p className="text-xs mb-3" style={{ color: '#C94030' }}>{t.missingRequired}</p>
            )}
            {error && (
              <p className="text-xs mb-3" style={{ color: '#C94030' }}>{error}</p>
            )}

            <button onClick={handleSubmit} disabled={!canSubmit || submitting}
              className="w-full py-3 rounded-xl font-bold text-sm transition-opacity"
              style={{
                background: canSubmit ? '#111110' : '#E8E4DC',
                color: canSubmit ? '#F8F7F4' : '#B0ACA6',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}>
              {submitting ? t.sending : t.submitBtn(formatEur(total))}
            </button>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: '#B0ACA6' }}>Powered by Fotonizer</p>
      </div>
    </div>
  )
}
