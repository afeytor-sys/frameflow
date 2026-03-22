/**
 * Fixes thumbnail_url in DB: removes cdn-cgi/image/... prefix so both
 * storage_url and thumbnail_url point to the plain photos.fotonizer.com URL.
 *
 * Cloudflare Image Resizing (cdn-cgi/image) requires a Pro plan.
 * Until then, we serve the original file directly from the custom domain.
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  // Count photos with cdn-cgi thumbnail URLs
  const { count: cdnCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .ilike('thumbnail_url', '%cdn-cgi%')

  console.log('Photos with cdn-cgi thumbnail_url: ' + (cdnCount ?? 0))

  if (!cdnCount || cdnCount === 0) {
    console.log('Nothing to fix!')
    return
  }

  // Fetch them
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url')
    .ilike('thumbnail_url', '%cdn-cgi%')

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }

  console.log('Fixing ' + photos.length + ' photos...')

  let updated = 0
  let failed = 0

  for (const photo of photos) {
    // thumbnail_url = storage_url (plain URL, no cdn-cgi transform)
    const { error: updateError } = await supabase
      .from('photos')
      .update({ thumbnail_url: photo.storage_url })
      .eq('id', photo.id)

    if (updateError) {
      console.error('  FAILED ' + photo.id + ': ' + updateError.message)
      failed++
    } else {
      updated++
    }
  }

  console.log()
  console.log('Done! Updated: ' + updated + ' | Failed: ' + failed)

  // Verify
  const { count: remaining } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .ilike('thumbnail_url', '%cdn-cgi%')

  console.log('Remaining cdn-cgi thumbnails: ' + (remaining ?? 0) + ' (target: 0)')
}

run().catch(e => { console.error(e); process.exit(1) })
