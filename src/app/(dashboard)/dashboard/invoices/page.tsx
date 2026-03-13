import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvoicesClient from './InvoicesClient'

export const metadata = { title: 'Rechnungen' }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, plan')
    .eq('id', user.id)
    .single()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, project:projects(title, client:clients(full_name, email))')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, client:clients(full_name)')
    .eq('photographer_id', user.id)
    .eq('status', 'active')

  return (
    <InvoicesClient
      invoices={invoices || []}
      projects={projects || []}
      photographerId={user.id}
    />
  )
}
