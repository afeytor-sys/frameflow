import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import type Stripe from 'stripe'

const resend = new Resend(process.env.RESEND_API_KEY)

// Map Stripe price IDs to plan names
function planFromPriceId(priceId: string): string {
  const prices: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'starter',
    [process.env.STRIPE_PRICE_STARTER_ANNUAL || '']: 'starter',
    [process.env.STRIPE_PRICE_PRO_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL || '']: 'pro',
    [process.env.STRIPE_PRICE_STUDIO_MONTHLY || '']: 'studio',
    [process.env.STRIPE_PRICE_STUDIO_ANNUAL || '']: 'studio',
  }
  return prices[priceId] || 'free'
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const plan = planFromPriceId(priceId)
        const status = subscription.status

        // Only update to paid plan if subscription is active
        const effectivePlan = status === 'active' || status === 'trialing' ? plan : 'free'

        await supabase
          .from('photographers')
          .update({
            plan: effectivePlan,
            stripe_sub_id: subscription.id,
          })
          .eq('stripe_customer_id', customerId)

        console.log(`Subscription ${event.type}: customer ${customerId} → plan ${effectivePlan}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('photographers')
          .update({
            plan: 'free',
            stripe_sub_id: null,
          })
          .eq('stripe_customer_id', customerId)

        // Notify photographer
        const { data: photographer } = await supabase
          .from('photographers')
          .select('email, full_name')
          .eq('stripe_customer_id', customerId)
          .single()

        if (photographer?.email) {
          await resend.emails.send({
            from: 'Studioflow <noreply@studioflow.app>',
            to: photographer.email,
            subject: 'Dein Studioflow-Abo wurde beendet',
            html: `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
  <h2 style="color:#1A1A1A;margin:0 0 16px;">Abo beendet</h2>
  <p style="color:#6B6B6B;margin:0 0 16px;">
    Hallo ${photographer.full_name || 'Fotograf'},<br><br>
    dein Studioflow-Abo wurde beendet. Du wurdest auf den kostenlosen Plan zurückgesetzt.
  </p>
  <p style="color:#6B6B6B;margin:0 0 24px;">
    Du kannst jederzeit wieder upgraden, um alle Funktionen zu nutzen.
  </p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" 
     style="display:inline-block;background:#1A1A1A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
    Wieder upgraden
  </a>
</div>
            `,
          }).catch(console.error)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: photographer } = await supabase
          .from('photographers')
          .select('email, full_name')
          .eq('stripe_customer_id', customerId)
          .single()

        if (photographer?.email) {
          await resend.emails.send({
            from: 'Studioflow <noreply@studioflow.app>',
            to: photographer.email,
            subject: '⚠️ Zahlung fehlgeschlagen – Bitte aktualisiere deine Zahlungsmethode',
            html: `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
  <h2 style="color:#E84C1A;margin:0 0 16px;">Zahlung fehlgeschlagen ⚠️</h2>
  <p style="color:#6B6B6B;margin:0 0 16px;">
    Hallo ${photographer.full_name || 'Fotograf'},<br><br>
    die Zahlung für dein Studioflow-Abo ist fehlgeschlagen. 
    Bitte aktualisiere deine Zahlungsmethode, um eine Unterbrechung zu vermeiden.
  </p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" 
     style="display:inline-block;background:#E84C1A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
    Zahlungsmethode aktualisieren
  </a>
</div>
            `,
          }).catch(console.error)
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const photographerId = session.metadata?.photographer_id
        const plan = session.metadata?.plan

        if (photographerId && plan && session.subscription) {
          await supabase
            .from('photographers')
            .update({
              plan,
              stripe_sub_id: session.subscription as string,
            })
            .eq('id', photographerId)

          // Send upgrade confirmation
          const { data: photographer } = await supabase
            .from('photographers')
            .select('email, full_name')
            .eq('id', photographerId)
            .single()

          if (photographer?.email) {
            await resend.emails.send({
              from: 'Studioflow <noreply@studioflow.app>',
              to: photographer.email,
              subject: `🎉 Willkommen beim ${plan.charAt(0).toUpperCase() + plan.slice(1)}-Plan!`,
              html: `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
  <h2 style="color:#1A1A1A;margin:0 0 16px;">Upgrade erfolgreich 🎉</h2>
  <p style="color:#6B6B6B;margin:0 0 16px;">
    Hallo ${photographer.full_name || 'Fotograf'},<br><br>
    dein Upgrade auf den <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}-Plan</strong> war erfolgreich!
    Alle neuen Funktionen sind sofort verfügbar.
  </p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
     style="display:inline-block;background:#1A1A1A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
    Zum Dashboard
  </a>
</div>
              `,
            }).catch(console.error)
          }
        }
        break
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`)
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
