import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

// Smallest valid 1×1 transparent GIF (35 bytes)
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

// GET /track/open/[trackingId]
// Public — called by the tracking pixel embedded in sent emails.
// Records the first open time and increments open_count, then returns a 1×1 transparent GIF.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> },
) {
  const { trackingId } = await params

  // Fire-and-forget — don't let a DB error break the pixel response
  try {
    const supabase = createServiceClient()
    await supabase.rpc('track_email_open', { email_id: trackingId })
  } catch {
    // non-critical — pixel must always return 200
  }

  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      // Prevent any caching so every open is recorded
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
