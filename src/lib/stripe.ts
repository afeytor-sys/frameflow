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

// Trial duration for new subscribers
export const TRIAL_DAYS = 14

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
  onlineBookings: boolean
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
    onlineBookings: false,
  },
  starter: {
    maxClients: null,                  // unlimited — storage is the only differentiator
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    maxStorageBytes: 20 * GB,          // 20 GB — the key differentiator
    showFotonizerBadge: false,
    customBranding: true,
    teamSeats: 1,
    analytics: true,
    prioritySupport: false,
    clientPortal: true,
    invoices: true,
    contractTemplates: true,
    questionnaires: true,
    pipeline: true,
    emailAutomations: true,
    onlineBookings: true,
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
    onlineBookings: true,
  },
  studio: {
    maxClients: null,
    maxContractsPerClient: null,
    maxGalleries: null,
    maxQuestionnaires: null,
    maxInvoices: null,
    maxStorageBytes: 2 * TB,           // 2 TB
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
    onlineBookings: true,
  },
}

// ── Display prices (monthly, in €) ───────────────────────────────────────────
// Starter: €17/month · €163/year (~20% off)
// Pro:     €29.99/month · €288/year (~20% off)
// Studio:  €69/month · €690/year
export const PLAN_DISPLAY = {
  free:    { name: 'Free',    price: 0,     annualPrice: 0,   color: '#6B6B6B' },
  starter: { name: 'Starter', price: 17,    annualPrice: 163, color: '#C8A882' },
  pro:     { name: 'Pro',     price: 29.99, annualPrice: 288, color: '#1A1A1A' },
  studio:  { name: 'Studio',  price: 69,    annualPrice: 690, color: '#0F0F0F' },
}

// Storage labels per plan (used in pricing UI)
export const PLAN_STORAGE_LABEL: Record<PlanKey, string> = {
  free:    '5 GB',
  starter: '20 GB',
  pro:     '1 TB',
  studio:  '2 TB',
}

// What each plan includes — all paid plans get the full platform, only storage differs
export const PLAN_UNLOCK_COPY: Record<PlanKey, string[]> = {
  free: [
    '5 GB Galerie-Speicher',
    'Bis zu 2 Kunden & Projekte',
    'Basis-Funktionen',
  ],
  starter: [
    '20 GB Galerie-Speicher',
    'Alle Funktionen inklusive',
    'CRM & Pipeline',
    'Buchungen & Galerien',
    'Verträge, Rechnungen & Angebote',
    'E-Mail Automationen',
    'Analytics-Dashboard',
  ],
  pro: [
    '1 TB Galerie-Speicher',
    'Alle Funktionen inklusive',
    'CRM & Pipeline',
    'Buchungen & Galerien',
    'Verträge, Rechnungen & Angebote',
    'E-Mail Automationen',
    'Analytics-Dashboard',
    'Priority support',
  ],
  studio: [
    '2 TB Galerie-Speicher',
    'Alle Funktionen inklusive',
    'Bis zu 3 Fotografen-Accounts',
    'Team-Verwaltung',
    'Priority support',
  ],
}
