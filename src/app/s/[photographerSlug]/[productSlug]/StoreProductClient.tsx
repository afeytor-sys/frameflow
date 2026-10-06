'use client'

import { useEffect, useMemo, useState } from 'react'

type Variant = { id: string; label: string; price_cents: number }
type Photo = { id: string; thumbnail_url: string | null; storage_url: string; filename: string }
type Data = {
  studioName: string | null
  product: { id: string; title: string; description: string | null; coverUrl: string | null }
  variants: Variant[]
  photos: Photo[]
}
type OrderResult = {
  orderId: string
  paymentReference: string
  totalCents: number
  bank: { holder: string | null; bankName: string | null; iban: string | null; bic: string | null }
}

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export default function StoreProductClient({ photographerSlug, productSlug }: { photographerSlug: string; productSlug: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [variantId, setVariantId] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Deutschland')
  const [couponCode, setCouponCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; discountCents: number } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OrderResult | null>(null)

  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    fetch(`/api/store/${photographerSlug}/${productSlug}`, { signal: controller.signal })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        if (!r.ok) { setLoadError(true); return null }
        return r.json()
      })
      .then((json: Data | null) => {
        if (!json) return
        setData(json)
        if (json.variants[0]) setVariantId(json.variants[0].id)
      })
      .catch(() => setLoadError(true))
      .finally(() => clearTimeout(timer))
    return () => { clearTimeout(timer); controller.abort() }
  }, [photographerSlug, productSlug])

  const selected = useMemo(() => data?.variants.find(v => v.id === variantId) ?? null, [data, variantId])

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const applyCoupon = async () => {
    setCouponError(null)
    if (!couponCode.trim()) return setCouponError('Bitte einen Code eingeben.')
    if (!variantId) return setCouponError('Bitte zuerst eine Variante wählen.')
    setCheckingCoupon(true)
    const res = await fetch(`/api/store/${photographerSlug}/${productSlug}/coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId, couponCode }),
    })
    const json = await res.json().catch(() => ({}))
    setCheckingCoupon(false)
    if (!res.ok) {
      setApplied(null)
      return setCouponError(json.error || 'Gutschein konnte nicht angewendet werden.')
    }
    setApplied({ code: json.code, discountCents: json.discountCents })
  }

  const removeCoupon = () => {
    setApplied(null)
    setCouponCode('')
    setCouponError(null)
  }

  const finalTotal = selected ? selected.price_cents - (applied?.discountCents ?? 0) : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await fetch(`/api/store/${photographerSlug}/${productSlug}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        couponCode: applied?.code || undefined,
        clientName: name,
        clientEmail: email,
        shipping: { street, zip, city, country },
        favoritePhotoIds: Array.from(favorites),
      }),
    })
    const json = await res.json().catch(() => ({}))
    setSubmitting(false)
    if (!res.ok) return setError(json.error || 'Etwas ist schiefgelaufen.')
    setResult(json as OrderResult)
  }

  if (notFound) {
    return <Shell><p className="text-center py-20" style={{ color: '#7A7670' }}>Dieses Angebot ist nicht verfügbar.</p></Shell>
  }
  if (loadError) {
    return (
      <Shell>
        <div className="text-center py-20 space-y-3">
          <p style={{ color: '#111110' }}>Das Angebot konnte gerade nicht geladen werden.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#111110' }}>Erneut versuchen</button>
        </div>
      </Shell>
    )
  }
  if (!data) {
    return <Shell><p className="text-center py-20" style={{ color: '#7A7670' }}>Lädt…</p></Shell>
  }

  if (result) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto space-y-5 py-10">
          <h1 className="text-2xl font-black" style={{ color: '#111110' }}>Vielen Dank für deine Bestellung!</h1>
          <p style={{ color: '#7A7670' }}>Bitte überweise den Betrag mit dieser Referenz:</p>
          <div className="rounded-xl border p-5 space-y-2 text-sm" style={{ borderColor: '#E8E4DC', background: '#fff' }}>
            <p><span style={{ color: '#7A7670' }}>Betrag:</span> <strong>{euro(result.totalCents)}</strong></p>
            <p><span style={{ color: '#7A7670' }}>Empfänger:</span> {result.bank.holder ?? '—'}</p>
            <p><span style={{ color: '#7A7670' }}>IBAN:</span> <span className="font-mono">{result.bank.iban ?? '—'}</span></p>
            {result.bank.bic && <p><span style={{ color: '#7A7670' }}>BIC:</span> <span className="font-mono">{result.bank.bic}</span></p>}
            <p><span style={{ color: '#7A7670' }}>Verwendungszweck:</span> <strong className="font-mono">{result.paymentReference}</strong></p>
          </div>
          <p className="text-sm" style={{ color: '#7A7670' }}>Sobald die Zahlung eingegangen ist, beginnen wir mit der Produktion.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        <div>
          {data.studioName && <p className="text-xs uppercase tracking-wide" style={{ color: '#C4A47C' }}>{data.studioName}</p>}
          <h1 className="text-3xl font-black mt-1" style={{ color: '#111110' }}>{data.product.title}</h1>
          {data.product.description && <p className="mt-2" style={{ color: '#7A7670' }}>{data.product.description}</p>}
        </div>

        <form onSubmit={submit} className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-bold" style={{ color: '#111110' }}>1. Variante wählen</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.variants.map(v => (
                <label key={v.id} className="rounded-xl border p-4 cursor-pointer flex items-center justify-between"
                  style={{ borderColor: variantId === v.id ? '#C4A47C' : '#E8E4DC', background: '#fff' }}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="variant" checked={variantId === v.id} onChange={() => { setVariantId(v.id); setApplied(null) }} />
                    <span style={{ color: '#111110' }}>{v.label}</span>
                  </span>
                  <span className="font-bold" style={{ color: '#111110' }}>{euro(v.price_cents)}</span>
                </label>
              ))}
            </div>
          </section>

          {data.photos.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold" style={{ color: '#111110' }}>2. Fotos für das Album auswählen</h2>
              <p className="text-sm" style={{ color: '#7A7670' }}>Tippe auf die Fotos, die im Album erscheinen sollen. Ausgewählt: {favorites.size}</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[420px] overflow-y-auto">
                {data.photos.map(p => {
                  const on = favorites.has(p.id)
                  return (
                    <button type="button" key={p.id} onClick={() => toggleFavorite(p.id)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2"
                      style={{ borderColor: on ? '#C4A47C' : 'transparent' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumbnail_url || p.storage_url} alt={p.filename} className="w-full h-full object-cover" />
                      {on && <span className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#C4A47C' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-bold" style={{ color: '#111110' }}>{data.photos.length > 0 ? '3' : '2'}. Deine Angaben</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required className="input-base" placeholder="Vor- und Nachname" value={name} onChange={e => setName(e.target.value)} />
              <input required type="email" className="input-base" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} />
              <input required className="input-base sm:col-span-2" placeholder="Straße und Hausnummer" value={street} onChange={e => setStreet(e.target.value)} />
              <input required className="input-base" placeholder="PLZ" value={zip} onChange={e => setZip(e.target.value)} />
              <input required className="input-base" placeholder="Ort" value={city} onChange={e => setCity(e.target.value)} />
              <input required className="input-base sm:col-span-2" placeholder="Land" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-bold" style={{ color: '#111110' }}>{data.photos.length > 0 ? '4' : '3'}. Gutschein (optional)</h2>
            {applied ? (
              <div className="flex items-center justify-between rounded-xl border px-4 py-3 max-w-md" style={{ borderColor: '#2A9B68', background: '#fff' }}>
                <p className="text-sm" style={{ color: '#2A9B68' }}>
                  Gutschein <strong className="font-mono">{applied.code}</strong> angewendet (−{euro(applied.discountCents)})
                </p>
                <button type="button" onClick={removeCoupon} className="text-xs underline" style={{ color: '#7A7670' }}>Entfernen</button>
              </div>
            ) : (
              <div className="flex gap-2 max-w-md">
                <input
                  className="input-base flex-1"
                  placeholder="Gutscheincode"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                />
                <button type="button" onClick={applyCoupon} disabled={checkingCoupon}
                  className="px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#111110' }}>
                  {checkingCoupon ? '…' : 'Anwenden'}
                </button>
              </div>
            )}
            {couponError && <p className="text-sm" style={{ color: '#C43B2C' }}>{couponError}</p>}
          </section>

          <div className="rounded-xl border p-5 flex items-center justify-between" style={{ borderColor: '#E8E4DC', background: '#fff' }}>
            <div className="space-y-1">
              {selected && applied && (
                <p className="text-sm" style={{ color: '#7A7670' }}>
                  Preis {euro(selected.price_cents)} · Rabatt −{euro(applied.discountCents)}
                </p>
              )}
              <p className="text-sm" style={{ color: '#7A7670' }}>Gesamtbetrag (inkl. MwSt.)</p>
              <p className="text-xl font-black" style={{ color: '#111110' }}>{finalTotal !== null ? euro(finalTotal) : '—'}</p>
            </div>
            <button type="submit" disabled={submitting || !selected} className="px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: '#111110' }}>
              {submitting ? 'Wird gesendet…' : 'Jetzt bestellen'}
            </button>
          </div>
          {error && <p className="text-sm" style={{ color: '#C43B2C' }}>{error}</p>}
        </form>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-5 py-8" style={{ background: '#F8F7F4', color: '#111110' }}>
      {children}
    </div>
  )
}
