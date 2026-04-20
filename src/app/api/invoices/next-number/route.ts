import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

/**
 * GET /api/invoices/next-number
 *
 * Returns the next available invoice number for the current photographer.
 * Falls back to scanning the actual invoices table when the stored counter
 * is stale (e.g. after invoices were created via other code paths).
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Fetch photographer for prefix config
  const { data: photographer } = await service
    .from('photographers')
    .select('invoice_prefix, invoice_start_number, last_invoice_number')
    .eq('id', user.id)
    .single()

  const prefix = photographer?.invoice_prefix ?? ''
  const startNumber = photographer?.invoice_start_number ?? 1
  const counterNext = (photographer?.last_invoice_number ?? startNumber - 1) + 1

  // Also scan actual invoices to find the real max (handles stale counter)
  const { data: existingInvoices } = await service
    .from('invoices')
    .select('invoice_number')
    .eq('photographer_id', user.id)

  const existingNums = new Set<number>()
  let maxFromDb = 0
  for (const inv of existingInvoices ?? []) {
    const numStr = inv.invoice_number?.slice(prefix.length)
    const n = parseInt(numStr ?? '', 10)
    if (!isNaN(n)) {
      existingNums.add(n)
      if (n > maxFromDb) maxFromDb = n
    }
  }

  // Start from the higher of counter or actual max, then skip any that already exist
  let next = Math.max(counterNext, maxFromDb + 1)
  while (existingNums.has(next)) next++

  const number = prefix + String(next).padStart(3, '0')

  return NextResponse.json({ number })
}
