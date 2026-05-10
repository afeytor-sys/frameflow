import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service
    .from('photographer_service_presets')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
