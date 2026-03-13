import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

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
      .select('full_name, studio_name, email')
      .eq('id', user.id)
      .single()

    const studioName = photographer?.studio_name || photographer?.full_name || 'Dein Fotograf'
    const portalUrl = `${project.client_url}/contract`

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: `${studioName} via FrameFlow <noreply@frameflow.app>`,
      to: clientEmail,
      subject: `Dein Vertrag ist bereit, ${clientName} ✍️`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'DM Sans',system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border-radius:16px;border:1px solid #E8E8E4;overflow:hidden;">
    
    <!-- Header -->
    <div style="background:#0F0F0F;padding:24px 32px;">
      <p style="margin:0;color:#C8A882;font-size:18px;font-weight:600;">${studioName}</p>
    </div>
    
    <!-- Body -->
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#1A1A1A;">
        Hallo ${clientName} 👋
      </h1>
      <p style="margin:0 0 24px;color:#6B6B6B;font-size:15px;line-height:1.6;">
        Dein Fotografievertrag für <strong style="color:#1A1A1A;">${project.title}</strong> ist bereit zur Unterschrift.
      </p>
      
      <p style="margin:0 0 24px;color:#6B6B6B;font-size:15px;line-height:1.6;">
        Bitte lies den Vertrag sorgfältig durch und unterzeichne ihn digital. Das dauert nur wenige Minuten.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${portalUrl}" 
           style="display:inline-block;background:#1A1A1A;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
          Vertrag ansehen & unterschreiben
        </a>
      </div>
      
      <p style="margin:0 0 8px;color:#6B6B6B;font-size:13px;">
        Oder kopiere diesen Link in deinen Browser:
      </p>
      <p style="margin:0;color:#C8A882;font-size:12px;word-break:break-all;">
        ${portalUrl}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #F0F0EC;background:#FAFAF8;">
      <p style="margin:0;color:#6B6B6B;font-size:12px;">
        Diese E-Mail wurde von ${studioName} über FrameFlow gesendet.
        Wenn du Fragen hast, antworte direkt auf diese E-Mail.
      </p>
    </div>
  </div>
</body>
</html>
      `,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
