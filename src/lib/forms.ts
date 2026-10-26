import { createServiceClient } from '@/lib/supabase/service'

export interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'hidden'
  required?: boolean
  placeholder?: string
  core?: boolean        // core fields (name, email) cannot be deleted
  options?: string[]
  /** For type 'hidden': the URL query parameter this field's value is read from (e.g. "quelle", "utm_source"). */
  queryParam?: string
}

export interface PublicForm {
  id: string
  photographer_id: string
  name: string
  fields: FormField[]
  created_at: string
  /** Optional URL to redirect the visitor's browser to after a successful submit. */
  redirect_url: string | null
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
    .select('id, photographer_id, name, fields, created_at, redirect_url')
    .eq('id', formId)
    .single()

  if (error || !data) return null

  return data as PublicForm
}

const MAX_REDIRECT_URL_LENGTH = 2000
const MAX_HIDDEN_FIELD_VALUE_LENGTH = 100

/**
 * A redirect URL must be an absolute https:// URL, no longer than 2000
 * characters. This also rejects javascript:/data: URLs, since those never
 * have the "https" protocol.
 */
export function isValidRedirectUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_REDIRECT_URL_LENGTH) {
    return false
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === 'https:'
}

/** Plain text only: HTML tags, stray angle brackets, newlines and control characters stripped, capped at 100 characters. */
export function sanitizeHiddenFieldValue(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>]/g, '') // neutralize any stray/incomplete angle brackets
    .replace(/[\r\n\t\x00-\x1F\x7F]+/g, ' ')
    .trim()
    .slice(0, MAX_HIDDEN_FIELD_VALUE_LENGTH)
}

interface QueryParamSource {
  get(key: string): string | null
}

/**
 * Resolves the values for every 'hidden' field from URL query parameters.
 * A hidden field reads from its own `queryParam` (falling back to its `id`),
 * so this also covers the standard utm_source/utm_medium/utm_campaign/gclid
 * params whenever a form has a hidden field configured for them.
 */
export function resolveHiddenFieldValues(
  fields: FormField[],
  searchParams: QueryParamSource
): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const field of fields) {
    if (field.type !== 'hidden') continue
    const paramName = field.queryParam || field.id
    const raw = searchParams.get(paramName)
    if (!raw) continue
    const value = sanitizeHiddenFieldValue(raw)
    if (value) resolved[field.id] = value
  }
  return resolved
}

/**
 * Decides what should happen right after a successful submit: redirect to
 * the form's configured URL, or fall back to the default confirmation
 * message (null) when no URL is set or it fails validation.
 */
export function getPostSubmitRedirect(redirectUrl: string | null | undefined): string | null {
  return isValidRedirectUrl(redirectUrl) ? (redirectUrl as string) : null
}

/**
 * Resolves the visitor's name/email from submitted field values. Looks up
 * the canonical 'name'/'email' field id first; falls back to the field
 * marked `core` (for name) or typed 'email' (for email) so a submission
 * still captures the right value even if a form's core fields ever end up
 * with a non-canonical id (e.g. from a buggy duplicate).
 */
export function resolveCoreFieldValue(
  fields: FormField[],
  values: Record<string, string>,
  which: 'name' | 'email'
): string {
  const direct = values[which]?.trim()
  if (direct) return direct

  const fallbackField = fields.find(f =>
    which === 'email' ? f.type === 'email' : f.core === true && f.type !== 'email'
  )
  return fallbackField ? (values[fallbackField.id]?.trim() ?? '') : ''
}

/**
 * Builds the flattened inquiry message from all non-core field values,
 * matching the "Label: value" convention already used by email
 * notifications and the inbox view. The dedicated 'message' field (if any)
 * is placed first.
 */
export function buildSubmissionMessage(
  fields: FormField[],
  values: Record<string, string>,
  multiValues: Record<string, string[]>
): string {
  const messageParts: string[] = []
  for (const field of fields) {
    if (field.id === 'name' || field.id === 'email' || field.core) continue
    if (field.type === 'checkbox') {
      const selected = multiValues[field.id] ?? []
      if (selected.length) messageParts.push(`${field.label}: ${selected.join(', ')}`)
    } else {
      const val = values[field.id]?.trim()
      if (val) {
        if (field.id === 'message') {
          messageParts.unshift(val) // message goes first
        } else {
          messageParts.push(`${field.label}: ${val}`)
        }
      }
    }
  }
  return messageParts.join('\n')
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
