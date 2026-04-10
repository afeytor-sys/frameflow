import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotesClient from './QuotesClient'

export const metadata = { title: 'Angebote' }

export default async function QuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: photographer }, { data: quotes }, { data: projects }, { data: templates }] = await Promise.all([
    supabase
      .from('photographers')
      .select('id, plan, full_name, studio_name, email, tax_status, tax_rate, logo_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('quotes')
      .select(`
        *,
        sections:quote_sections(
          *,
          items:quote_items(*)
        ),
        project:projects(id, title, client:clients(full_name, email)),
        responses:quote_responses(id, submitted_at, total_amount, subtotal, tax_amount, selections, client_name, client_email, converted_invoice_id)
      `)
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title, client:clients(full_name, email, address_street, address_zip, address_city, address_country, company_name)')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('quote_templates')
      .select(`
        *,
        sections:quote_template_sections(
          *,
          items:quote_template_items(*)
        )
      `)
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <QuotesClient
      quotes={quotes || []}
      projects={projects || []}
      photographerId={user.id}
      photographer={photographer}
      templates={templates || []}
    />
  )
}
