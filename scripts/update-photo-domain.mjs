/**
 * Updates all photo URLs in the DB from r2.dev → photos.fotonizer.com
 * storage_url  → https://photos.fotonizer.com/<path>
 * thumbnail_url → https://photos.fotonizer.com/cdn-cgi/image/width=600,quality=70,format=webp/<path>
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
  // Check current state
  const { count: r2Count } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .ilike('storage_url', '%r2.dev%')

  const { count: fotonizerCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .ilike('storage_url', '%photos.fotonizer.com%')

  console.log('Current state:')
  console.log('  r2.dev URLs:               ' + (r2Count ?? 0))
  console.log('  photos.fotonizer.com URLs: ' + (fotonizerCount ?? 0))
  console.log()

  if (!r2Count || r2Count === 0) {
    console.log('No r2.dev photos to update — already migrated!')
    return
  }

  // Fetch all photos with r2.dev URLs
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, storage_url, thumbnail_url')
    .ilike('storage_url', '%r2.dev%')

  if (error) {
    console.error('Fetch error:', error.message)
    process.exit(1)
  }

  console.log('Updating ' + photos.length + ' photos...')

  let updated = 0
  let failed = 0

  for (const photo of photos) {
    const pathMatch = photo.storage_url.match(/https?:\/\/[^/]+\/(.+)$/)
    if (!pathMatch) {
      console.warn('  Cannot extract path from: ' + photo.storage_url)
      failed++
      continue
    }

    const path = pathMatch[1]
    const newStorageUrl = 'https://photos.fotonizer.com/' + path
    const newThumbnailUrl = 'https://photos.fotonizer.com/cdn-cgi/image/width=600,quality=70,format=webp/' + path

    const { error: updateError } = await supabase
      .from('photos')
      .update({ storage_url: newStorageUrl, thumbnail_url: newThumbnailUrl })
      .eq('id', photo.id)

    if (updateError) {
      console.error('  FAILED ' + photo.id + ': ' + updateError.message)
      failed++
    } else {
      updated++
      if (updated % 10 === 0) console.log('  Updated ' + updated + '/' + photos.length + '...')
    }
  }

  console.log()
  console.log('Done! Updated: ' + updated + ' | Failed: ' + failed)

  // Verify final state
  const { count: finalR2 } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .ilike('storage_url', '%r2.dev%')

  const { count: finalFotonizer } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .ilike('storage_url', '%photos.fotonizer.com%')

  console.log()
  console.log('Final state:')
  console.log('  r2.dev URLs:               ' + (finalR2 ?? 0) + ' (target: 0)')
  console.log('  photos.fotonizer.com URLs: ' + (finalFotonizer ?? 0) + ' (target: 147)')

  if ((finalR2 ?? 0) === 0) {
    console.log()
    console.log('All photos now use photos.fotonizer.com!')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
