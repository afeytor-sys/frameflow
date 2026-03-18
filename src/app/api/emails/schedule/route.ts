import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    projectId,
    toEmail,
    toName,
    subject,
    htmlBody,
    plainBody,
    type = 'custom',
    referenceId,
    scheduledAt,
  } = body

  if (!toEmail || !subject || !htmlBody || !scheduledAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const scheduledDate = new Date(scheduledAt)
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: 'Scheduled date must be in the future' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('scheduled_emails')
    .insert({
      photographer_id: user.id,
      project_id: projectId || null,
      to_email: toEmail,
      to_name: toName || null,
      subject,
      html_body: htmlBody,
      plain_body: plainBody || null,
      type,
      reference_id: referenceId || null,
      scheduled_at: scheduledAt,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error scheduling email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, scheduledEmail: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('scheduled_emails')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('photographer_id', user.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
