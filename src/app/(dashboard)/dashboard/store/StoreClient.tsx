'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Variant = { id: string; label: string; price_cents: number; sort_order: number }
type Product = {
  id: string
  slug: string
  title: string
  description: string | null
  active: boolean
  gallery_id: string | null
  store_product_variants: Variant[]
}
type Order = {
  id: string
  product_title: string
  variant_label: string
  client_name: string
  client_email: string
  shipping_address: { street: string; zip: string; city: string; country: string }
  favorite_photo_ids: string[]
  total_cents: number
  discount_cents: number
  status: 'pending' | 'paid' | 'in_production' | 'shipped' | 'cancelled'
  payment_method: string
  payment_reference: string
  created_at: string
}
type Coupon = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  valid_until: string | null
  max_uses: number | null
  used_count: number
  active: boolean
}
type Gallery = { id: string; title: string }

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-+|-+$/g, '')

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Warte auf Zahlung',
  paid: 'Bezahlt',
  in_production: 'In Produktion',
  shipped: 'Versendet',
  cancelled: 'Storniert',
}

export default function StoreClient({
  photographerId,
  photographerSlug,
  initialProducts,
  galleries,
  initialOrders,
  initialCoupons,
}: {
  photographerId: string
  photographerSlug: string | null
  initialProducts: Product[]
  galleries: Gallery[]
  initialOrders: Order[]
  initialCoupons: Coupon[]
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'products' | 'orders' | 'coupons'>('products')
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)

  // New product form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newGallery, setNewGallery] = useState('')
  const [saving, setSaving] = useState(false)

  // New variant inputs per product
  const [variantDraft, setVariantDraft] = useState<Record<string, { label: string; price: string }>>({})

  // New coupon form
  const [cCode, setCCode] = useState('')
  const [cType, setCType] = useState<'percent' | 'fixed'>('percent')
  const [cValue, setCValue] = useState('')
  const [cUntil, setCUntil] = useState('')
  const [cMax, setCMax] = useState('')

  const publicUrl = (slug: string) =>
    photographerSlug ? `${window.location.origin}/s/${photographerSlug}/${slug}` : ''

  const createProduct = async () => {
    if (!newTitle.trim()) return toast.error('Bitte einen Titel eingeben.')
    if (!photographerSlug) return toast.error('Bitte zuerst einen Buchungs-Slug in den Einstellungen setzen (wird für den Store-Link genutzt).')
    setSaving(true)
    const slug = slugify(newTitle)
    const { data, error } = await supabase
      .from('store_products')
      .insert({
        photographer_id: photographerId,
        slug,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        gallery_id: newGallery || null,
      })
      .select('id, slug, title, description, active, gallery_id')
      .single()
    setSaving(false)
    if (error) return toast.error(error.message.includes('duplicate') ? 'Es gibt schon ein Produkt mit diesem Namen.' : 'Fehler beim Erstellen.')
    setProducts(prev => [{ ...(data as Omit<Product, 'store_product_variants'>), store_product_variants: [] }, ...prev])
    setNewTitle(''); setNewDesc(''); setNewGallery('')
    toast.success('Produkt erstellt')
  }

  const toggleProduct = async (p: Product) => {
    const { error } = await supabase.from('store_products').update({ active: !p.active }).eq('id', p.id)
    if (error) return toast.error('Fehler')
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Produkt wirklich löschen?')) return
    const { error } = await supabase.from('store_products').delete().eq('id', id)
    if (error) return toast.error('Fehler beim Löschen')
    setProducts(prev => prev.filter(x => x.id !== id))
  }

  const addVariant = async (productId: string) => {
    const d = variantDraft[productId]
    if (!d?.label.trim() || !d?.price) return toast.error('Bezeichnung und Preis angeben.')
    const cents = Math.round(parseFloat(d.price.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents < 0) return toast.error('Ungültiger Preis.')
    const product = products.find(p => p.id === productId)
    const { data, error } = await supabase
      .from('store_product_variants')
      .insert({
        product_id: productId,
        label: d.label.trim(),
        price_cents: cents,
        sort_order: product?.store_product_variants.length ?? 0,
      })
      .select('id, label, price_cents, sort_order')
      .single()
    if (error) return toast.error('Fehler beim Hinzufügen')
    setProducts(prev => prev.map(p => p.id === productId
      ? { ...p, store_product_variants: [...p.store_product_variants, data as Variant] }
      : p))
    setVariantDraft(prev => ({ ...prev, [productId]: { label: '', price: '' } }))
  }

  const deleteVariant = async (productId: string, variantId: string) => {
    const { error } = await supabase.from('store_product_variants').delete().eq('id', variantId)
    if (error) return toast.error('Fehler')
    setProducts(prev => prev.map(p => p.id === productId
      ? { ...p, store_product_variants: p.store_product_variants.filter(v => v.id !== variantId) }
      : p))
  }

  const setOrderStatus = async (orderId: string, status: Order['status']) => {
    const patch: Record<string, unknown> = { status }
    if (status === 'paid') patch.paid_at = new Date().toISOString()
    const { error } = await supabase.from('store_orders').update(patch).eq('id', orderId)
    if (error) return toast.error('Fehler')
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  const createCoupon = async () => {
    const code = cCode.trim().toUpperCase()
    const value = Math.round(parseFloat(cValue.replace(',', '.')) * (cType === 'fixed' ? 100 : 1))
    if (!code || !Number.isFinite(value) || value <= 0) return toast.error('Code und Wert angeben.')
    if (cType === 'percent' && value > 100) return toast.error('Prozent darf nicht über 100 liegen.')
    const { data, error } = await supabase
      .from('store_coupons')
      .insert({
        photographer_id: photographerId,
        code,
        discount_type: cType,
        discount_value: value,
        valid_until: cUntil ? new Date(cUntil).toISOString() : null,
        max_uses: cMax ? parseInt(cMax, 10) : null,
      })
      .select('*')
      .single()
    if (error) return toast.error(error.message.includes('duplicate') ? 'Dieser Code existiert schon.' : 'Fehler')
    setCoupons(prev => [data as Coupon, ...prev])
    setCCode(''); setCValue(''); setCUntil(''); setCMax('')
    toast.success('Gutschein erstellt')
  }

  const toggleCoupon = async (c: Coupon) => {
    const { error } = await supabase.from('store_coupons').update({ active: !c.active }).eq('id', c.id)
    if (error) return toast.error('Fehler')
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  const deleteCoupon = async (id: string) => {
    const { error } = await supabase.from('store_coupons').delete().eq('id', id)
    if (error) return toast.error('Fehler')
    setCoupons(prev => prev.filter(x => x.id !== id))
  }

  const tabBtn = (key: typeof tab, label: string) => (
    <button
      onClick={() => setTab(key)}
      className="px-4 py-2 rounded-lg text-sm font-semibold"
      style={{ background: tab === key ? 'var(--accent)' : 'var(--bg-hover)', color: tab === key ? '#fff' : 'var(--text-muted)' }}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Store</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Verkaufe Alben und Produkte über einen Link, den du deinen Kunden schicken kannst.
        </p>
      </div>

      <div className="flex gap-2">
        {tabBtn('products', 'Produkte')}
        {tabBtn('orders', `Bestellungen${orders.length ? ` (${orders.length})` : ''}`)}
        {tabBtn('coupons', 'Gutscheine')}
      </div>

      {tab === 'products' && (
        <div className="space-y-6">
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Neues Produkt</p>
            <input className="input-base" placeholder="z.B. Hochzeitsalbum Julia & Ingo" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea className="input-base" rows={3} placeholder="Beschreibung (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <select className="input-base" value={newGallery} onChange={e => setNewGallery(e.target.value)}>
              <option value="">Keine Galerie (ohne Fotoauswahl)</option>
              {galleries.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
            <button onClick={createProduct} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              Produkt erstellen
            </button>
          </div>

          {products.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Noch keine Produkte.</p>
          )}

          {products.map(p => (
            <div key={p.id} className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                  {p.description && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{p.description}</p>}
                  {photographerSlug && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(publicUrl(p.slug)); toast.success('Link kopiert') }}
                      className="text-xs mt-2 underline" style={{ color: 'var(--accent)' }}
                    >
                      Link kopieren: /s/{photographerSlug}/{p.slug}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => toggleProduct(p)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    {p.active ? 'Aktiv' : 'Inaktiv'}
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="text-xs" style={{ color: '#C43B2C' }}>Löschen</button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Varianten</p>
                {p.store_product_variants.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{v.label}</span>
                    <span className="flex items-center gap-4">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{euro(v.price_cents)}</span>
                      <button onClick={() => deleteVariant(p.id, v.id)} className="text-xs" style={{ color: '#C43B2C' }}>Entfernen</button>
                    </span>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <input className="input-base" placeholder="z.B. 35 Seiten" value={variantDraft[p.id]?.label ?? ''} onChange={e => setVariantDraft(prev => ({ ...prev, [p.id]: { label: e.target.value, price: prev[p.id]?.price ?? '' } }))} />
                  <input className="input-base" placeholder="Preis €" inputMode="decimal" value={variantDraft[p.id]?.price ?? ''} onChange={e => setVariantDraft(prev => ({ ...prev, [p.id]: { label: prev[p.id]?.label ?? '', price: e.target.value } }))} />
                  <button onClick={() => addVariant(p.id)} className="px-4 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>Hinzufügen</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Noch keine Bestellungen.</p>}
          {orders.map(o => (
            <div key={o.id} className="rounded-xl border p-5 space-y-2" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{o.client_name} · {o.product_title} — {o.variant_label}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {o.client_email} · Ref. <span className="font-mono">{o.payment_reference}</span> · {new Date(o.created_at).toLocaleDateString('de-DE')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {o.shipping_address.street}, {o.shipping_address.zip} {o.shipping_address.city}, {o.shipping_address.country}
                  </p>
                  {o.favorite_photo_ids.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{o.favorite_photo_ids.length} Fotos ausgewählt</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{euro(o.total_cents)}</p>
                  {o.discount_cents > 0 && <p className="text-xs" style={{ color: '#2A9B68' }}>Rabatt −{euro(o.discount_cents)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select className="input-base max-w-xs" value={o.status} onChange={e => setOrderStatus(o.id, e.target.value as Order['status'])}>
                  {(Object.keys(STATUS_LABEL) as Order['status'][]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                {o.status === 'pending' && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Setze auf „Bezahlt“, sobald die Überweisung eingegangen ist.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'coupons' && (
        <div className="space-y-6">
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Neuer Gutschein</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input-base" placeholder="Code, z.B. SOMMER20" value={cCode} onChange={e => setCCode(e.target.value)} />
              <select className="input-base" value={cType} onChange={e => setCType(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Prozent (%)</option>
                <option value="fixed">Festbetrag (€)</option>
              </select>
              <input className="input-base" placeholder={cType === 'percent' ? 'z.B. 20' : 'z.B. 50'} inputMode="decimal" value={cValue} onChange={e => setCValue(e.target.value)} />
              <input className="input-base" type="date" value={cUntil} onChange={e => setCUntil(e.target.value)} title="Gültig bis (optional)" />
              <input className="input-base" placeholder="Max. Einlösungen (optional)" inputMode="numeric" value={cMax} onChange={e => setCMax(e.target.value)} />
            </div>
            <button onClick={createCoupon} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>Gutschein erstellen</button>
          </div>

          {coupons.map(c => (
            <div key={c.id} className="rounded-xl border p-4 flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
              <div>
                <p className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{c.code}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {c.discount_type === 'percent' ? `${c.discount_value} %` : euro(c.discount_value)} Rabatt
                  {c.valid_until ? ` · gültig bis ${new Date(c.valid_until).toLocaleDateString('de-DE')}` : ''}
                  {` · ${c.used_count}${c.max_uses !== null ? ` / ${c.max_uses}` : ''} eingelöst`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleCoupon(c)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  {c.active ? 'Aktiv' : 'Inaktiv'}
                </button>
                <button onClick={() => deleteCoupon(c.id)} className="text-xs" style={{ color: '#C43B2C' }}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
