import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (!photographer || !['pro', 'studio'].includes(photographer.plan || '')) {
    redirect('/dashboard/billing')
  }

  // Fetch all data in parallel
  const [
    { data: invoices },
    { data: clients },
    { data: projects },
    { data: contracts },
    { data: galleries },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount, status, created_at')
      .eq('photographer_id', user.id),
    supabase
      .from('clients')
      .select('created_at, status')
      .eq('photographer_id', user.id),
    supabase
      .from('projects')
      .select('created_at, status, project_type')
      .eq('photographer_id', user.id),
    supabase
      .from('contracts')
      .select('status, created_at, project_id')
      .in('project_id',
        (await supabase.from('projects').select('id').eq('photographer_id', user.id)).data?.map(p => p.id) ?? []
      ),
    supabase
      .from('galleries')
      .select('status, created_at, project_id')
      .in('project_id',
        (await supabase.from('projects').select('id').eq('photographer_id', user.id)).data?.map(p => p.id) ?? []
      ),
  ])

  return (
    <div>
      <AnalyticsClient
        invoices={invoices ?? []}
        clients={clients ?? []}
        projects={projects ?? []}
        contracts={contracts ?? []}
        galleries={galleries ?? []}
      />
    </div>
  )
}
