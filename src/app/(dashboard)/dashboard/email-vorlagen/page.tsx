import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmailVorlagenClient from './EmailVorlagenClient'

export const metadata = { title: 'E-Mail Vorlagen – Fotonizer' }

export default async function EmailVorlagenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userTemplates } = await supabase
    .from('email_templates')
    .select('id, name, description, category, subject, body, created_at')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  return <EmailVorlagenClient userTemplates={userTemplates || []} />
}
