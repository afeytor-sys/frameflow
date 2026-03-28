import { createServiceClient } from '@/lib/supabase/service'

export interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'tel' | 'date' | 'select'
  required?: boolean
  placeholder?: string
  core?: boolean        // core fields (name, email) cannot be deleted
  options?: string[]
}

export interface PublicForm {
  id: string
  photographer_id: string
  name: string
  fields: FormField[]
  created_at: string
}

export interface SubmitFormPayload {
  formId: string
  photographerId: string
  name: string
  email: string
  message: string
}

/** Default fields used when a form has no custom fields configured */
export const DEFAULT_FIELDS: FormField[] = [
  {
    id: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    placeholder: 'Your full name',
    core: true,
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'your@email.com',
    core: true,
  },
  {
    id: 'message',
    label: 'Message',
    type: 'textarea',
    required: false,
    placeholder: 'Tell us about your project, date, location…',
  },
]

/**
 * Fetch a public form by its ID.
 * Returns null if not found.
 */
export async function getFormById(formId: string): Promise<PublicForm | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('forms')
    .select('id, photographer_id, name, fields, created_at')
    .eq('id', formId)
    .single()

  if (error || !data) return null

  return data as PublicForm
}

/**
 * Submit a form inquiry.
 * Atomically:
 *   1. Inserts a lead record
 *   2. Creates a conversation
 *   3. Inserts the first message (from lead)
 *
 * Uses service role client to bypass RLS (public form, no auth session).
 */
export async function submitFormInquiry(payload: SubmitFormPayload): Promise<{
  leadId: string
  conversationId: string
}> {
  const supabase = createServiceClient()
  const { formId, photographerId, name, email, message } = payload

  // 1. Insert lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      form_id: formId,
      photographer_id: photographerId,
      name,
      email,
      message,
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    throw new Error(`Failed to create lead: ${leadError?.message ?? 'unknown error'}`)
  }

  // 2. Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      photographer_id: photographerId,
      lead_email: email,
      lead_name: name,
    })
    .select('id')
    .single()

  if (convError || !conversation) {
    throw new Error(`Failed to create conversation: ${convError?.message ?? 'unknown error'}`)
  }

  // 3. Insert first message from lead
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender: 'lead',
      content: message,
    })

  if (msgError) {
    throw new Error(`Failed to create message: ${msgError.message}`)
  }

  return {
    leadId: lead.id,
    conversationId: conversation.id,
  }
}
