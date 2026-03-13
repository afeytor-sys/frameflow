export type Plan = 'free' | 'starter' | 'pro' | 'studio'
export type Language = 'de' | 'en'
export type ClientStatus = 'lead' | 'active' | 'delivered' | 'archived'
export type ProjectStatus = 'draft' | 'active' | 'delivered' | 'completed'
export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed'
export type GalleryStatus = 'draft' | 'active' | 'expired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type TimelinePhase = 'preparation' | 'shoot' | 'wrap' | 'other'

export interface Photographer {
  id: string
  email: string
  full_name: string | null
  studio_name: string | null
  photography_types: string[] | null
  logo_url: string | null
  plan: Plan
  stripe_customer_id: string | null
  stripe_sub_id: string | null
  language: Language
  onboarding_completed: boolean
  created_at: string
}

export interface Client {
  id: string
  photographer_id: string
  full_name: string
  email: string | null
  phone: string | null
  shoot_date: string | null
  location: string | null
  project_type: string | null
  notes: string | null
  status: ClientStatus
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  photographer_id: string
  title: string
  shoot_date: string | null
  project_type: string | null
  status: ProjectStatus
  client_token: string
  client_url: string
  created_at: string
  // Joined
  client?: Client
}

export interface Contract {
  id: string
  project_id: string
  title: string
  content: string | null
  status: ContractStatus
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  signed_by_name: string | null
  signature_data: string | null
  ip_address: string | null
  pdf_url: string | null
  created_at: string
}

export interface Gallery {
  id: string
  project_id: string
  title: string
  description: string | null
  status: GalleryStatus
  password: string | null
  watermark: boolean
  download_enabled: boolean
  expires_at: string | null
  view_count: number
  download_count: number
  created_at: string
  // Joined
  photos?: Photo[]
}

export interface Photo {
  id: string
  gallery_id: string
  filename: string
  storage_url: string
  thumbnail_url: string | null
  file_size: number | null
  width: number | null
  height: number | null
  is_favorite: boolean
  display_order: number
  uploaded_at: string
}

export interface TimelineEvent {
  id: string
  time: string
  title: string
  location: string | null
  duration_minutes: number | null
  phase: TimelinePhase
  notes: string | null
  photographer_note: string | null
}

export interface Timeline {
  id: string
  project_id: string
  events: TimelineEvent[]
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  project_id: string
  amount: number
  currency: string
  status: InvoiceStatus
  due_date: string | null
  stripe_invoice_id: string | null
  created_at: string
}

// Plan limits
export const PLAN_LIMITS = {
  free: {
    maxClients: 2,
    maxContractsPerClient: 1,
    watermark: true,
    customBranding: false,
    hidePoweredBy: false,
    teamMembers: 1,
    customDomain: false,
  },
  starter: {
    maxClients: 10,
    maxContractsPerClient: Infinity,
    watermark: false,
    customBranding: false,
    hidePoweredBy: false,
    teamMembers: 1,
    customDomain: false,
  },
  pro: {
    maxClients: Infinity,
    maxContractsPerClient: Infinity,
    watermark: false,
    customBranding: true,
    hidePoweredBy: true,
    teamMembers: 1,
    customDomain: false,
  },
  studio: {
    maxClients: Infinity,
    maxContractsPerClient: Infinity,
    watermark: false,
    customBranding: true,
    hidePoweredBy: true,
    teamMembers: 5,
    customDomain: true,
  },
} as const
