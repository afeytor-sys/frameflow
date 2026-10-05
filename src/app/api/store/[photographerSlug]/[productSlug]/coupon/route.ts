import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { applyDiscount, checkCouponUsable, findCoupon } from '@/lib/store'

// Public: preview a coupon against a variant without creating an order.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ photographerSlug: string; productSlug: string }> }
) {
  const { photographerSlug, productSlug } = await params
  const body = await req.json().catch(() => null)
  const { variantId, couponCode } = (body ?? {}) as { variantId?: string; couponCode?: string }

  if (!variantId || !couponCode?.trim()) {
    return NextResponse.json({ error: 'Bitte einen Gutscheincode eingeben.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id')
    .eq('slug', photographerSlug)
    .maybeSingle()
  if (!photographer) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: product } = await supabase
    .from('store_products')
    .select('id, active')
    .eq('photographer_id', photographer.id)
    .eq('slug', productSlug)
    .maybeSingle()
  if (!product || !product.active) return NextResponse.json({ error: 'Nicht verfügbar' }, { status: 404 })

  const { data: variant } = await supabase
    .from('store_product_variants')
    .select('price_cents')
    .eq('id', variantId)
    .eq('product_id', product.id)
    .maybeSingle()
  if (!variant) return NextResponse.json({ error: 'Bitte eine gültige Variante wählen.' }, { status: 400 })

  const coupon = await findCoupon(supabase, photographer.id, couponCode)
  if (!coupon) return NextResponse.json({ error: 'Gutschein nicht gefunden.' }, { status: 400 })

  const problem = checkCouponUsable(coupon)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const discountCents = applyDiscount(variant.price_cents, coupon)
  return NextResponse.json({
    code: coupon.code,
    subtotalCents: variant.price_cents,
    discountCents,
    totalCents: variant.price_cents - discountCents,
  })
}
