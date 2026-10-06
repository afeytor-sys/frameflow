import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { applyDiscount, checkCouponUsable, findCoupon, paymentReference, resolveExtras, type Coupon } from '@/lib/store'

// Public: a client places an order for a store product.
// All prices are computed here from the database — the client only sends a variant id.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ photographerSlug: string; productSlug: string }> }
) {
  const { photographerSlug, productSlug } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })

  const { variantId, extraIds, couponCode, clientName, clientEmail, shipping, favoritePhotoIds } = body as {
    extraIds?: string[]
    variantId?: string
    couponCode?: string
    clientName?: string
    clientEmail?: string
    shipping?: { street?: string; zip?: string; city?: string; country?: string }
    favoritePhotoIds?: string[]
  }

  if (!variantId || !clientName?.trim() || !clientEmail?.trim()) {
    return NextResponse.json({ error: 'Bitte alle Pflichtfelder ausfüllen.' }, { status: 400 })
  }
  if (!shipping?.street?.trim() || !shipping?.zip?.trim() || !shipping?.city?.trim() || !shipping?.country?.trim()) {
    return NextResponse.json({ error: 'Bitte die Lieferadresse vollständig angeben.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, bank_account_holder, bank_name, bank_iban, bank_bic')
    .eq('slug', photographerSlug)
    .maybeSingle()
  if (!photographer) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: product } = await supabase
    .from('store_products')
    .select('id, title, active')
    .eq('photographer_id', photographer.id)
    .eq('slug', productSlug)
    .maybeSingle()
  if (!product || !product.active) return NextResponse.json({ error: 'Produkt nicht verfügbar' }, { status: 404 })

  const { data: variant } = await supabase
    .from('store_product_variants')
    .select('id, label, price_cents')
    .eq('id', variantId)
    .eq('product_id', product.id)
    .maybeSingle()
  if (!variant) return NextResponse.json({ error: 'Bitte eine gültige Variante wählen.' }, { status: 400 })

  let coupon: Coupon | null = null
  if (couponCode?.trim()) {
    coupon = await findCoupon(supabase, photographer.id, couponCode)
    if (!coupon) return NextResponse.json({ error: 'Gutschein nicht gefunden.' }, { status: 400 })
    const problem = checkCouponUsable(coupon)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  }

  const extras = await resolveExtras(supabase, product.id, extraIds ?? [])
  const subtotal = variant.price_cents + extras.reduce((sum, e) => sum + e.price_cents, 0)
  const discount = applyDiscount(subtotal, coupon)
  const total = subtotal - discount
  const orderId = crypto.randomUUID()

  const { error: insertError } = await supabase.from('store_orders').insert({
    id: orderId,
    photographer_id: photographer.id,
    product_id: product.id,
    variant_id: variant.id,
    coupon_id: coupon?.id ?? null,
    product_title: product.title,
    variant_label: variant.label,
    client_name: clientName.trim(),
    client_email: clientEmail.trim().toLowerCase(),
    shipping_address: {
      street: shipping.street.trim(),
      zip: shipping.zip.trim(),
      city: shipping.city.trim(),
      country: shipping.country.trim(),
    },
    favorite_photo_ids: Array.isArray(favoritePhotoIds) ? favoritePhotoIds : [],
    extras,
    subtotal_cents: subtotal,
    discount_cents: discount,
    total_cents: total,
    payment_reference: paymentReference(orderId),
  })
  if (insertError) {
    console.error('[store] order insert failed:', insertError)
    return NextResponse.json({ error: 'Bestellung konnte nicht gespeichert werden.' }, { status: 500 })
  }

  if (coupon) {
    await supabase
      .from('store_coupons')
      .update({ used_count: coupon.used_count + 1 })
      .eq('id', coupon.id)
  }

  return NextResponse.json({
    orderId,
    paymentReference: paymentReference(orderId),
    totalCents: total,
    bank: {
      holder: photographer.bank_account_holder,
      bankName: photographer.bank_name,
      iban: photographer.bank_iban,
      bic: photographer.bank_bic,
    },
  }, { status: 201 })
}
