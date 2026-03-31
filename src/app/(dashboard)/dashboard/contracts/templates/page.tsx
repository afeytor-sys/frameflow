import { createClient } from '@/lib/supabase/server'
import TemplatesClient from './TemplatesClient'

export default async function ContractTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: userTemplatesRaw, error: tplError },
    { data: projects },
  ] = await Promise.all([
    supabase
      .from('contract_templates')
      .select('id, name, description, content')
      .eq('photographer_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title, client_id, clients(full_name)')
      .eq('photographer_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const userTemplates = tplError ? [] : userTemplatesRaw

  const normalizedProjects = (projects ?? []).map((p) => ({
    ...p,
    clients: Array.isArray(p.clients) ? (p.clients[0] ?? null) : p.clients,
  }))

  return (
    <div>
      <TemplatesClient
        userTemplates={userTemplates ?? []}
        projects={normalizedProjects}
      />
    </div>
  )
}
