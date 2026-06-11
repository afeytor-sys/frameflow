/**
 * POST /api/galleries/revalidate
 *
 * Called by GalleryTab after every settings save to purge the ISR cache
 * for the corresponding public gallery URL immediately, instead of waiting
 * for the 60-second revalidation window.
 *
 * Body: { clientToken?: string | null, customSlug?: string | null }
 */
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { clientToken, customSlug } = await req.json()

    // Invalidate both the token-based and slug-based public gallery URLs
    if (clientToken) revalidatePath(`/gallery/${clientToken}`)
    if (customSlug)  revalidatePath(`/gallery/${customSlug}`)

    return NextResponse.json({ ok: true, revalidated: [clientToken, customSlug].filter(Boolean) })
  } catch (err) {
    console.error('[gallery/revalidate]', err)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
