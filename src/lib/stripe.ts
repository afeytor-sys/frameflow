import Stripe from 'stripe'

// Lazy initialization — avoids crash when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || key === 'sk_test_placeholder') {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
    })
  }
  return _stripe
}

// Keep named export for backwards compatibility — lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

// Plan price IDs — set these in your .env.local after creating products in Stripe Dashboard
export const STRIPE_PRICES = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
  starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  studio_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY ?? '',
  studio_annual: process.env.STRIPE_PRICE_STUDIO_ANNUAL ?? '',
} as const

export type PlanKey = 'free' | 'starter' | 'pro' | 'studio'

export interface PlanLimits {
  maxClients: number | null           // null = unlimited
  maxContractsPerClient: number | null
  maxGalleries: number | null         // null = unlimited
  maxQuestionnaires: number | null    // null = unlimited
  maxInvoices: number | null          // null = unlimited
  showFotonizerBadge: boolean         // show "Powered by Fotonizer" in client portal
  customBranding: boolean             // hide "Powered by Fotonizer"
  teamSeats: number
  customDomain: boolean
  analytics: boolean
  prioritySupport: boolean
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    maxClients: 2,
    maxContractsPerClient: 1,
    maxGalleries: 2,
    maxQuestionnaires: 2,
    maxInvoices: 2,
    showFotonizerBadge: true,
    customBranding: false,
    teamSeats: 1,
    customDomain: false,
    analytics: false,
    prioritySupport: false,
  },
  starter: {
    maxClients: 10,
    maxContractsPerClient: 1,
    maxGalleries: 10,
    maxQuestionnaires: 10,
    maxInvoices: 10,
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    customDomain: false,
    analytics: false,
    prioritySupport: false,
  },
  pro: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    customDomain: false,
    analytics: true,
    prioritySupport: true,
  },
  studio: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 5,
    customDomain: true,
    analytics: true,
    prioritySupport: true,
  },
}

export const PLAN_DISPLAY = {
  free: { name: 'Free', price: 0, color: '#6B6B6B' },
  starter: { name: 'Starter', price: 11, color: '#C8A882' },
  pro: { name: 'Pro', price: 18, color: '#1A1A1A' },
  studio: { name: 'Studio', price: 39, color: '#0F0F0F' },
}

// What each plan unlocks (for upgrade modal copy)
export const PLAN_UNLOCK_COPY: Record<PlanKey, string[]> = {
  free: [],
  starter: [
    'Bis zu 10 aktive Kunden',
    'Bis zu 10 Verträge',
    'Bis zu 10 Galerien',
    '"Fotonizer" Logo ausblenden',
    'E-Mail-Vorlagen',
  ],
  pro: [
    'Unbegrenzte Kunden',
    'Alles unbegrenzt',
    '"Fotonizer" Logo ausblenden',
    'Analytics-Dashboard',
    'Prioritäts-Support',
  ],
  studio: [
    'Alles in Pro',
    'Bis zu 5 Fotografen-Accounts',
    'Custom Domain für Kunden-Portal',
    'Custom E-Mail-Domain',
  ],
}
