import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/bookings/[id]/complete  (authenticated — photographer only)
// Marks a booking as completed and optionally generates a final invoice.
// Body: { skip_invoice?: boolean }
// If deposit was paid, a negative line item deducts it automatically.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const serviceSupabase = createServiceClient()

  const [bookingResult, settingsResult] = await Promise.all([
    serviceSupabase
      .from('bookings')
      .select('*, booking_types(title, price, currency)')
      .eq('id', id)
      .eq('photographer_id', user.id)
      .maybeSingle(),
    serviceSupabase
      .from('automation_settings')
      .select('auto_invoice_on_complete')
      .eq('photographer_id', user.id)
      .maybeSingle(),
  ])

  const booking = bookingResult.data
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['confirmed', 'deposit_received'].includes(booking.status)) {
    return NextResponse.json({ error: 'Booking must be confirmed before completing' }, { status: 400 })
  }

  // Determine whether to generate invoice
  const autoInvoice = settingsResult.data?.auto_invoice_on_complete !== false
  const createInvoice = autoInvoice && !body.skip_invoice

  let invoiceId: string | null = null

  if (createInvoice) {
    // Fetch photographer for invoice snapshot
    const { data: photographer } = await serviceSupabase
      .from('photographers')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!photographer) return NextResponse.json({ error: 'Photographer not found' }, { status: 500 })

    const bt = booking.booking_types as { title: string; price: number; currency: string }
    const totalPrice = bt?.price ?? 0
    const depositAmount = booking.deposit_amount ?? 0
    const finalAmount = Math.max(0, totalPrice - depositAmount)

    const { data: invoiceNumData, error: numErr } = await serviceSupabase
      .rpc('generate_next_invoice_number', { p_photographer_id: user.id })
    if (numErr) return NextResponse.json({ error: 'Could not generate invoice number' }, { status: 500 })
    const invoiceNumber = invoiceNumData as string

    const taxStatus = photographer.tax_status || 'kleinunternehmer'
    const taxRate = taxStatus === 'vat_19' ? 19 : taxStatus === 'vat_7' ? 7 : 0
    const subtotal = taxRate > 0 ? Math.round(finalAmount / (1 + taxRate / 100)) : finalAmount
    const taxAmount = finalAmount - subtotal

    const photographerSnapshot = {
      full_name: photographer.full_name, company_name: photographer.company_name,
      email: photographer.email, address_street: photographer.address_street,
      address_zip: photographer.address_zip, address_city: photographer.address_city,
      address_country: photographer.address_country, phone: photographer.phone,
      website: photographer.website, tax_number: photographer.tax_number,
      bank_account_holder: photographer.bank_account_holder, bank_name: photographer.bank_name,
      bank_iban: photographer.bank_iban, bank_bic: photographer.bank_bic,
    }

    const { data: invoice, error: invErr } = await serviceSupabase
      .from('invoices')
      .insert({
        photographer_id: user.id,
        invoice_number: invoiceNumber,
        amount: finalAmount,
        currency: bt?.currency ?? 'EUR',
        status: 'draft',
        description: bt?.title ?? 'Buchung',
        tax_status: taxStatus,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        photographer_snapshot: photographerSnapshot,
        client_snapshot: { full_name: booking.client_name, email: booking.client_email, phone: booking.client_phone },
      })
      .select()
      .single()

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

    const items: Array<{ invoice_id: string; position: number; description: string; quantity: number; unit_price: number; total: number }> = [
      { invoice_id: invoice.id, position: 1, description: bt?.title ?? 'Leistung', quantity: 1, unit_price: totalPrice, total: totalPrice },
    ]
    if (depositAmount > 0) {
      items.push({
        invoice_id: invoice.id, position: 2,
        description: `Anzahlung bereits bezahlt (${booking.payment_reference ?? ''})`,
        quantity: 1, unit_price: -depositAmount, total: -depositAmount,
      })
    }

    await serviceSupabase.from('invoice_items').insert(items)
    invoiceId = invoice.id
  }

  // Mark booking as completed
  await serviceSupabase
    .from('bookings')
    .update({ status: 'completed', ...(invoiceId ? { invoice_id: invoiceId } : {}) })
    .eq('id', id)

  return NextResponse.json({ ok: true, invoiceId })
}
