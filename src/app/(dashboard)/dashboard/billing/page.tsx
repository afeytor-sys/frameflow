import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('plan, stripe_customer_id, stripe_sub_id, full_name, email')
    .eq('id', user.id)
    .single()

  return (
    <BillingClient
      plan={(photographer?.plan as 'free' | 'starter' | 'pro' | 'studio') || 'free'}
      hasStripeCustomer={!!photographer?.stripe_customer_id}
    />
  )
}
