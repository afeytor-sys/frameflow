import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { client_name, client_email, selected_extras } = body

  const service = createServiceClient()

  const { data: offer } = await service
    .from('offers')
    .select('id, status, photographer_id')
    .eq('id', id)
    .in('status', ['sent', 'viewed'])
    .single()

  if (!offer) return NextResponse.json({ error: 'Offer not available' }, { status: 404 })

  const { error } = await service
    .from('offers')
    .update({
      status: 'accepted',
      notes: offer.status, // keep for audit if needed
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // TODO Phase 2: create inbox message, trigger contract, schedule follow-up

  return NextResponse.json({
    ok: true,
    client_name: client_name || null,
    client_email: client_email || null,
    selected_extras: selected_extras || [],
  })
}
