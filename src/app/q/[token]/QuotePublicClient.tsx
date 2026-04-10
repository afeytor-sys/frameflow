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
function ThankYou({ studioName, total }: { studioName: string; total: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8F7F4' }}>
      <div className="max-w-[400px] w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(196,164,124,0.15)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: '#C4A47C' }} />
        </div>
        <h1 className="text-2xl font-black mb-2" style={{ color: '#111110', letterSpacing: '-0.03em' }}>
          Angebot angenommen
        </h1>
        <p className="text-sm mb-1" style={{ color: '#7A7670' }}>
          Deine Auswahl mit einem Gesamtbetrag von <strong style={{ color: '#111110' }}>{formatEur(total)}</strong> wurde übermittelt.
        </p>
        <p className="text-sm" style={{ color: '#7A7670' }}>
          {studioName} wird sich in Kürze bei dir melden.
        </p>
        <p className="text-xs mt-8" style={{ color: '#B0ACA6' }}>Powered by Fotonizer</p>
      </div>
    </div>
  )
}

// ── Qty stepper ───────────────────────────────────────────────────────────────
function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
        style={{ background: '#F0EDE8', color: '#7A7670' }}
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-7 text-center text-sm font-semibold" style={{ color: '#111110' }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
        style={{ background: '#F0EDE8', color: '#7A7670' }}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuotePublicClient({ quote, studioName, token }: Props) {
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

  const handleMultipleChoice = (itemId: string, checked: boolean) => {
    setSelections(prev => {
      const next = { ...prev }
      if (checked) next[itemId] = 1
      else delete next[itemId]
      return next
    })
  }

  const handleQty = (itemId: string, qty: number) => {
    setSelections(prev => ({ ...prev, [itemId]: Math.max(1, qty) }))
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
        throw new Error(data.error || 'Fehler')
      }
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Senden')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Expired guard ───────────────────────────────────────────────────────────
  const isExpired = quote.status === 'expired' ||
    (quote.valid_until != null && new Date(quote.valid_until) < new Date(new Date().toDateString()))

  if (submitted) return <ThankYou studioName={studioName} total={total} />

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#F8F7F4' }}>
      <div className="max-w-[600px] mx-auto">

        {/* Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#B0ACA6' }}>
            Angebot von
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
              }}
            >
              <Clock className="w-3 h-3" />
              {isExpired ? 'Abgelaufen' : `Gültig bis ${new Date(quote.valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            </div>
          )}
        </div>

        {/* Expired banner ──────────────────────────────────────────────────── */}
        {isExpired && (
          <div className="mb-6 p-4 rounded-xl text-sm text-center font-medium"
            style={{ background: 'rgba(201,64,48,0.08)', color: '#C94030', border: '1px solid rgba(201,64,48,0.15)' }}>
            Dieses Angebot ist abgelaufen. Bitte kontaktiere {studioName} für ein aktuelles Angebot.
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
                      Pflichtfeld
                    </span>
                  )}
                  {section.type === 'single_choice' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
                      style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                      Eine Auswahl
                    </span>
                  )}
                  {section.type === 'multiple_choice' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
                      Mehrfachauswahl
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
                      <label key={item.id}
                        className="flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors"
                        style={{ background: isSelected ? 'rgba(196,164,124,0.06)' : 'transparent' }}
                      >
                        <input
                          type="radio"
                          name={`section-${section.id}`}
                          checked={isSelected}
                          onChange={() => handleSingleChoice(section, item.id)}
                          disabled={isExpired}
                          className="mt-0.5 flex-shrink-0"
                          style={{ accentColor: '#C4A47C', width: 16, height: 16 }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: '#111110' }}>{item.title}</p>
                          {item.description && (
                            <p className="text-xs mt-0.5" style={{ color: '#B0ACA6' }}>{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {item.editable_qty && isSelected && (
                            <QtyStepper value={qty} onChange={n => handleQty(item.id, n)} />
                          )}
                          <p className="text-sm font-bold" style={{ color: isSelected ? '#C4A47C' : '#B0ACA6', minWidth: 72, textAlign: 'right' }}>
                            {formatEur(item.unit_price * (item.editable_qty && isSelected ? qty : 1))}
                          </p>
                        </div>
                      </label>
                    )
                  }

                  // multiple_choice
                  return (
                    <label key={item.id}
                      className="flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors"
                      style={{ background: isSelected ? 'rgba(196,164,124,0.06)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => handleMultipleChoice(item.id, e.target.checked)}
                        disabled={isExpired}
                        className="mt-0.5 flex-shrink-0"
                        style={{ accentColor: '#C4A47C', width: 16, height: 16 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: '#111110' }}>{item.title}</p>
                        {item.description && (
                          <p className="text-xs mt-0.5" style={{ color: '#B0ACA6' }}>{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.editable_qty && isSelected && (
                          <QtyStepper value={qty} onChange={n => handleQty(item.id, n)} />
                        )}
                        <p className="text-sm font-bold" style={{ color: isSelected ? '#C4A47C' : '#B0ACA6', minWidth: 72, textAlign: 'right' }}>
                          {formatEur(item.unit_price * (item.editable_qty && isSelected ? qty : 1))}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary ─────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#B0ACA6' }}>
            Zusammenfassung
          </h3>
          {quote.tax_status !== 'kleinunternehmer' && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: '#7A7670' }}>Nettobetrag</span>
                <span className="text-sm font-medium" style={{ color: '#111110' }}>{formatEur(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm" style={{ color: '#7A7670' }}>MwSt {quote.tax_rate}%</span>
                <span className="text-sm font-medium" style={{ color: '#111110' }}>{formatEur(taxAmount)}</span>
              </div>
              <div className="h-px mb-3" style={{ background: '#E8E4DC' }} />
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold" style={{ color: '#111110' }}>Gesamtbetrag</span>
            <span className="text-xl font-black" style={{ color: '#C4A47C', letterSpacing: '-0.03em' }}>
              {formatEur(total)}
            </span>
          </div>
          {quote.tax_status === 'kleinunternehmer' && (
            <p className="text-xs mt-2" style={{ color: '#B0ACA6' }}>
              Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
            </p>
          )}
        </div>

        {/* Contact form ────────────────────────────────────────────────────── */}
        {!isExpired && (
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
            <h3 className="font-bold mb-4" style={{ color: '#111110' }}>
              Angebot annehmen
            </h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#7A7670' }}>Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Dein vollständiger Name"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    background: '#F8F7F4',
                    border: '1px solid #E8E4DC',
                    color: '#111110',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#7A7670' }}>E-Mail</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    background: '#F8F7F4',
                    border: '1px solid #E8E4DC',
                    color: '#111110',
                  }}
                />
              </div>
            </div>

            {missingRequired.length > 0 && (
              <p className="text-xs mb-3" style={{ color: '#C94030' }}>
                Bitte wähle eine Option in allen Pflichtfeldern.
              </p>
            )}
            {error && (
              <p className="text-xs mb-3" style={{ color: '#C94030' }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-3 rounded-xl font-bold text-sm transition-opacity"
              style={{
                background: canSubmit ? '#111110' : '#E8E4DC',
                color: canSubmit ? '#F8F7F4' : '#B0ACA6',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Wird gesendet…' : `Angebot annehmen — ${formatEur(total)}`}
            </button>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: '#B0ACA6' }}>Powered by Fotonizer</p>
      </div>
    </div>
  )
}
