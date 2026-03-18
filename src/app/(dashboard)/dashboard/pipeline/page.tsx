import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, title, status, shoot_date, shooting_type,
      client:clients(full_name)
    `)
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  return <PipelineClient projects={projects ?? []} />
}
