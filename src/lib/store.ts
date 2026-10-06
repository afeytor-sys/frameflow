import type { SupabaseClient } from '@supabase/supabase-js'

export type Coupon = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  valid_until: string | null
  max_uses: number | null
  used_count: number
  active: boolean
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

// Returns a human-readable error, or null if the coupon can be used now.
export function checkCouponUsable(coupon: Coupon, now = new Date()): string | null {
  if (!coupon.active) return 'Dieser Gutschein ist nicht mehr gültig.'
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return 'Dieser Gutschein ist abgelaufen.'
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return 'Dieser Gutschein wurde bereits vollständig eingelöst.'
  return null
}

export function applyDiscount(subtotalCents: number, coupon: Coupon | null): number {
  if (!coupon) return 0
  const raw = coupon.discount_type === 'percent'
    ? Math.round((subtotalCents * coupon.discount_value) / 100)
    : coupon.discount_value
  return Math.min(subtotalCents, Math.max(0, raw))
}

export async function findCoupon(
  supabase: SupabaseClient,
  photographerId: string,
  code: string,
): Promise<Coupon | null> {
  const { data } = await supabase
    .from('store_coupons')
    .select('id, code, discount_type, discount_value, valid_until, max_uses, used_count, active')
    .eq('photographer_id', photographerId)
    .eq('code', normalizeCode(code))
    .maybeSingle()
  return (data as Coupon | null) ?? null
}

export function paymentReference(orderId: string) {
  return `SHOP-${orderId.slice(0, 8).toUpperCase()}`
}

export type GalleryStoreBanner = { href: string; title: string; fromCents: number }

// The active store product linked to a gallery, for the "Album bestellen" banner.
export async function getGalleryStoreBanner(
  supabase: SupabaseClient,
  galleryId: string,
): Promise<GalleryStoreBanner | null> {
  const { data } = await supabase
    .from('store_products')
    .select('slug, title, photographer:photographers(slug), store_product_variants(price_cents)')
    .eq('gallery_id', galleryId)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (!data) return null

  const photographer = Array.isArray(data.photographer) ? data.photographer[0] : data.photographer
  if (!photographer?.slug) return null

  const prices = ((data.store_product_variants ?? []) as { price_cents: number }[]).map(v => v.price_cents)
  if (prices.length === 0) return null

  return {
    href: `/s/${photographer.slug}/${data.slug}`,
    title: data.title,
    fromCents: Math.min(...prices),
  }
}

export type ExtraLine = { label: string; price_cents: number }

// Loads the chosen extras of a product from the database. Ids that don't belong to the product are ignored.
export async function resolveExtras(
  supabase: SupabaseClient,
  productId: string,
  extraIds: string[],
): Promise<ExtraLine[]> {
  if (!Array.isArray(extraIds) || extraIds.length === 0) return []
  const { data } = await supabase
    .from('store_product_extras')
    .select('id, label, price_cents')
    .eq('product_id', productId)
    .in('id', extraIds)
  return ((data ?? []) as { label: string; price_cents: number }[]).map(e => ({ label: e.label, price_cents: e.price_cents }))
}
