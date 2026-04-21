import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()

  // Delete messages first (guard against missing cascade)
  await service.from('messages').delete().eq('conversation_id', id)

  // Delete conversation — eq photographer_id ensures ownership
  const { error } = await service
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) {
    console.error('[inbox/delete]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
