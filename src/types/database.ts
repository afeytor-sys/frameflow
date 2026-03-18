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
  // migration 016: bank details
  bank_account_holder: string | null
  bank_name: string | null
  bank_iban: string | null
  bank_bic: string | null
  // migration 025: storage usage
  storage_used_bytes: number
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
  // migration 020: address fields
  address_street: string | null
  address_city: string | null
  address_zip: string | null
  address_country: string | null
  created_at: string
}

export interface Project {
  id: string
  client_id: string | null
  photographer_id: string
  title: string
  shoot_date: string | null
  project_type: string | null
  shooting_type_sort: number | null
  status: string
  client_token: string
  client_url: string
  custom_slug: string | null
  // booking fields
  location: string | null
  notes: string | null
  shoot_time: string | null
  shoot_duration: string | null
  num_persons: number | null
  price: string | null
  meeting_point: string | null
  // extra booking fields
  custom_type_label: string | null
  custom_type_color: string | null
  custom_status_label: string | null
  custom_status_color: string | null
  // portal settings
  portal_sections: Record<string, boolean> | null
  portal_message: string | null
  portal_password: string | null
  portal_links: PortalLink[]
  project_steps_override: string[] | null
  portal_locale: string | null
  // internal notes
  internal_notes: string | null
  created_at: string
  // Joined
  client?: Client
}

export interface PortalLink {
  label: string
  url: string
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
  // migration 011: photographer signature
  photographer_signature_data: string | null
  photographer_signed_at: string | null
  // migration 021: client fields
  client_name: string | null
  client_email: string | null
  client_address: string | null
  created_at: string
}

export interface Gallery {
  id: string
  project_id: string
  photographer_id: string
  title: string
  description: string | null
  status: GalleryStatus
  // migration 035: gallery password
  password: string | null
  watermark: boolean
  download_enabled: boolean
  // migration 003
  comments_enabled: boolean
  design_theme: string
  // migration 004
  tags_enabled: string[]
  expires_at: string | null
  view_count: number
  download_count: number
  // migration 033: favorite list name
  favorite_list_name: string | null
  created_at: string
  // Joined
  photos?: Photo[]
}

export interface Photo {
  id: string
  gallery_id: string
  section_id: string | null
  photographer_id: string | null
  filename: string
  storage_url: string
  thumbnail_url: string | null
  file_size: number | null
  width: number | null
  height: number | null
  is_favorite: boolean
  display_order: number
  tag: string | null
  uploaded_at: string
}

export interface GallerySection {
  id: string
  gallery_id: string
  title: string
  display_order: number
  created_at: string
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
  photographer_id: string
  invoice_number: string | null
  amount: number
  currency: string
  status: InvoiceStatus
  description: string | null
  due_date: string | null
  // migration 023: notes
  notes: string | null
  stripe_invoice_id: string | null
  created_at: string
}

export interface QuestionnaireTemplate {
  id: string
  photographer_id: string
  name: string
  description: string | null
  questions: QuestionnaireQuestion[]
  created_at: string
  updated_at: string
}

export interface Questionnaire {
  id: string
  project_id: string
  photographer_id: string
  title: string
  questions: QuestionnaireQuestion[]
  answers: Record<string, string>
  status: 'draft' | 'sent' | 'submitted'
  sent_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface QuestionnaireQuestion {
  id: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number'
  label: string
  required: boolean
  options?: string[]
}

export interface EmailTemplate {
  id: string
  photographer_id: string
  name: string
  subject: string
  body: string
  category: 'invoice' | 'gallery' | 'questionnaire' | 'contract' | 'general'
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  photographer_id: string
  type: 'contract_signed' | 'questionnaire_filled' | 'gallery_viewed' | 'portal_opened' | 'contract_sent' | 'gallery_delivered' | 'photo_downloaded' | 'gallery_downloaded' | 'favorite_marked'
  title_de: string
  title_en: string
  body_de: string | null
  body_en: string | null
  project_id: string | null
  client_name: string | null
  read: boolean
  created_at: string
}

export interface AutomationSettings {
  id: string
  photographer_id: string
  // Email automations
  email_portal_created: boolean
  email_contract_sent: boolean
  email_gallery_delivered: boolean
  // Reminders
  reminder_7d: boolean
  reminder_1d: boolean
  // Notification preferences (migration 034)
  notify_inapp_contract_signed: boolean
  notify_email_contract_signed: boolean
  notify_inapp_gallery_viewed: boolean
  notify_email_gallery_viewed: boolean
  notify_inapp_questionnaire: boolean
  notify_email_questionnaire: boolean
  notify_inapp_photo_downloaded: boolean
  notify_email_photo_downloaded: boolean
  notify_inapp_gallery_downloaded: boolean
  notify_email_gallery_downloaded: boolean
  notify_inapp_favorite_marked: boolean
  notify_email_favorite_marked: boolean
  notify_email_shoot_reminder_photographer: boolean
  created_at: string
  updated_at: string
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
