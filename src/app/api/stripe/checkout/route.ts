import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICES, type PlanKey } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { plan, billing } = await request.json() as { plan: PlanKey; billing: 'monthly' | 'annual' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create Stripe customer
    const { data: photographer } = await supabase
      .from('photographers')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (!photographer) {
      return NextResponse.json({ error: 'Photographer not found' }, { status: 404 })
    }

    let customerId = photographer.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: photographer.email || user.email,
        name: photographer.full_name || undefined,
        metadata: { photographer_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('photographers')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Resolve price ID
    const priceKey = `${plan}_${billing}` as keyof typeof STRIPE_PRICES
    const priceId = STRIPE_PRICES[priceKey]

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or billing period' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=1`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=1`,
      metadata: {
        photographer_id: user.id,
        plan,
        billing,
      },
      subscription_data: {
        metadata: {
          photographer_id: user.id,
          plan,
        },
        // Apply launch promo coupon automatically (50% off first 2 months)
        ...(process.env.STRIPE_PROMO_COUPON_ID
          ? { coupon: process.env.STRIPE_PROMO_COUPON_ID }
          : {}),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Stripe checkout error:', message)
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
  }
}
