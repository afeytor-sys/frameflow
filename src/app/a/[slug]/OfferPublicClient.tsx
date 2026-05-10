'use client'

import { useState } from 'react'
import { CheckCircle2, ExternalLink, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OfferService {
  id: string
  title: string
  description: string | null
  included: boolean
  price: number | null
  sort_order: number
}

interface OfferExtra {
  id: string
  title: string
  description: string | null
  price: number
  selectable: boolean
  sort_order: number
}

type GalleryLink =
  | { type: 'link'; label: string; description?: string; url: string; image_url?: string }
  | { type: 'text'; heading: string; content: string }
  | { label: string; url: string; description?: string; image_url?: string }

interface Offer {
  id: string
  title: string
  slug: string
  status: string
  event_date: string | null
  valid_until: string | null
  base_price: number
  currency: string
  deposit_amount: number | null
  intro_text: string | null
  notes: string | null
  gallery_links: GalleryLink[]
}

interface Photographer {
  id: string
  full_name: string | null
  studio_name: string | null
  logo_url: string | null
  email: string | null
  website: string | null
}

interface Props {
  offer: Offer
  photographer: Photographer | null
  clientName: string | null
  services: OfferService[]
  extras: OfferExtra[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OfferPublicClient({ offer, photographer, clientName, services, extras }: Props) {
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set())
  const [showAcceptForm, setShowAcceptForm] = useState(false)
  const [accepted, setAccepted] = useState(offer.status === 'accepted')
  const [acceptForm, setAcceptForm] = useState({ name: clientName || '', email: '' })
  const [accepting, setAccepting] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const studioName = photographer?.studio_name || photographer?.full_name || ''
  const isExpired = offer.status === 'expired' || offer.status === 'declined'
  const isAccepted = accepted

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const extrasTotal = extras
    .filter(e => selectedExtras.has(e.id))
    .reduce((sum, e) => sum + e.price, 0)

  const total = offer.base_price + extrasTotal

  const handleAccept = async () => {
    if (!acceptForm.name.trim()) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: acceptForm.name.trim(),
          client_email: acceptForm.email.trim(),
          selected_extras: Array.from(selectedExtras),
        }),
      })
      if (res.ok) {
        setAccepted(true)
        setShowAcceptForm(false)
      }
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div style={{ background: '#F7F5F1', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Expired banner */}
      {isExpired && (
        <div style={{ background: '#FEF3C7', borderBottom: '1px solid #FDE68A', padding: '12px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
            Dieses Angebot ist nicht mehr gültig. Bitte nimm Kontakt auf für ein aktuelles Angebot.
          </p>
        </div>
      )}

      {/* Accepted banner */}
      {isAccepted && (
        <div style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', borderBottom: '1px solid #6EE7B7', padding: '16px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '15px', color: '#065F46', fontWeight: 700 }}>
            ✓ Angebot angenommen — {studioName} meldet sich in Kürze bei dir.
          </p>
        </div>
      )}

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{ marginBottom: '56px' }}>
          {photographer?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photographer.logo_url}
              alt={studioName}
              style={{ height: '36px', objectFit: 'contain', marginBottom: '16px' }}
            />
          )}
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>
            {studioName}
          </p>
          <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, color: '#1C1C1A', letterSpacing: '-0.035em', lineHeight: 1.06 }}>
            {offer.title}
          </h1>

          {/* Meta pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
            {clientName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#fff', border: '1px solid #E8E4DC', borderRadius: '100px', fontSize: '13px', color: '#5A534E', fontWeight: 500 }}>
                Für {clientName}
              </span>
            )}
            {offer.event_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#fff', border: '1px solid #E8E4DC', borderRadius: '100px', fontSize: '13px', color: '#5A534E', fontWeight: 500 }}>
                📅 {formatDate(offer.event_date)}
              </span>
            )}
            {offer.valid_until && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#fff', border: '1px solid #E8E4DC', borderRadius: '100px', fontSize: '13px', color: '#5A534E', fontWeight: 500 }}>
                Gültig bis {formatDate(offer.valid_until)}
              </span>
            )}
          </div>

          {/* Intro text */}
          {offer.intro_text && (
            <p style={{ margin: 0, fontSize: '17px', color: '#6B6460', lineHeight: 1.75, fontWeight: 400 }}>
              {offer.intro_text}
            </p>
          )}
        </header>

        {/* ── Services ────────────────────────────────────────────────────── */}
        {services.filter(s => s.included).length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>
              Was ist dabei
            </h2>
            <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 24px rgba(0,0,0,0.05)', border: '1px solid #EDE9E3' }}>
              {services.filter(s => s.included).map((svc, i) => (
                <div
                  key={svc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '18px 24px',
                    borderBottom: i < services.filter(s => s.included).length - 1 ? '1px solid #F0EDE8' : 'none',
                  }}
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(196,164,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4L4 7.5L10 1" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1C1C1A' }}>{svc.title}</p>
                    {svc.description && (
                      <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#9A9188', lineHeight: 1.5 }}>{svc.description}</p>
                    )}
                  </div>
                  {svc.price != null && (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#C4A47C', flexShrink: 0 }}>{formatEur(svc.price)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        {offer.base_price > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>
              Investition
            </h2>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 28px', boxShadow: '0 2px 24px rgba(0,0,0,0.05)', border: '1px solid #EDE9E3' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#9A9188' }}>Basispreis</p>
                  <p style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: '#1C1C1A', letterSpacing: '-0.04em' }}>{formatEur(offer.base_price)}</p>
                </div>
                {offer.deposit_amount && offer.deposit_amount > 0 && (
                  <div style={{ textAlign: 'right', padding: '10px 16px', background: 'rgba(196,164,124,0.08)', borderRadius: '12px', border: '1px solid rgba(196,164,124,0.2)' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4A47C' }}>Anzahlung</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#C4A47C' }}>{formatEur(offer.deposit_amount)}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Extras ──────────────────────────────────────────────────────── */}
        {extras.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>
              Extras
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#9A9188' }}>
              Wähle optionale Zusatzleistungen — der Gesamtpreis aktualisiert sich automatisch.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {extras.map(ext => {
                const selected = selectedExtras.has(ext.id)
                return (
                  <button
                    key={ext.id}
                    onClick={() => !isExpired && !isAccepted && toggleExtra(ext.id)}
                    disabled={isExpired || isAccepted}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '18px 22px',
                      background: '#fff',
                      border: `2px solid ${selected ? '#C4A47C' : '#EDE9E3'}`,
                      borderRadius: '16px',
                      cursor: isExpired || isAccepted ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      boxShadow: selected ? '0 4px 20px rgba(196,164,124,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                      border: `2px solid ${selected ? '#C4A47C' : '#D9D4CE'}`,
                      background: selected ? '#C4A47C' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {selected && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1C1C1A' }}>{ext.title}</p>
                      {ext.description && (
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#9A9188' }}>{ext.description}</p>
                      )}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: selected ? '#C4A47C' : '#5A534E', flexShrink: 0 }}>
                      +{formatEur(ext.price)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Running total */}
            {selectedExtras.size > 0 && (
              <div style={{ marginTop: '20px', padding: '18px 22px', background: 'rgba(196,164,124,0.08)', borderRadius: '14px', border: '1px solid rgba(196,164,124,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#7A7468', fontWeight: 500 }}>Gesamtbetrag inkl. Extras</p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#C4A47C', letterSpacing: '-0.03em' }}>{formatEur(total)}</p>
              </div>
            )}
          </section>
        )}

        {/* ── Gallery links & text blocks ──────────────────────────────────── */}
        {offer.gallery_links && offer.gallery_links.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>
              Beispiele & Links
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {offer.gallery_links.map((item, i) => {
                // Text block
                if ('type' in item && item.type === 'text') {
                  const tb = item as { type: 'text'; heading: string; content: string }
                  return (
                    <div key={i} style={{ background: '#fff', borderRadius: '20px', border: '1px solid #EDE9E3', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                      {tb.heading && (
                        <div style={{ padding: '14px 24px 0' }}>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>{tb.heading}</p>
                        </div>
                      )}
                      <div style={{ padding: tb.heading ? '10px 24px 20px' : '20px 24px' }}>
                        <p style={{ margin: 0, fontSize: '15px', color: '#6B6460', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{tb.content}</p>
                      </div>
                    </div>
                  )
                }
                // Link block (type: 'link' or legacy without type)
                const lnk = item as { label?: string; url: string; description?: string; image_url?: string }
                return (
                  <a
                    key={i}
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      background: '#fff',
                      border: '1px solid #EDE9E3',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                      transition: 'box-shadow 0.18s, border-color 0.18s',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 32px rgba(196,164,124,0.18)'
                      ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(196,164,124,0.4)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.05)'
                      ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#EDE9E3'
                    }}
                  >
                    {lnk.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lnk.image_url}
                        alt={lnk.label || ''}
                        style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1C1C1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lnk.label || lnk.url}
                        </p>
                        {lnk.description && (
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9A9188', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {lnk.description}
                          </p>
                        )}
                      </div>
                      <span style={{
                        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', background: 'rgba(196,164,124,0.1)', borderRadius: '100px',
                        border: '1px solid rgba(196,164,124,0.25)', fontSize: '12px', fontWeight: 700,
                        color: '#C4A47C', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                      }}>
                        Ansehen <ExternalLink style={{ width: '11px', height: '11px' }} />
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        {offer.notes && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA3' }}>
              Hinweise
            </h2>
            <p style={{ margin: 0, fontSize: '15px', color: '#6B6460', lineHeight: 1.75 }}>{offer.notes}</p>
          </section>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        {!isExpired && !isAccepted && (
          <section style={{ marginBottom: '48px' }}>
            {!showAcceptForm ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', background: '#fff', borderRadius: '24px', border: '1px solid #EDE9E3', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#1C1C1A', letterSpacing: '-0.02em' }}>
                  Bereit loszulegen?
                </p>
                <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#9A9188' }}>
                  {extras.length > 0 && selectedExtras.size === 0
                    ? 'Wähle bei Bedarf Extras oben aus und nimm das Angebot an.'
                    : 'Nimm das Angebot an — wir melden uns umgehend.'}
                </p>
                {offer.base_price > 0 && (
                  <p style={{ margin: '0 0 24px', fontSize: '32px', fontWeight: 900, color: '#C4A47C', letterSpacing: '-0.04em' }}>
                    {formatEur(total)}
                  </p>
                )}
                <button
                  onClick={() => setShowAcceptForm(true)}
                  style={{
                    padding: '18px 52px',
                    background: 'linear-gradient(135deg, #C4A47C, #B8956A)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '100px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(196,164,124,0.40)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Angebot annehmen →
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #EDE9E3', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' }}>
                <p style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700, color: '#1C1C1A' }}>Deine Angaben</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#B5ADA3', marginBottom: '6px' }}>Name *</label>
                    <input
                      type="text"
                      placeholder="Dein vollständiger Name"
                      value={acceptForm.name}
                      onChange={e => setAcceptForm(p => ({ ...p, name: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8E4DC', borderRadius: '12px', fontSize: '15px', color: '#1C1C1A', background: '#FAF8F5', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#B5ADA3', marginBottom: '6px' }}>E-Mail</label>
                    <input
                      type="email"
                      placeholder="deine@email.de"
                      value={acceptForm.email}
                      onChange={e => setAcceptForm(p => ({ ...p, email: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8E4DC', borderRadius: '12px', fontSize: '15px', color: '#1C1C1A', background: '#FAF8F5', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                {selectedExtras.size > 0 && (
                  <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'rgba(196,164,124,0.08)', borderRadius: '12px', border: '1px solid rgba(196,164,124,0.2)' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#7A7468' }}>
                      Ausgewählte Extras: {extras.filter(e => selectedExtras.has(e.id)).map(e => e.title).join(', ')}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: '#C4A47C' }}>Gesamt: {formatEur(total)}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowAcceptForm(false)}
                    style={{ flex: 1, padding: '14px', background: '#F5F2EE', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#7A7468', cursor: 'pointer' }}
                  >
                    Zurück
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={accepting || !acceptForm.name.trim()}
                    style={{
                      flex: 2, padding: '14px',
                      background: accepting || !acceptForm.name.trim() ? '#D5CAC0' : 'linear-gradient(135deg, #C4A47C, #B8956A)',
                      border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: '#fff',
                      cursor: accepting || !acceptForm.name.trim() ? 'default' : 'pointer',
                    }}
                  >
                    {accepting ? 'Wird gesendet…' : 'Angebot annehmen ✓'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer style={{ textAlign: 'center', paddingTop: '32px', borderTop: '1px solid #EDE9E3' }}>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#B5ADA3' }}>{studioName}</p>
          {photographer?.email && (
            <a href={`mailto:${photographer.email}`} style={{ display: 'block', fontSize: '12px', color: '#C4A47C', textDecoration: 'none', marginBottom: '4px' }}>
              {photographer.email}
            </a>
          )}
          {photographer?.website && (
            <a href={photographer.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#C4A47C', textDecoration: 'none' }}>
              {photographer.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {offer.valid_until && (
            <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#C8C2BB' }}>
              Angebot gültig bis {formatDate(offer.valid_until)}
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}
