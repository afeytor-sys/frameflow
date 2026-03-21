import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { contractSentEmail } from '@/lib/automationEmails'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Fetch photographer info
    const { data: photographer } = await supabase
      .from('photographers')
      .select('full_name, studio_name, email, language, notification_email')
      .eq('id', user.id)
      .single()

    const notifEmail = photographer?.notification_email || photographer?.email || undefined

    const studioName = photographer?.studio_name || photographer?.full_name || 'Your photographer'
    const portalUrl = project.client_url

    // Fetch project locale
    const { data: projectData } = await supabase
      .from('projects')
      .select('portal_locale')
      .eq('id', project.id)
      .single()
    const locale = (projectData?.portal_locale || photographer?.language || 'de') as 'de' | 'en'

    // Check automation settings
    const { data: autoSettings } = await supabase
      .from('automation_settings')
      .select('email_contract_sent')
      .eq('photographer_id', user.id)
      .single()

    const { subject, html } = contractSentEmail({
      studioName,
      clientName: clientName || 'Kunde',
      projectTitle: project.title,
      portalUrl,
      locale,
    })

    const { error: emailError } = await resend.emails.send({
      from: `${studioName} via Fotonizer <noreply@fotonizer.com>`,
      replyTo: notifEmail,
      bcc: notifEmail,
      to: clientEmail,
      subject,
      html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
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
