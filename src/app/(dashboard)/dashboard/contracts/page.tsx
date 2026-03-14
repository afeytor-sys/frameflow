import { createClient } from '@/lib/supabase/server'
import ContractsClient from './ContractsClient'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: projects },
    { data: userTemplates },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, client_id, clients(full_name)')
      .eq('photographer_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_templates')
      .select('id, name, description, content')
      .eq('photographer_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const projectIds = projects?.map((p) => p.id) ?? []

  const { data: contracts } = projectIds.length > 0
    ? await supabase
        .from('contracts')
        .select('id, project_id, title, status, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Normalize clients shape (Supabase may return array or object)
  const normalizedProjects = (projects ?? []).map((p) => ({
    ...p,
    clients: Array.isArray(p.clients) ? (p.clients[0] ?? null) : p.clients,
  }))

  return (
    <div className="p-6">
      <ContractsClient
        contracts={contracts ?? []}
        projects={normalizedProjects}
        userTemplates={userTemplates ?? []}
      />
    </div>
  )
}
