import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import ContractSigningClient from '@/components/client-portal/ContractSigningClient'

export default async function ClientContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both custom slugs (e.g. "elisa") and raw client_token UUIDs
  let { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('*, client:clients(full_name, email)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  if (!project) notFound()

  // Get the most recent contract (including draft so client can sign even before photographer sends)
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('project_id', project.id)
    .in('status', ['draft', 'sent', 'viewed', 'signed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!contract) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6B6B6B]">No contract available.</p>
      </div>
    )
  }

  // Mark as viewed if it was sent or draft (first time client opens it)
  if (contract.status === 'sent' || contract.status === 'draft') {
    await supabase
      .from('contracts')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', contract.id)
  }

  const client = project.client as { full_name: string; email?: string }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
    <ContractSigningClient
      contract={{ ...contract, status: (contract.status === 'sent' || contract.status === 'draft') ? 'viewed' : contract.status }}
      clientName={client.full_name}
      token={token}
      savedClientFields={(contract.client_fields as Record<string, string> | null) ?? null}
    />
    </div>
  )
}
