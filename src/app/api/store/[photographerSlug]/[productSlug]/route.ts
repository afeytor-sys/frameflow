import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Public: product details, variants and the photos the client can pick as favorites.
// Private photos are never returned.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photographerSlug: string; productSlug: string }> }
) {
  const { photographerSlug, productSlug } = await params
  const supabase = createServiceClient()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, studio_name, full_name')
    .eq('slug', photographerSlug)
    .maybeSingle()
  if (!photographer) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: product } = await supabase
    .from('store_products')
    .select('id, title, description, cover_url, gallery_id, active')
    .eq('photographer_id', photographer.id)
    .eq('slug', productSlug)
    .maybeSingle()
  if (!product || !product.active) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: variants } = await supabase
    .from('store_product_variants')
    .select('id, label, price_cents, sort_order')
    .eq('product_id', product.id)
    .order('sort_order', { ascending: true })

  let photos: { id: string; thumbnail_url: string | null; storage_url: string; filename: string }[] = []
  if (product.gallery_id) {
    const { data } = await supabase
      .from('photos')
      .select('id, thumbnail_url, storage_url, filename')
      .eq('gallery_id', product.gallery_id)
      .eq('is_private', false)
      .order('display_order', { ascending: true })
      .limit(1000)
    photos = data ?? []
  }

  return NextResponse.json({
    studioName: photographer.studio_name || photographer.full_name,
    product: { id: product.id, title: product.title, description: product.description, coverUrl: product.cover_url },
    variants: variants ?? [],
    photos,
  })
}
