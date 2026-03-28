import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InboxClient from './InboxClient'

export const metadata = { title: 'Inbox — Fotonizer' }

export default async function InboxPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch photographer email for reply-to
  const { data: photographer } = await supabase
    .from('photographers')
    .select('email')
    .eq('id', user.id)
    .single()

  // Fetch all conversations for this photographer, with their messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, photographer_id, lead_name, lead_email, created_at, messages(id, sender, content, created_at)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <InboxClient
      conversations={conversations ?? []}
      photographerEmail={photographer?.email ?? null}
    />
  )
}
