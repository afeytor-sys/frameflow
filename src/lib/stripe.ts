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

// Storage constants (in bytes)
export const GB = 1_073_741_824   // 1 GB in bytes
export const TB = 1_099_511_627_776 // 1 TB in bytes

export interface PlanLimits {
  maxClients: number | null           // null = unlimited
  maxContractsPerClient: number | null
  maxGalleries: number | null         // null = unlimited
  maxQuestionnaires: number | null    // null = unlimited
  maxInvoices: number | null          // null = unlimited
  maxStorageBytes: number | null      // null = unlimited
  showFotonizerBadge: boolean         // show "Powered by Fotonizer" in client portal
  customBranding: boolean             // hide "Powered by Fotonizer"
  teamSeats: number | null            // null = unlimited
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
    maxStorageBytes: 5 * GB,          // 5 GB
    showFotonizerBadge: true,
    customBranding: false,
    teamSeats: 1,
    analytics: false,
    prioritySupport: false,
  },
  starter: {
    maxClients: 10,
    maxContractsPerClient: 1,
    maxGalleries: 10,
    maxQuestionnaires: 10,
    maxInvoices: 10,
    maxStorageBytes: 15 * GB,         // 15 GB
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    analytics: false,
    prioritySupport: false,
  },
  pro: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    maxStorageBytes: TB,              // 1 TB
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    analytics: true,
    prioritySupport: true,
  },
  studio: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    maxStorageBytes: null,            // Unlimited
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: null,                  // Unlimited
    analytics: true,
    prioritySupport: true,
  },
}

export const PLAN_DISPLAY = {
  free: { name: 'Free', price: 0, color: '#6B6B6B' },
  starter: { name: 'Starter', price: 10, color: '#C8A882' },
  pro: { name: 'Pro', price: 16, color: '#1A1A1A' },
  studio: { name: 'Studio', price: 31, color: '#0F0F0F' },
}

// What each plan unlocks (for upgrade modal copy)
export const PLAN_UNLOCK_COPY: Record<PlanKey, string[]> = {
  free: [
    'Bis zu 2 aktive Kunden',
    'Bis zu 2 Projekte & Galerien',
    '5 GB Speicherplatz',
    'Kunden-Portal',
  ],
  starter: [
    'Bis zu 10 aktive Kunden',
    'Bis zu 10 Projekte & Galerien',
    '15 GB Speicherplatz',
    '"Fotonizer" Badge ausblenden',
    'E-Mail-Vorlagen',
  ],
  pro: [
    'Unbegrenzte Kunden & Projekte',
    'Alles unbegrenzt',
    '1 TB Speicherplatz',
    '"Fotonizer" Logo ausblenden',
    'Analytics-Dashboard',
    'Prioritäts-Support',
  ],
  studio: [
    'Alles in Pro',
    'Bis zu 2 Fotografen-Accounts',
    'Unbegrenzter Speicherplatz',
    '"Fotonizer" Logo ausblenden',
    'Analytics-Dashboard',
    'Prioritäts-Support',
  ],
}
