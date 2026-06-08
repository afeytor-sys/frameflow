import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

interface LineItemInput {
  position: number
  description: string
  quantity: number
  unit_price: number  // euros
  total: number       // euros
}

interface CreateInvoiceBody {
  project_id: string | null
  description: string | null
  notes: string | null
  /**
   * Pass the invoice number the user typed, or null / '' to
   * auto-generate the next sequential number atomically.
   */
  invoice_number: string | null
  verwendungszweck: string | null
  due_date: string | null
  items: LineItemInput[]
}

/**
 * POST /api/invoices/create
 *
 * Creates an invoice with a concurrency-safe sequential invoice number.
 *
 * Concurrency guarantee:
 *  - If invoice_number is null/empty → calls generate_next_invoice_number()
 *    which uses SELECT FOR UPDATE on the photographers row, serialising
 *    concurrent requests so each gets a unique number.
 *  - The UNIQUE constraint on (photographer_id, invoice_number) is the
 *    final safety net — a duplicate would be rejected at DB level.
 *  - If invoice_number is provided → checks uniqueness before inserting.
 */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateInvoiceBody = await req.json()
  const { project_id, description, notes, verwendungszweck, due_date, items } = body

  const validItems = items.filter(it => it.description.trim())
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item required' }, { status: 400 })
  }

  // ── Service client for privileged reads + write ───────────────────────────
  const service = createServiceClient()

  // ── Fetch photographer (for tax settings + snapshot) ─────────────────────
  const { data: photographer } = await service
    .from('photographers')
    .select('id, full_name, studio_name, company_name, email, phone, website, tax_number, tax_status, address_street, address_zip, address_city, address_country, bank_account_holder, bank_name, bank_iban, bank_bic')
    .eq('id', user.id)
    .single()

  if (!photographer) {
    return NextResponse.json({ error: 'Photographer not found' }, { status: 404 })
  }

  // ── Verify project (optional) ─────────────────────────────────────────────
  interface ClientRow {
    full_name: string | null
    company_name: string | null
    email: string | null
    address_street: string | null
    address_zip: string | null
    address_city: string | null
    address_country: string | null
  }
  let clientRow: ClientRow | null = null

  if (project_id) {
    const { data: projectRow, error: projErr } = await service
      .from('projects')
      .select('id, photographer_id, client_id, title')
      .eq('id', project_id)
      .eq('photographer_id', user.id)
      .maybeSingle()

    if (projErr || !projectRow) {
      console.error('[create-invoice] project lookup:', projErr)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (projectRow.client_id) {
      const { data } = await service
        .from('clients')
        .select('full_name, company_name, email, address_street, address_zip, address_city, address_country')
        .eq('id', projectRow.client_id)
        .maybeSingle()
      clientRow = data as ClientRow | null
    }
  }

  // ── Compute amounts ───────────────────────────────────────────────────────
  const taxStatus: string = photographer.tax_status || 'kleinunternehmer'
  const taxRate = taxStatus === 'vat_19' ? 19 : taxStatus === 'vat_7' ? 7 : 0
  const subtotalCents = Math.round(validItems.reduce((s, it) => s + it.total, 0) * 100)
  const taxCents = taxStatus !== 'kleinunternehmer' ? Math.round(subtotalCents * taxRate / 100) : 0
  const amountCents = subtotalCents + taxCents

  // ── Resolve invoice number ────────────────────────────────────────────────
  let invoiceNumber: string

  const manualNumber = (body.invoice_number ?? '').trim()

  if (manualNumber) {
    // User typed a custom number — validate uniqueness
    const { data: conflict } = await service
      .from('invoices')
      .select('id')
      .eq('photographer_id', user.id)
      .eq('invoice_number', manualNumber)
      .maybeSingle()

    if (conflict) {
      return NextResponse.json(
        { error: `Invoice number "${manualNumber}" already exists` },
        { status: 409 }
      )
    }
    invoiceNumber = manualNumber
  } else {
    // Auto-generate: atomically increments last_invoice_number with FOR UPDATE
    const { data: generated, error: genError } = await service.rpc(
      'generate_next_invoice_number',
      { p_photographer_id: user.id }
    )
    if (genError || !generated) {
      console.error('[create-invoice] generate error:', genError)
      return NextResponse.json({ error: 'Could not generate invoice number' }, { status: 500 })
    }
    invoiceNumber = generated as string
  }

  // ── Build snapshots ───────────────────────────────────────────────────────
  const photographerSnapshot = {
    studio_name: photographer.studio_name ?? null,
    full_name: photographer.full_name ?? null,
    company_name: photographer.company_name ?? null,
    address_street: photographer.address_street ?? null,
    address_zip: photographer.address_zip ?? null,
    address_city: photographer.address_city ?? null,
    address_country: photographer.address_country ?? null,
    phone: photographer.phone ?? null,
    website: photographer.website ?? null,
    email: photographer.email ?? null,
    tax_number: photographer.tax_number ?? null,
    bank_account_holder: photographer.bank_account_holder ?? null,
    bank_name: photographer.bank_name ?? null,
    bank_iban: photographer.bank_iban ?? null,
    bank_bic: photographer.bank_bic ?? null,
  }

  const clientSnapshot = clientRow ? {
    full_name: clientRow.full_name ?? '',
    company_name: clientRow.company_name ?? null,
    email: clientRow.email ?? null,
    address_street: clientRow.address_street ?? null,
    address_zip: clientRow.address_zip ?? null,
    address_city: clientRow.address_city ?? null,
    address_country: clientRow.address_country ?? null,
  } : null

  // ── Insert invoice ────────────────────────────────────────────────────────
  const { data: invoice, error: insertError } = await service
    .from('invoices')
    .insert({
      project_id: project_id || null,
      photographer_id: user.id,
      amount: amountCents,
      subtotal: subtotalCents,
      tax_amount: taxCents,
      tax_rate: taxRate,
      tax_status: taxStatus,
      currency: 'eur',
      status: 'draft',
      description: description || null,
      due_date: due_date || null,
      invoice_number: invoiceNumber,
      notes: notes || null,
      verwendungszweck: (verwendungszweck ?? '').trim() || invoiceNumber,
      photographer_snapshot: photographerSnapshot,
      client_snapshot: clientSnapshot,
    })
    .select('*, project:projects(title, client:clients(full_name, email))')
    .single()

  if (insertError) {
    // UNIQUE violation — extremely unlikely with FOR UPDATE, but handle gracefully
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: `Invoice number "${invoiceNumber}" was just taken by a concurrent request. Please try again.` },
        { status: 409 }
      )
    }
    console.error('[create-invoice] insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // ── Insert line items ─────────────────────────────────────────────────────
  const itemsToInsert = validItems.map(it => ({
    invoice_id: invoice.id,
    position: it.position,
    description: it.description.trim(),
    quantity: it.quantity,
    unit_price: Math.round(it.unit_price * 100),
    total: Math.round(it.total * 100),
  }))

  const { data: insertedItems } = await service
    .from('invoice_items')
    .insert(itemsToInsert)
    .select()

  return NextResponse.json({ invoice: { ...invoice, items: insertedItems ?? itemsToInsert } })
}
