import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FormsClient from './FormsClient'

export const metadata = { title: 'Formulare — Fotonizer' }

export default async function FormsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: forms } = await supabase
    .from('forms')
    .select('id, photographer_id, name, fields, created_at')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'

  return <FormsClient forms={forms ?? []} appUrl={appUrl} />
}
