import { createClient } from '@/lib/supabase/server'
import { getServerLocale } from '@/lib/dashboardTranslations'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, projects(shoot_date, project_type, shooting_type, custom_type_label, status, created_at)')
    .eq('photographer_id', user!.id)
    .order('created_at', { ascending: false })

  const locale = await getServerLocale()

  return <ClientsClient clients={(clients ?? []) as Parameters<typeof ClientsClient>[0]['clients']} de={locale === 'de'} />
}
