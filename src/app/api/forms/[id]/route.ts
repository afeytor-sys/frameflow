import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FormField } from '@/lib/forms'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PUT /api/forms/[id] — update form fields (owner only)
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ownership check
    const { data: form, error: fetchError } = await supabase
      .from('forms')
      .select('id, photographer_id')
      .eq('id', id)
      .single()

    if (fetchError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.photographer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse body
    const body = await req.json()
    const { fields } = body

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields must be an array' }, { status: 400 })
    }

    // Ensure core fields (name + email) are always present
    const hasName = fields.some((f: FormField) => f.id === 'name')
    const hasEmail = fields.some((f: FormField) => f.id === 'email')

    if (!hasName || !hasEmail) {
      return NextResponse.json(
        { error: 'Core fields (name, email) cannot be removed' },
        { status: 400 }
      )
    }

    // Update
    const { data: updated, error: updateError } = await supabase
      .from('forms')
      .update({ fields })
      .eq('id', id)
      .select('id, photographer_id, name, fields, created_at')
      .single()

    if (updateError || !updated) {
      console.error('[api/forms/[id] PUT]', updateError)
      return NextResponse.json({ error: 'Failed to update form' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[api/forms/[id] PUT] unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
