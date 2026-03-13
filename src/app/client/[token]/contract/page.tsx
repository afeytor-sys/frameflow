import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import ContractSigningClient from '@/components/client-portal/ContractSigningClient'

export default async function ClientContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  // Get the most recent non-draft contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('project_id', project.id)
    .in('status', ['sent', 'viewed', 'signed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!contract) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6B6B6B]">Kein Vertrag verfügbar.</p>
      </div>
    )
  }

  // Mark as viewed if it was sent
  if (contract.status === 'sent') {
    await supabase
      .from('contracts')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', contract.id)
  }

  const client = project.client as { full_name: string; email?: string }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
    <ContractSigningClient
      contract={{ ...contract, status: contract.status === 'sent' ? 'viewed' : contract.status }}
      clientName={client.full_name}
      token={token}
    />
    </div>
  )
}
