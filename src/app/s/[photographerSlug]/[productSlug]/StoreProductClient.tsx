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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OrderResult | null>(null)

  useEffect(() => {
    fetch(`/api/store/${photographerSlug}/${productSlug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((json: Data | null) => {
        if (!json) return
        setData(json)
        if (json.variants[0]) setVariantId(json.variants[0].id)
      })
      .catch(() => setNotFound(true))
  }, [photographerSlug, productSlug])

  const selected = useMemo(() => data?.variants.find(v => v.id === variantId) ?? null, [data, variantId])

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await fetch(`/api/store/${photographerSlug}/${productSlug}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        couponCode: couponCode.trim() || undefined,
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
                    <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
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
            <input className="input-base max-w-xs" placeholder="Gutscheincode" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
          </section>

          <div className="rounded-xl border p-5 flex items-center justify-between" style={{ borderColor: '#E8E4DC', background: '#fff' }}>
            <div>
              <p className="text-sm" style={{ color: '#7A7670' }}>Gesamtbetrag (inkl. MwSt.)</p>
              <p className="text-xl font-black" style={{ color: '#111110' }}>{selected ? euro(selected.price_cents) : '—'}</p>
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
