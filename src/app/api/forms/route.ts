import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/forms — create a new form for the logged-in photographer
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Form name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('forms')
      .insert({
        photographer_id: user.id,
        name: name.trim(),
        fields: [],
      })
      .select('id, photographer_id, name, fields, created_at')
      .single()

    if (error || !data) {
      console.error('[api/forms POST]', error)
      return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[api/forms POST] unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET /api/forms — list all forms for the logged-in photographer
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('forms')
      .select('id, photographer_id, name, fields, created_at')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[api/forms GET]', error)
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[api/forms GET] unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
