import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { contractId } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: 'contractId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch contract with project and client info
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        project:projects!inner(
          id,
          title,
          client_url,
          photographer_id,
          client:clients(full_name, email)
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Verify ownership
    const project = contract.project as {
      id: string
      title: string
      client_url: string
      photographer_id: string
      client: { full_name: string; email: string }
    }

    if (project.photographer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientEmail = project.client?.email
    const clientName = project.client?.full_name

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
    }

    // Update contract status to 'sent'
    await supabase
      .from('contracts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', contractId)

    // Create in-app notification
    await supabase.from('notifications').insert({
      photographer_id: user.id,
      type: 'contract_sent',
      title_de: `Vertrag gesendet: ${clientName}`,
      title_en: `Contract sent: ${clientName}`,
      body_de: `Vertrag für ${project.title} wurde an ${clientEmail} gesendet.`,
      body_en: `Contract for ${project.title} was sent to ${clientEmail}.`,
      project_id: project.id,
      client_name: clientName,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
