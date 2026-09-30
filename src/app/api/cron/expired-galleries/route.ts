import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deleteGalleryWithStorage } from '@/lib/deleteGallery'

// Called daily by Vercel Cron: permanently deletes galleries whose
// expires_at passed more than 14 days ago — unless the photographer has
// since pushed expires_at forward (or cleared it), which simply takes the
// gallery out of this query on the next run. Also protected by CRON_SECRET.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - 14)

  const { data: galleries } = await supabase
    .from('galleries')
    .select('id, title, photographer_id')
    .lt('expires_at', cutoff.toISOString())

  let deleted = 0
  const errors: string[] = []

  for (const gallery of (galleries ?? [])) {
    try {
      await deleteGalleryWithStorage(gallery.id, supabase)

      await supabase.from('notifications').insert({
        photographer_id: gallery.photographer_id,
        type: 'gallery_auto_deleted',
        title_de: `Galerie automatisch gelöscht: ${gallery.title}`,
        title_en: `Gallery auto-deleted: ${gallery.title}`,
        body_de: `"${gallery.title}" war seit über 2 Wochen abgelaufen und wurde automatisch endgültig gelöscht.`,
        body_en: `"${gallery.title}" had been expired for over 2 weeks and was automatically deleted for good.`,
      })

      deleted++
    } catch (e) {
      errors.push(`gallery ${gallery.id}: ${e}`)
    }
  }

  return NextResponse.json({ success: true, deleted, errors: errors.length > 0 ? errors : undefined })
}
