import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/invoices/next-number
 *
 * Returns a read-only preview of what the next invoice number will be.
 * Does NOT increment the counter — safe to call on form open.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.rpc('peek_next_invoice_number', {
    p_photographer_id: user.id,
  })

  if (error) {
    console.error('[next-number] peek error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ number: data as string })
}
