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
export const GB = 1_073_741_824        // 1 GB  = 1024^3 bytes
export const TB = 1_099_511_627_776    // 1 TB  = 1024^4 bytes

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
  // Feature gating flags
  clientPortal: boolean
  invoices: boolean
  contractTemplates: boolean          // contract templates with e-signature
  questionnaires: boolean
  pipeline: boolean
  emailAutomations: boolean
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    maxClients: 2,
    maxContractsPerClient: 2,
    maxGalleries: 2,
    maxQuestionnaires: 0,
    maxInvoices: 0,
    maxStorageBytes: 5 * GB,           // 5 GB
    showFotonizerBadge: true,
    customBranding: false,
    teamSeats: 1,
    analytics: false,
    prioritySupport: false,
    clientPortal: false,
    invoices: false,
    contractTemplates: false,
    questionnaires: false,
    pipeline: false,
    emailAutomations: false,
  },
  starter: {
    maxClients: 10,
    maxContractsPerClient: 10,
    maxGalleries: 10,
    maxQuestionnaires: 0,
    maxInvoices: null,                 // unlimited invoices
    maxStorageBytes: 150 * GB,         // 150 GB
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    analytics: false,
    prioritySupport: false,
    clientPortal: true,
    invoices: true,
    contractTemplates: true,
    questionnaires: false,
    pipeline: false,
    emailAutomations: false,
  },
  pro: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    maxStorageBytes: TB,               // 1 TB
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    analytics: true,
    prioritySupport: true,
    clientPortal: true,
    invoices: true,
    contractTemplates: true,
    questionnaires: true,
    pipeline: true,
    emailAutomations: true,
  },
  studio: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    maxStorageBytes: 3 * TB,           // 3 TB
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 3,
    analytics: true,
    prioritySupport: true,
    clientPortal: true,
    invoices: true,
    contractTemplates: true,
    questionnaires: true,
    pipeline: true,
    emailAutomations: true,
  },
}

// ── Display prices (monthly, in €) ───────────────────────────────────────────
// Starter: €17/month · €160/year
// Pro:     €24/month · €230/year
// Studio:  €69/month · €690/year
export const PLAN_DISPLAY = {
  free:    { name: 'Free',    price: 0,  annualPrice: 0,   color: '#6B6B6B' },
  starter: { name: 'Starter', price: 17, annualPrice: 160, color: '#C8A882' },
  pro:     { name: 'Pro',     price: 24, annualPrice: 230, color: '#1A1A1A' },
  studio:  { name: 'Studio',  price: 69, annualPrice: 690, color: '#0F0F0F' },
}

// What each plan unlocks (for upgrade modal copy)
export const PLAN_UNLOCK_COPY: Record<PlanKey, string[]> = {
  free: [
    'Bis zu 2 aktive Kunden',
    'Bis zu 2 Projekte & Galerien',
    '5 GB Speicherplatz',
  ],
  starter: [
    'Bis zu 10 aktive Kunden',
    'Bis zu 10 Verträge',
    'Bis zu 10 Projekte & Galerien',
    '150 GB Speicherplatz',
    'Vertrags-Vorlagen mit E-Signatur',
    'Kunden-Portal',
    'Rechnungen',
    '"Fotonizer" Badge ausblenden',
  ],
  pro: [
    'Unbegrenzte Kunden',
    'Unbegrenzte Projekte & Galerien',
    'Unbegrenzte Verträge',
    '1 TB Speicherplatz',
    'Vertrags-Vorlagen mit E-Signatur',
    'Kunden-Portal',
    'Rechnungen',
    'Fragebögen',
    'Pipeline (CRM)',
    'E-Mail Automationen',
    '"Fotonizer" Logo ausblenden',
    'Analytics-Dashboard',
    'Priority support',
  ],
  studio: [
    'Alles in Pro',
    'Bis zu 3 Fotografen-Accounts',
    '3 TB Speicherplatz',
    '"Fotonizer" Logo ausblenden',
    'Analytics-Dashboard',
    'E-Mail Automationen',
    'Fragebögen',
    'Pipeline (CRM)',
    'Priority support',
  ],
}
